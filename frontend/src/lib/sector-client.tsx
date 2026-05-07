"use client";

/**
 * Context React pour exposer la config du secteur actif aux pages dashboard
 * (client components). La config est chargée côté server par le layout, puis
 * passée en prop au DashboardShell qui hydrate ce provider.
 *
 * Usage dans une page client :
 *   const { config, sectorId, sectorMeta } = useSector();
 *   <h1>{config.brand.name}</h1>
 */

import { createContext, useContext, type ReactNode } from "react";
import type { SectorConfig } from "@/config";
import { getSectorMeta, type SectorMeta } from "./sector-meta";

interface SectorContextValue {
  sectorId: string;
  config: SectorConfig;
  meta: SectorMeta;
}

const SectorContext = createContext<SectorContextValue | null>(null);

export function SectorProvider({
  sectorId,
  config,
  children,
}: {
  sectorId: string;
  config: SectorConfig;
  children: ReactNode;
}) {
  const value: SectorContextValue = {
    sectorId,
    config,
    meta: getSectorMeta(sectorId),
  };
  return (
    <SectorContext.Provider value={value}>{children}</SectorContext.Provider>
  );
}

export function useSector(): SectorContextValue {
  const ctx = useContext(SectorContext);
  if (!ctx) {
    throw new Error(
      "useSector() doit être utilisé à l'intérieur d'un <SectorProvider>"
    );
  }
  return ctx;
}
