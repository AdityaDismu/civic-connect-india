import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type { Hotspot, MapPoint } from "./MapCanvas";

const MapCanvas = lazy(() => import("./MapCanvas"));

export type { Hotspot, MapPoint };

type Props = {
  center: [number, number];
  zoom?: number;
  points?: MapPoint[];
  hotspots?: Hotspot[];
  picked?: { lat: number; lng: number } | null;
  onPick?: (lat: number, lng: number) => void;
  onSelect?: (id: string) => void;
  className?: string;
  recenter?: boolean;
};

export function CivicMap(props: Props) {
  const fallback = (
    <div className={props.className ?? "h-[420px] w-full rounded-lg border"}>
      <div className="h-full w-full animate-pulse rounded-lg bg-muted" />
    </div>
  );
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <MapCanvas {...props} />
      </Suspense>
    </ClientOnly>
  );
}
