import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge, SeverityBadge, PriorityPill } from "@/components/civic/badges";
import { computePriority } from "@/lib/priority";
import { formatDate, type Severity, type Status } from "@/lib/civic";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({
    meta: [
      { title: "Community reports — CivicPulse AI" },
      {
        name: "description",
        content: "Browse civic issues reported across the city, ranked by live priority.",
      },
      { property: "og:title", content: "Community reports — CivicPulse AI" },
      {
        property: "og:description",
        content: "See what your neighbours reported and add your support.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Community,
});

function Community() {
  const query = useQuery({
    queryKey: ["community"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const rows = (query.data ?? [])
    .map((row) => ({
      row,
      priority: computePriority({
        severity: row.severity as Severity,
        category: row.category,
        address: row.address,
        description: row.description,
        supportCount: row.support_count,
        createdAt: row.created_at,
      }).score,
    }))
    .sort((a, b) => b.priority - a.priority);

  return (
    <div className="page-shell max-w-6xl">
      <p className="page-kicker">City ledger</p>
      <h1 className="page-title">Community reports</h1>
      <p className="page-subtitle">
        Ranked by the live priority engine. Open a report to add your support.
      </p>
      <div className="mt-6 space-y-3">
        {query.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        {!query.isLoading && rows.length === 0 ? (
          <p className="empty-state">No civic reports have been filed yet.</p>
        ) : null}
        {rows.map(({ row, priority }) => (
          <Link
            key={row.id}
            to="/complaint/$id"
            params={{ id: row.id }}
            className="block rounded-xl border border-border bg-card p-5 shadow-[0_8px_22px_-24px_oklch(.29_.08_254_/_70%)] transition-all hover:-translate-y-px hover:border-primary/30 hover:bg-secondary/50"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{row.display_id}</span>
              {row.is_emergency ? (
                <span className="border border-destructive bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">
                  URGENT
                </span>
              ) : null}
              <StatusBadge status={row.status as Status} />
              <SeverityBadge severity={row.severity as Severity} />
              <PriorityPill score={priority} />
            </div>
            <p className="mt-2 font-bold">{row.title}</p>
            <p className="text-sm text-muted-foreground">
              {row.address} · {formatDate(row.created_at)} · {row.support_count} supporters
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
