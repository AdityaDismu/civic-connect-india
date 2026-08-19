import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StatusBadge, SeverityBadge, PriorityPill } from "@/components/civic/badges";
import { StoredImage } from "@/components/civic/StoredImage";
import { formatDate, type Severity, type Status } from "@/lib/civic";
import { computePriority } from "@/lib/priority";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My Reports — CivicPulse AI" },
      { name: "description", content: "Track every civic issue you reported and its live status." },
      { property: "og:title", content: "My Reports — CivicPulse AI" },
      {
        property: "og:description",
        content: "Track your civic reports from submission to verified resolution.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, fullName } = useAuth();

  const reports = useQuery({
    queryKey: ["my-reports", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select("*, complaint_images(image_url, kind)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const rows = reports.data ?? [];
  const resolved = rows.filter((r) => r.status === "RESOLVED").length;
  const awaiting = rows.filter((r) => r.status === "CITIZEN_VERIFICATION").length;

  return (
    <div className="page-shell">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="page-kicker">Resident workspace</p>
          <h1 className="page-title">
            {fullName ? `Hello, ${fullName.split(" ")[0]}` : "My reports"}
          </h1>
          <p className="page-subtitle">Every report you file, with its live municipal status.</p>
        </div>
        <Button asChild>
          <Link to="/report">Report an issue</Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total reports", value: rows.length },
          { label: "Resolved", value: resolved },
          { label: "Awaiting your verification", value: awaiting },
        ].map((stat) => (
          <div key={stat.label} className="civic-panel">
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              {stat.label}
            </p>
            <p className="mt-2 font-display text-4xl font-bold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        {reports.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        {!reports.isLoading && rows.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <p className="font-medium">No reports yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Photograph a civic issue and CivicPulse will classify and route it.
            </p>
            <Button asChild className="mt-4">
              <Link to="/report">File your first report</Link>
            </Button>
          </div>
        ) : null}

        {rows.map((row) => {
          const priority = computePriority({
            severity: row.severity as Severity,
            category: row.category,
            address: row.address,
            description: row.description,
            supportCount: row.support_count,
            createdAt: row.created_at,
          });
          const image = row.complaint_images?.find((i) => i.kind === "BEFORE")?.image_url;
          return (
            <Link
              key={row.id}
              to="/complaint/$id"
              params={{ id: row.id }}
              className="flex gap-4 border border-border bg-card p-4 transition-colors hover:bg-secondary"
            >
              <StoredImage path={image} alt={row.title} className="h-24 w-24 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{row.display_id}</span>
                  <StatusBadge status={row.status as Status} />
                  <SeverityBadge severity={row.severity as Severity} />
                  <PriorityPill score={priority.score} />
                </div>
                <p className="mt-1 truncate font-medium">{row.title}</p>
                <p className="truncate text-sm text-muted-foreground">{row.address}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Reported {formatDate(row.created_at)} · {row.support_count} community supporters
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
