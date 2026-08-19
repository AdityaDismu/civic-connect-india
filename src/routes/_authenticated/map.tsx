import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CivicMap, type Hotspot } from "@/components/civic/CivicMap";
import { ACTIVE_STATUSES, type Severity, type Status } from "@/lib/civic";
import { computePriority } from "@/lib/priority";

export const Route = createFileRoute("/_authenticated/map")({
  head: () => ({
    meta: [
      { title: "Live civic map — CivicPulse AI" },
      {
        name: "description",
        content: "Map of live civic reports and recurring civic hotspots across the city.",
      },
      { property: "og:title", content: "Live civic map — CivicPulse AI" },
      {
        property: "og:description",
        content: "Every open civic report plotted with hotspot clustering.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["map-complaints"],
    queryFn: async () => {
      const { data, error } = await supabase.from("complaints").select("*").limit(500);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const rows = query.data ?? [];
  useEffect(() => {
    const channel = supabase
      .channel("map-complaint-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "complaints" },
        () => void queryClient.invalidateQueries({ queryKey: ["map-complaints"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
  const points = rows.map((row) => ({
    id: row.id,
    lat: row.latitude,
    lng: row.longitude,
    status: row.status as Status,
    severity: row.severity as Severity,
    title: row.title,
    displayId: row.display_id,
    priority: computePriority({
      severity: row.severity as Severity,
      category: row.category,
      address: row.address,
      description: row.description,
      supportCount: row.support_count,
      createdAt: row.created_at,
    }).score,
  }));

  // Civic hotspots: grid buckets (~500m) holding 3+ open reports.
  const buckets = new Map<string, { lat: number; lng: number; count: number; label: string }>();
  for (const row of rows) {
    if (!ACTIVE_STATUSES.includes(row.status as Status)) continue;
    const key = `${row.latitude.toFixed(2)}:${row.longitude.toFixed(2)}`;
    const existing = buckets.get(key);
    if (existing) existing.count += 1;
    else
      buckets.set(key, {
        lat: row.latitude,
        lng: row.longitude,
        count: 1,
        label: row.address || "this area",
      });
  }
  const hotspots: Hotspot[] = [...buckets.values()].filter((b) => b.count >= 3);

  const center: [number, number] = points[0] ? [points[0].lat, points[0].lng] : [19.076, 72.8777];

  return (
    <div className="page-shell max-w-7xl">
      <p className="page-kicker">Open city index</p>
      <h1 className="page-title">Live civic map</h1>
      <p className="page-subtitle">
        {points.length} reports plotted · {hotspots.length} civic hotspots (3+ open reports in one
        area).
      </p>
      <div className="civic-panel mt-6 p-2">
        <CivicMap
          center={center}
          zoom={13}
          points={points}
          hotspots={hotspots}
          onSelect={(id) => void navigate({ to: "/complaint/$id", params: { id } })}
          className="h-[540px] w-full border"
        />
      </div>
    </div>
  );
}
