"use client";

import { ReactNode } from "react";

import { AuthDataSync } from "./AuthDataSync";
import { MobileNav } from "./MobileNav";
import { ToastProvider } from "./Toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <MobileNav />
      <AuthDataSync />
    </ToastProvider>
  );
}
