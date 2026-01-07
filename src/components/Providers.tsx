"use client";

import { ReactNode } from "react";
import { ToastProvider } from "./Toast";
import { MobileNav } from "./MobileNav";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <MobileNav />
    </ToastProvider>
  );
}
