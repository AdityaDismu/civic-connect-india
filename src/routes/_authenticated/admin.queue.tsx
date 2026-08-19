import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  HardHat,
  ImagePlus,
  Loader2,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  async function statusUpdate(row: (typeof rows)[number]["row"], value: Status, body: string) {
    const { error } = await supabase.from("complaints").update({ status: value }).eq("id", row.id);
    if (error) throw new Error(error.message);
    await citizen(row, value, body);
  }

  async function assign(row: (typeof rows)[number]["row"]) {
    const id = department[row.id] ?? row.department_id;
    if (!id || !user) {
      toast.error("Please select a department.");
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

      await statusUpdate(row, "ASSIGNED", `Assigned to ${selected?.name ?? "the department"}.`);
      toast.success("Department assigned successfully.");
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
      await statusUpdate(row, "IN_PROGRESS", "Work has started on site.");
      toast.success("Work marked as started.");
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
      toast.error("Please add both final before and after photos.");
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
      await statusUpdate(
        row,
        "CITIZEN_VERIFICATION",
        "Final resolution evidence is ready for your confirmation.",
      );
      toast.success("Resolution submitted for AI verification.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Resolution upload failed.");
    } finally {
      setBusy(null);
    }
  }

  if (!isAdmin) {
    return (
      <div className="page-shell flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="rounded-full bg-destructive/10 p-4 text-destructive">
          <HardHat className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Municipal access only</h1>
        <p className="mt-2 text-muted-foreground">You do not have permission to view this queue.</p>
      </div>
    );
  }

  return (
    <div className="page-shell max-w-6xl authority-page">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="page-kicker flex items-center gap-1.5">
            <ClipboardList className="h-4 w-4" /> Municipal Operations
          </p>
          <h1 className="page-title mt-1">Action Queue</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {rows.length} active {rows.length === 1 ? "report" : "reports"}, sorted by AI priority.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-24 text-center">
            <div className="rounded-full bg-primary/10 p-4 text-primary">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-bold">All caught up!</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              There are no active reports in the queue right now.
            </p>
          </div>
        ) : null}

        {rows.map(({ row, priority }) => {
          const progressPhotos = row.complaint_images?.filter((i) => i.kind === "PROGRESS") ?? [];
          const current = files[row.id] ?? { before: undefined, after: undefined };

          return (
            <article
              key={row.id}
              className="overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Header Info */}
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
                <StoredImage
                  path={row.complaint_images?.[0]?.image_url}
                  alt={row.title}
                  className="h-28 w-28 shrink-0 rounded-lg object-cover shadow-sm"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground">
                      {row.display_id}
                    </span>
                    <PriorityPill score={priority} />
                    <StatusBadge status={row.status as Status} />
                    <SeverityBadge severity={row.severity as Severity} />
                  </div>
                  <Link
                    to="/complaint/$id"
                    params={{ id: row.id }}
                    className="group flex w-fit items-center gap-1 text-lg font-bold text-foreground transition-colors hover:text-primary"
                  >
                    {row.title}
                    <ChevronRight className="h-4 w-4 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                  </Link>
                  <p className="text-sm text-muted-foreground">{row.address}</p>
                </div>
              </div>

              {/* Contextual Actions Panel */}
              <div className="border-t bg-muted/20 p-5">
                {/* State: Assign Department */}
                {["SUBMITTED", "AI_VERIFIED", "REOPENED"].includes(row.status) && (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="w-full max-w-xs space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Route to Department</Label>
                      <Select
                        value={department[row.id] ?? row.department_id ?? ""}
                        onValueChange={(value) => setDepartment((v) => ({ ...v, [row.id]: value }))}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select a department" />
                        </SelectTrigger>
                        <SelectContent>
                          {(departments.data ?? []).map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      disabled={busy === row.id}
                      onClick={() => void assign(row)}
                      className="w-full sm:w-auto"
                    >
                      {busy === row.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Assign & Notify
                    </Button>
                  </div>
                )}

                {/* State: Start Work */}
                {row.status === "ASSIGNED" && (
                  <div className="flex items-center justify-between rounded-lg border bg-background p-4">
                    <div>
                      <p className="font-medium">Ready for deployment</p>
                      <p className="text-xs text-muted-foreground">
                        Mark as started to notify the citizen.
                      </p>
                    </div>
                    <Button disabled={busy === row.id} onClick={() => void start(row)}>
                      {busy === row.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <HardHat className="mr-2 h-4 w-4" />
                      )}
                      Start Work
                    </Button>
                  </div>
                )}

                {/* State: In Progress */}
                {row.status === "IN_PROGRESS" && (
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Left Col: Progress Photos */}
                    <div className="space-y-3 rounded-lg border bg-background p-4">
                      <div className="flex items-center gap-2 font-semibold">
                        <Camera className="h-4 w-4 text-primary" /> Intermediate Progress
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Upload photos while work is ongoing to keep the citizen informed.
                      </p>
                      <Label
                        htmlFor={`progress-${row.id}`}
                        className="inline-flex cursor-pointer items-center justify-center rounded-md border border-dashed border-primary/50 bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
                      >
                        <ImagePlus className="mr-2 h-4 w-4" /> Add Photo
                      </Label>
                      <Input
                        id={`progress-${row.id}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={busy === row.id}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void progress(row, f);
                        }}
                      />
                      {progressPhotos.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {progressPhotos.map((p, i) => (
                            <StoredImage
                              key={p.image_url}
                              path={p.image_url}
                              alt={`Progress ${i + 1}`}
                              className="h-14 w-14 rounded-md border object-cover shadow-sm"
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right Col: Final Resolution */}
                    <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="h-4 w-4 text-primary" /> Submit Resolution
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            Final Before Photo
                          </Label>
                          <Label
                            htmlFor={`before-${row.id}`}
                            className="flex cursor-pointer items-center justify-center rounded border bg-background py-1.5 text-xs hover:bg-accent"
                          >
                            {current.before ? current.before.name : "Choose File"}
                          </Label>
                          <Input
                            id={`before-${row.id}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
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
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Final After Photo</Label>
                          <Label
                            htmlFor={`after-${row.id}`}
                            className="flex cursor-pointer items-center justify-center rounded border bg-background py-1.5 text-xs hover:bg-accent"
                          >
                            {current.after ? current.after.name : "Choose File"}
                          </Label>
                          <Input
                            id={`after-${row.id}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
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
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Official Note</Label>
                        <Textarea
                          placeholder="Detail the work completed..."
                          rows={2}
                          value={notes[row.id] ?? ""}
                          onChange={(e) => setNotes((v) => ({ ...v, [row.id]: e.target.value }))}
                          className="bg-background text-sm"
                        />
                      </div>
                      <Button
                        className="w-full"
                        disabled={busy === row.id || !current.before || !current.after}
                        onClick={() => void resolve(row)}
                      >
                        {busy === row.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit for Verification
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
