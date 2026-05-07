"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { getSectorMeta, type SectorMeta } from "@/lib/sector-meta";

interface UserSectorRow {
  sector_id: string;
  is_primary: number;
}

interface SwitcherProps {
  activeSectorId: string;
  userSectors: UserSectorRow[];
}

export default function SectorSwitcher({
  activeSectorId,
  userSectors,
}: SwitcherProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const active = getSectorMeta(activeSectorId);

  async function switchTo(sectorId: string) {
    if (sectorId === activeSectorId || busy) return;
    setBusy(sectorId);
    try {
      const res = await fetch("/api/sectors/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectorId }),
      });
      if (res.ok) {
        // Reload pour que toutes les data-fetch côté server reprennent le nouveau secteur
        window.location.reload();
      } else {
        setBusy(null);
      }
    } catch {
      setBusy(null);
    }
  }

  // Si le user n'a qu'un seul secteur, on affiche juste un badge non-cliquable
  const hasMultiple = userSectors.length > 1;

  if (!hasMultiple) {
    return (
      <div
        className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
        style={{
          backgroundColor: active.surface,
          color: active.primaryDark,
        }}
        title={active.longLabel}
      >
        <span>{active.emoji}</span>
        <span>{active.shortLabel}</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors hover:opacity-90"
        style={{
          backgroundColor: active.surface,
          color: active.primaryDark,
        }}
        title={`Secteur actif : ${active.longLabel}. Cliquer pour changer.`}
      >
        <span>{active.emoji}</span>
        <span>{active.shortLabel}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Vos secteurs
            </p>
          </div>
          {userSectors.map((row) => {
            const meta: SectorMeta = getSectorMeta(row.sector_id);
            const isActive = row.sector_id === activeSectorId;
            const loading = busy === row.sector_id;
            return (
              <button
                key={row.sector_id}
                onClick={() => switchTo(row.sector_id)}
                disabled={loading || isActive}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left ${
                  isActive ? "bg-gray-50" : "hover:bg-gray-50"
                } ${loading ? "opacity-60" : ""}`}
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
                  style={{
                    backgroundColor: meta.surface,
                    color: meta.primary,
                  }}
                >
                  {meta.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{meta.shortLabel}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {meta.longLabel}
                  </p>
                </div>
                {isActive && (
                  <Check className="w-4 h-4 text-gray-700 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
