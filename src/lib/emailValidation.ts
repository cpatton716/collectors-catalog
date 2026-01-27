/**
 * Email validation utilities for bonus scan claims
 * Includes format validation, MX record checking, and disposable email detection
 */
import dns from "dns";
import { promisify } from "util";

const resolveMx = promisify(dns.resolveMx);

// Common disposable email domains to block
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "throwaway.email",
  "10minutemail.com",
  "temp-mail.org",
  "fakeinbox.com",
  "trashmail.com",
  "maildrop.cc",
  "dispostable.com",
  "yopmail.com",
  "getnada.com",
  "tempail.com",
  "mohmal.com",
  "emailondeck.com",
]);

export interface EmailValidationResult {
  valid: boolean;
  error?: string;
  normalized?: string;
}

/**
 * Validate email format using regex
 */
function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if email domain is a known disposable email provider
 */
function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

/**
 * Check if email domain has valid MX records
 * Returns true if MX records exist, false otherwise
 */
async function hasMxRecords(email: string): Promise<boolean> {
  const domain = email.split("@")[1];
  if (!domain) return false;

  try {
    const records = await resolveMx(domain);
    return records && records.length > 0;
  } catch {
    // DNS lookup failed - domain likely doesn't exist or has no mail server
    return false;
  }
}

/**
 * Comprehensive email validation
 * - Format check
 * - Disposable email check
 * - MX record validation
 */
export async function validateEmail(email: string): Promise<EmailValidationResult> {
  // Normalize
  const normalized = email.toLowerCase().trim();

  // Format check
  if (!isValidEmailFormat(normalized)) {
    return {
      valid: false,
      error: "Invalid email format",
    };
  }

  // Disposable email check
  if (isDisposableEmail(normalized)) {
    return {
      valid: false,
      error: "Please use a permanent email address, not a disposable one",
    };
  }

  // MX record check (skip in development/test for speed)
  if (process.env.NODE_ENV === "production") {
    const hasMx = await hasMxRecords(normalized);
    if (!hasMx) {
      return {
        valid: false,
        error: "This email domain doesn't appear to accept mail",
      };
    }
  }

  return {
    valid: true,
    normalized,
  };
}

/**
 * Generate a secure verification token
 */
export function generateVerificationToken(): string {
  // Generate 32 random bytes, convert to URL-safe base64
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
