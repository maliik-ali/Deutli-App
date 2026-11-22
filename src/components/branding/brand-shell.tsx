"use client";

import { createContext, useContext } from "react";

export type BrandView = { name: string | null; logoUrl: string | null; showPoweredBy: boolean } | null;

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

export function PoweredBy() {
  const brand = useBrand();
  if (!brand?.showPoweredBy) return null;
  return <p className="px-2 pt-2 text-[12px] text-subtle-foreground">Powered by Deutli</p>;
}
