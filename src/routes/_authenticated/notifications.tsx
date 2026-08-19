import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/civic";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — CivicPulse AI" },
      { name: "description", content: "Status updates on the civic reports you filed." },
      { property: "og:title", content: "Notifications — CivicPulse AI" },
      { property: "og:description", content: "Every municipal update on your civic reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Notifications,
});

function Notifications() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  async function markAllRead() {
    await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
    void queryClient.invalidateQueries();
  }

  const rows = query.data ?? [];

  return (
    <div className="page-shell max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="page-kicker">Case activity</p>
          <h1 className="page-title">Notifications</h1>
        </div>
        {rows.some((r) => !r.is_read) ? (
          <Button variant="outline" size="sm" onClick={() => void markAllRead()}>
            Mark all read
          </Button>
        ) : null}
      </div>
      <div className="mt-6 space-y-3">
        {rows.length === 0 ? <p className="empty-state">No notifications yet.</p> : null}
        {rows.map((row) => {
          const body = (
            <div
              className={`rounded-xl border p-5 shadow-[0_8px_22px_-24px_oklch(.29_.08_254_/_70%)] ${row.is_read ? "border-border bg-card" : "border-primary/45 bg-secondary"}`}
            >
              <p className="font-medium">{row.title}</p>
              <p className="text-sm text-muted-foreground">{row.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(row.created_at)}</p>
            </div>
          );
          return row.complaint_id ? (
            <Link
              key={row.id}
              to="/complaint/$id"
              params={{ id: row.complaint_id }}
              className="block"
            >
              {body}
            </Link>
          ) : (
            <div key={row.id}>{body}</div>
          );
        })}
      </div>
    </div>
  );
}
