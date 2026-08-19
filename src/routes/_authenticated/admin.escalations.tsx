import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/civic";

export const Route = createFileRoute("/_authenticated/admin/escalations")({
  head: () => ({
    meta: [
      { title: "Escalations — CivicPulse AI admin" },
      { name: "description", content: "Civic reports escalated for senior municipal review." },
      { property: "og:title", content: "Escalations — CivicPulse AI admin" },
      { property: "og:description", content: "Track escalated civic reports and their reasons." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Escalations,
});

function Escalations() {
  const { isAdmin } = useAuth();
  const query = useQuery({
    queryKey: ["escalations"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escalations")
        .select("*, complaints(display_id, title)")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Municipal access only</h1>
      </div>
    );
  }

  const rows = query.data ?? [];

  return (
    <div className="page-shell max-w-5xl authority-page">
      <p className="page-kicker">Municipal operations</p>
      <h1 className="page-title">Escalations</h1>
      <div className="mt-6 space-y-3">
        {rows.length === 0 ? <p className="empty-state">No escalated reports.</p> : null}
        {rows.map((row) => (
          <Link
            key={row.id}
            to="/complaint/$id"
            params={{ id: row.complaint_id }}
            className="block rounded-xl border border-border bg-card p-5 shadow-[0_8px_22px_-24px_oklch(.29_.08_254_/_70%)] transition-all hover:-translate-y-px hover:border-primary/30 hover:bg-secondary"
          >
            <p className="font-mono text-xs text-muted-foreground">
              {row.complaints?.display_id ?? ""}
            </p>
            <p className="font-medium">{row.complaints?.title ?? "Report"}</p>
            <p className="text-sm text-muted-foreground">
              {row.reason} · {row.detail}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(row.created_at)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
