import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge, SeverityBadge, PriorityPill } from "@/components/civic/badges";
import { StoredImage } from "@/components/civic/StoredImage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { assessResolution } from "@/lib/ai.functions";
import { computePriority } from "@/lib/priority";
import { type Severity, type Status } from "@/lib/civic";
import { blobToDataUrl, compressImage, uploadImage, validateImage } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/admin/queue")({ component: AdminQueue });
type Files = { before: File | undefined; after: File | undefined };

function AdminQueue() {
  const { isAdmin, user } = useAuth();
  const client = useQueryClient();
  const assess = useServerFn(assessResolution);
  const [busy, setBusy] = useState<string | null>(null);
  const [department, setDepartment] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, Files>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const queue = useQuery({
    queryKey: ["admin-queue"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select("*, complaint_images(image_url, kind)")
        .neq("status", "RESOLVED");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const departments = useQuery({
    queryKey: ["departments"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id,name").order("name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const rows = (queue.data ?? [])
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
  const refresh = () => void client.invalidateQueries({ queryKey: ["admin-queue"] });
  async function citizen(row: (typeof rows)[number]["row"], event: string, body: string) {
    const { error } = await supabase.from("notifications").insert({
      user_id: row.user_id,
      complaint_id: row.id,
      event,
      title: `${row.display_id}: ${body}`,
      body,
    });
    if (error) throw new Error(error.message);
  }
  async function status(row: (typeof rows)[number]["row"], value: Status, body: string) {
    const { error } = await supabase.from("complaints").update({ status: value }).eq("id", row.id);
    if (error) throw new Error(error.message);
    await citizen(row, value, body);
  }
  async function assign(row: (typeof rows)[number]["row"]) {
    const id = department[row.id] ?? row.department_id;
    if (!id || !user) {
      toast.error("Select a department.");
      return;
    }
    const selected = (departments.data ?? []).find((d) => d.id === id);
    setBusy(row.id);
    try {
      let r = await supabase
        .from("complaints")
        .update({
          department_id: id,
          suggested_department: selected?.name ?? row.suggested_department,
        })
        .eq("id", row.id);
      if (r.error) throw new Error(r.error.message);
      r = await supabase.from("assignments").insert({
        complaint_id: row.id,
        department_id: id,
        assigned_by: user.id,
        note: `Assigned to ${selected?.name ?? "department"}`,
      });
      if (r.error) throw new Error(r.error.message);
      await status(row, "ASSIGNED", `Assigned to ${selected?.name ?? "the department"}.`);
      toast.success("Department assigned.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Assignment failed.");
    } finally {
      setBusy(null);
    }
  }
  async function start(row: (typeof rows)[number]["row"]) {
    setBusy(row.id);
    try {
      await status(row, "IN_PROGRESS", "Work has started on site.");
      toast.success("Work started.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start work.");
    } finally {
      setBusy(null);
    }
  }
  async function progress(row: (typeof rows)[number]["row"], file: File) {
    if (!user) return;
    const problem = validateImage(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy(row.id);
    try {
      const path = await uploadImage("complaint-images", user.id, await compressImage(file));
      const { error } = await supabase
        .from("complaint_images")
        .insert({ complaint_id: row.id, image_url: path, kind: "PROGRESS", uploaded_by: user.id });
      if (error) throw new Error(error.message);
      await citizen(row, "WORK_PROGRESS", "The department added a work-progress photo.");
      toast.success("Progress evidence saved.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Progress upload failed.");
    } finally {
      setBusy(null);
    }
  }
  async function resolve(row: (typeof rows)[number]["row"]) {
    if (!user) return;
    const selected = files[row.id];
    if (!selected?.before || !selected.after) {
      toast.error("Add both final before and after photos.");
      return;
    }
    const issue = validateImage(selected.before) || validateImage(selected.after);
    if (issue) {
      toast.error(issue);
      return;
    }
    setBusy(row.id);
    try {
      const [before, after] = await Promise.all([
        compressImage(selected.before),
        compressImage(selected.after),
      ]);
      const [beforePath, afterPath, beforeData, afterData] = await Promise.all([
        uploadImage("resolution-evidence", user.id, before),
        uploadImage("resolution-evidence", user.id, after),
        blobToDataUrl(before),
        blobToDataUrl(after),
      ]);
      const verdict = await assess({
        data: { beforeDataUrl: beforeData, afterDataUrl: afterData, issueTitle: row.title },
      });
      const { error } = await supabase.from("resolution_evidence").insert({
        complaint_id: row.id,
        before_image_url: beforePath,
        after_image_url: afterPath,
        submitted_by: user.id,
        notes: notes[row.id] ?? "",
        ai_assessment: verdict.assessment,
        ai_reason: verdict.reason,
        ai_confidence: verdict.confidence_label,
      });
      if (error) throw new Error(error.message);
      await status(
        row,
        "CITIZEN_VERIFICATION",
        "Final resolution evidence is ready for your confirmation.",
      );
      toast.success("Resolution submitted.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Resolution upload failed.");
    } finally {
      setBusy(null);
    }
  }
  if (!isAdmin)
    return (
      <div className="page-shell">
        <h1 className="page-title">Municipal access only</h1>
      </div>
    );
  return (
    <div className="page-shell max-w-7xl">
      <p className="page-kicker">Municipal operations</p>
      <h1 className="page-title">Action queue</h1>
      <p className="page-subtitle">{rows.length} active reports, ranked by priority.</p>
      <div className="mt-6 space-y-4">
        {rows.map(({ row, priority }) => {
          const progressPhotos = row.complaint_images?.filter((i) => i.kind === "PROGRESS") ?? [];
          const current = files[row.id] ?? { before: undefined, after: undefined };
          return (
            <article key={row.id} className="border border-border bg-card p-5">
              <div className="flex gap-4">
                <StoredImage
                  path={row.complaint_images?.[0]?.image_url}
                  alt={row.title}
                  className="h-24 w-24"
                />
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="font-mono text-xs">{row.display_id}</span>
                    <StatusBadge status={row.status as Status} />
                    <SeverityBadge severity={row.severity as Severity} />
                    <PriorityPill score={priority} />
                  </div>
                  <Link
                    to="/complaint/$id"
                    params={{ id: row.id }}
                    className="mt-1 block font-semibold"
                  >
                    {row.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">{row.address}</p>
                </div>
              </div>
              <div className="mt-4 border-t pt-4">
                {["SUBMITTED", "AI_VERIFIED", "REOPENED"].includes(row.status) ? (
                  <div className="flex gap-2">
                    <select
                      value={department[row.id] ?? row.department_id ?? ""}
                      onChange={(e) => setDepartment((v) => ({ ...v, [row.id]: e.target.value }))}
                      className="border bg-background px-2 text-sm"
                    >
                      <option value="">Select department</option>
                      {(departments.data ?? []).map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <Button size="sm" disabled={busy === row.id} onClick={() => void assign(row)}>
                      Assign Department
                    </Button>
                  </div>
                ) : null}
                {row.status === "ASSIGNED" ? (
                  <Button size="sm" disabled={busy === row.id} onClick={() => void start(row)}>
                    Start Work
                  </Button>
                ) : null}
                {row.status === "IN_PROGRESS" ? (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium">
                      Upload progress evidence
                      <Input
                        type="file"
                        accept="image/*"
                        disabled={busy === row.id}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void progress(row, f);
                        }}
                      />
                    </label>
                    {progressPhotos.length ? (
                      <div className="flex gap-2">
                        {progressPhotos.map((p, i) => (
                          <StoredImage
                            key={p.image_url}
                            path={p.image_url}
                            alt={`Progress ${i + 1}`}
                            className="h-16 w-16"
                          />
                        ))}
                      </div>
                    ) : null}
                    <div className="grid gap-3 border bg-secondary/30 p-4 md:grid-cols-2">
                      <label className="text-sm font-medium">
                        Final before photo
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            setFiles((v) => ({
                              ...v,
                              [row.id]: {
                                ...(v[row.id] ?? { before: undefined, after: undefined }),
                                before: e.target.files?.[0],
                              },
                            }))
                          }
                        />
                        {current.before ? <small>Selected: {current.before.name}</small> : null}
                      </label>
                      <label className="text-sm font-medium">
                        Final after photo
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            setFiles((v) => ({
                              ...v,
                              [row.id]: {
                                ...(v[row.id] ?? { before: undefined, after: undefined }),
                                after: e.target.files?.[0],
                              },
                            }))
                          }
                        />
                        {current.after ? <small>Selected: {current.after.name}</small> : null}
                      </label>
                      <label className="md:col-span-2 text-sm font-medium">
                        Resolution note
                        <Input
                          value={notes[row.id] ?? ""}
                          onChange={(e) => setNotes((v) => ({ ...v, [row.id]: e.target.value }))}
                        />
                      </label>
                      <div className="md:col-span-2">
                        <Button
                          disabled={busy === row.id || !current.before || !current.after}
                          onClick={() => void resolve(row)}
                        >
                          {busy === row.id ? <Loader2 className="animate-spin" /> : null}Submit
                          Resolution
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
