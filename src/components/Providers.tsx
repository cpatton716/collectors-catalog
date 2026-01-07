"use client";

import { ReactNode } from "react";
import { ToastProvider } from "./Toast";
import { MobileNav } from "./MobileNav";
import { AuthDataSync } from "./AuthDataSync";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <MobileNav />
      <AuthDataSync />
    </ToastProvider>
  );
}
