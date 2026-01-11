/**
 * Grading Company Certification Lookup Service
 *
 * Fetches comic book data from CGC, CBCS, and PGX verification pages
 * using their certification numbers.
 */

export interface CertLookupResult {
  success: boolean;
  source: "cgc" | "cbcs" | "pgx";
  certNumber: string;
  data?: {
    title: string | null;
    issueNumber: string | null;
    publisher: string | null;
    releaseYear: string | null;
    grade: string | null;
    gradeLabel: string | null;
    labelType: string | null; // e.g., "Universal", "Signature Series"
    variant: string | null;
    pageQuality: string | null;
    keyComments: string | null;
    artComments: string | null;
  };
  error?: string;
}

// ============================================
// CGC Lookup
// ============================================

/**
 * Look up a comic by CGC certification number
 * URL format: https://www.cgccomics.com/certlookup/{certNumber}/
 */
export async function lookupCGCCert(certNumber: string): Promise<CertLookupResult> {
  const cleanCert = certNumber.replace(/\D/g, ""); // Remove non-digits

  if (!cleanCert || cleanCert.length < 6) {
    return {
      success: false,
      source: "cgc",
      certNumber,
      error: "Invalid CGC certification number",
    };
  }

  try {
    console.log(`[cert-lookup] Looking up CGC cert: ${cleanCert}`);

    const response = await fetch(`https://www.cgccomics.com/certlookup/${cleanCert}/`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CollectorsChest/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      console.log(`[cert-lookup] CGC lookup failed: ${response.status}`);
      return {
        success: false,
        source: "cgc",
        certNumber: cleanCert,
        error: `CGC lookup failed: ${response.status}`,
      };
    }

    const html = await response.text();
    return parseCGCResponse(html, cleanCert);
  } catch (error) {
    console.error("[cert-lookup] CGC lookup error:", error);
    return {
      success: false,
      source: "cgc",
      certNumber: cleanCert,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Parse CGC verification page HTML
 */
function parseCGCResponse(html: string, certNumber: string): CertLookupResult {
  try {
    // Check if cert was found
    if (html.includes("not found") || html.includes("No results") || html.includes("invalid")) {
      return {
        success: false,
        source: "cgc",
        certNumber,
        error: "Certification number not found",
      };
    }

    // Extract data using regex patterns
    // CGC pages typically have structured data we can parse

    // Title and issue pattern - usually in a header or title element
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
      html.match(/class="[^"]*title[^"]*"[^>]*>([^<]+)/i) ||
      html.match(/"comicTitle"[^>]*>([^<]+)/i);

    // Grade pattern
    const gradeMatch = html.match(/(?:grade|Grade)[:\s]*(\d+\.?\d*)/i) ||
      html.match(/<[^>]*class="[^"]*grade[^"]*"[^>]*>(\d+\.?\d*)/i);

    // Publisher pattern
    const publisherMatch = html.match(/(?:publisher|Publisher)[:\s]*([^<\n]+)/i);

    // Year pattern
    const yearMatch = html.match(/(?:year|Year|date|Date)[:\s]*(\d{4})/i) ||
      html.match(/\((\d{4})\)/);

    // Label type (Universal, Signature Series, etc.)
    const labelMatch = html.match(/(?:label|Label)[^:]*[:\s]*([^<\n]+)/i) ||
      html.match(/Signature Series/i);

    // Page quality
    const pageMatch = html.match(/(?:page|Page)[^:]*(?:quality|Quality)?[:\s]*([^<\n]+)/i);

    // Parse title to extract series name and issue number
    let title: string | null = null;
    let issueNumber: string | null = null;

    if (titleMatch) {
      const fullTitle = titleMatch[1].trim();
      // Try to split "Amazing Spider-Man #300" format
      const issueMatch = fullTitle.match(/^(.+?)\s*#(\d+[A-Za-z]?)$/);
      if (issueMatch) {
        title = issueMatch[1].trim();
        issueNumber = issueMatch[2];
      } else {
        title = fullTitle;
      }
    }

    // Check if we got any useful data
    if (!title && !gradeMatch) {
      return {
        success: false,
        source: "cgc",
        certNumber,
        error: "Could not parse certification data",
      };
    }

    return {
      success: true,
      source: "cgc",
      certNumber,
      data: {
        title,
        issueNumber,
        publisher: publisherMatch ? publisherMatch[1].trim() : null,
        releaseYear: yearMatch ? yearMatch[1] : null,
        grade: gradeMatch ? gradeMatch[1] : null,
        gradeLabel: null,
        labelType: labelMatch ? (typeof labelMatch === "string" ? "Signature Series" : labelMatch[1]?.trim()) : null,
        variant: null,
        pageQuality: pageMatch ? pageMatch[1].trim() : null,
        keyComments: null,
        artComments: null,
      },
    };
  } catch (error) {
    console.error("[cert-lookup] Error parsing CGC response:", error);
    return {
      success: false,
      source: "cgc",
      certNumber,
      error: "Failed to parse CGC response",
    };
  }
}

// ============================================
// CBCS Lookup
// ============================================

/**
 * Look up a comic by CBCS certification number
 * URL format: https://www.cbcscomics.com/cbcs-verify?cert={certNumber}
 */
export async function lookupCBCSCert(certNumber: string): Promise<CertLookupResult> {
  const cleanCert = certNumber.replace(/\D/g, "");

  if (!cleanCert || cleanCert.length < 6) {
    return {
      success: false,
      source: "cbcs",
      certNumber,
      error: "Invalid CBCS certification number",
    };
  }

  try {
    console.log(`[cert-lookup] Looking up CBCS cert: ${cleanCert}`);

    const response = await fetch(`https://www.cbcscomics.com/cbcs-verify?cert=${cleanCert}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CollectorsChest/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      console.log(`[cert-lookup] CBCS lookup failed: ${response.status}`);
      return {
        success: false,
        source: "cbcs",
        certNumber: cleanCert,
        error: `CBCS lookup failed: ${response.status}`,
      };
    }

    const html = await response.text();
    return parseCBCSResponse(html, cleanCert);
  } catch (error) {
    console.error("[cert-lookup] CBCS lookup error:", error);
    return {
      success: false,
      source: "cbcs",
      certNumber: cleanCert,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Parse CBCS verification page HTML
 */
function parseCBCSResponse(html: string, certNumber: string): CertLookupResult {
  try {
    // Check if cert was found
    if (html.includes("not found") || html.includes("No results") || html.includes("invalid") || html.includes("no record")) {
      return {
        success: false,
        source: "cbcs",
        certNumber,
        error: "Certification number not found",
      };
    }

    // CBCS often has data in table rows or specific divs
    const titleMatch = html.match(/(?:title|Title)[:\s]*([^<\n]+)/i) ||
      html.match(/<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+#\d+)/i);

    const gradeMatch = html.match(/(?:grade|Grade)[:\s]*(\d+\.?\d*)/i);

    const publisherMatch = html.match(/(?:publisher|Publisher)[:\s]*([^<\n]+)/i);

    const yearMatch = html.match(/(?:year|Year)[:\s]*(\d{4})/i) ||
      html.match(/\((\d{4})\)/);

    // Parse title
    let title: string | null = null;
    let issueNumber: string | null = null;

    if (titleMatch) {
      const fullTitle = (titleMatch[2] || titleMatch[1]).trim();
      const issueMatch = fullTitle.match(/^(.+?)\s*#(\d+[A-Za-z]?)$/);
      if (issueMatch) {
        title = issueMatch[1].trim();
        issueNumber = issueMatch[2];
      } else {
        title = fullTitle;
      }
    }

    if (!title && !gradeMatch) {
      return {
        success: false,
        source: "cbcs",
        certNumber,
        error: "Could not parse certification data",
      };
    }

    return {
      success: true,
      source: "cbcs",
      certNumber,
      data: {
        title,
        issueNumber,
        publisher: publisherMatch ? publisherMatch[1].trim() : null,
        releaseYear: yearMatch ? yearMatch[1] : null,
        grade: gradeMatch ? gradeMatch[1] : null,
        gradeLabel: null,
        labelType: null,
        variant: null,
        pageQuality: null,
        keyComments: null,
        artComments: null,
      },
    };
  } catch (error) {
    console.error("[cert-lookup] Error parsing CBCS response:", error);
    return {
      success: false,
      source: "cbcs",
      certNumber,
      error: "Failed to parse CBCS response",
    };
  }
}

// ============================================
// PGX Lookup
// ============================================

/**
 * Look up a comic by PGX certification number
 * URL format: https://www.pgxcomics.com/cert/verify/{certNumber}
 */
export async function lookupPGXCert(certNumber: string): Promise<CertLookupResult> {
  const cleanCert = certNumber.replace(/\D/g, "");

  if (!cleanCert || cleanCert.length < 5) {
    return {
      success: false,
      source: "pgx",
      certNumber,
      error: "Invalid PGX certification number",
    };
  }

  try {
    console.log(`[cert-lookup] Looking up PGX cert: ${cleanCert}`);

    const response = await fetch(`https://www.pgxcomics.com/cert/verify/${cleanCert}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CollectorsChest/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      console.log(`[cert-lookup] PGX lookup failed: ${response.status}`);
      return {
        success: false,
        source: "pgx",
        certNumber: cleanCert,
        error: `PGX lookup failed: ${response.status}`,
      };
    }

    const html = await response.text();
    return parsePGXResponse(html, cleanCert);
  } catch (error) {
    console.error("[cert-lookup] PGX lookup error:", error);
    return {
      success: false,
      source: "pgx",
      certNumber: cleanCert,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Parse PGX verification page HTML
 */
function parsePGXResponse(html: string, certNumber: string): CertLookupResult {
  try {
    if (html.includes("not found") || html.includes("No results") || html.includes("invalid")) {
      return {
        success: false,
        source: "pgx",
        certNumber,
        error: "Certification number not found",
      };
    }

    const titleMatch = html.match(/(?:title|Title)[:\s]*([^<\n]+)/i);
    const gradeMatch = html.match(/(?:grade|Grade)[:\s]*(\d+\.?\d*)/i);
    const yearMatch = html.match(/\((\d{4})\)/);

    let title: string | null = null;
    let issueNumber: string | null = null;

    if (titleMatch) {
      const fullTitle = titleMatch[1].trim();
      const issueMatch = fullTitle.match(/^(.+?)\s*#(\d+[A-Za-z]?)$/);
      if (issueMatch) {
        title = issueMatch[1].trim();
        issueNumber = issueMatch[2];
      } else {
        title = fullTitle;
      }
    }

    if (!title && !gradeMatch) {
      return {
        success: false,
        source: "pgx",
        certNumber,
        error: "Could not parse certification data",
      };
    }

    return {
      success: true,
      source: "pgx",
      certNumber,
      data: {
        title,
        issueNumber,
        publisher: null,
        releaseYear: yearMatch ? yearMatch[1] : null,
        grade: gradeMatch ? gradeMatch[1] : null,
        gradeLabel: null,
        labelType: null,
        variant: null,
        pageQuality: null,
        keyComments: null,
        artComments: null,
      },
    };
  } catch (error) {
    console.error("[cert-lookup] Error parsing PGX response:", error);
    return {
      success: false,
      source: "pgx",
      certNumber,
      error: "Failed to parse PGX response",
    };
  }
}

// ============================================
// Main Router Function
// ============================================

/**
 * Look up certification from the appropriate grading company
 */
export async function lookupCertification(
  gradingCompany: "CGC" | "CBCS" | "PGX" | string,
  certNumber: string
): Promise<CertLookupResult> {
  const company = gradingCompany.toUpperCase();

  switch (company) {
    case "CGC":
      return lookupCGCCert(certNumber);
    case "CBCS":
      return lookupCBCSCert(certNumber);
    case "PGX":
      return lookupPGXCert(certNumber);
    default:
      return {
        success: false,
        source: "cgc",
        certNumber,
        error: `Unsupported grading company: ${gradingCompany}`,
      };
  }
}

/**
 * Try to detect which grading company based on cert number format
 */
export function detectGradingCompany(certNumber: string): "CGC" | "CBCS" | "PGX" | null {
  const clean = certNumber.replace(/\D/g, "");

  // CGC cert numbers are typically 10 digits
  if (clean.length === 10) {
    return "CGC";
  }

  // CBCS cert numbers vary but often start with certain patterns
  if (clean.length >= 7 && clean.length <= 9) {
    return "CBCS";
  }

  // PGX cert numbers are typically shorter
  if (clean.length >= 5 && clean.length <= 7) {
    return "PGX";
  }

  return null;
}
