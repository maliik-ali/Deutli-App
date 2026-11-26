"use client";

import { createContext, useContext } from "react";

export type BrandView = { name: string | null; logoUrl: string | null; showPoweredBy: boolean; trialDraftKey?: string | null } | null;

const BrandContext = createContext<BrandView>(null);
export const useBrand = () => useContext(BrandContext);

/** Puts a workspace's colours and font on everything inside (CSS variables) and tells the logo what to show. */
export function BrandShell({ brand, vars, className, children }: { brand: BrandView; vars: Record<string, string>; className?: string; children: React.ReactNode }) {
  return (
    <BrandContext.Provider value={brand}>
      <div style={vars as React.CSSProperties} className={className}>
        {children}
      </div>
    </BrandContext.Provider>
  );
}

/** Centred line at the very bottom of a page. Shown only when the workspace's plan keeps the Deutli credit. */
export function PoweredByFooter() {
  const brand = useBrand();
  if (!brand?.showPoweredBy) return null;
  return <footer className="mt-auto px-4 py-6 text-center text-[12px] text-subtle-foreground">Powered by Deutli</footer>;
}
