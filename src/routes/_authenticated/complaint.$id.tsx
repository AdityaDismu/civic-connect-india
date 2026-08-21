import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, SeverityBadge, PriorityPill } from "@/components/civic/badges";
import { StoredImage } from "@/components/civic/StoredImage";
import { CivicMap } from "@/components/civic/CivicMap";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { computePriority } from "@/lib/priority";
import { downloadComplaintReceipt } from "@/lib/receipt";
import { compressImage, uploadImage, validateImage } from "@/lib/storage";
import { resolveImageUrl } from "@/lib/storage";
import {
  STATUS_LABELS,
  TIMELINE_STEPS,
  formatDateTime,
  type Severity,
  type Status,
} from "@/lib/civic";

export const Route = createFileRoute("/_authenticated/complaint/$id")({
  head: () => ({
    meta: [
      { title: "Report tracking — CivicPulse AI" },
      {
        name: "description",
        content: "Follow a civic report through triage, repair and citizen verification.",
      },
      { property: "og:title", content: "Report tracking — CivicPulse AI" },
      {
        property: "og:description",
        content: "Live status, AI analysis and resolution proof for a civic report.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComplaintPage,
});

function ComplaintPage() {
  const { id } = useParams({ from: "/_authenticated/complaint/$id" });
  const { user, fullName } = useAuth();
  const queryClient = useQueryClient();
  const [downloading, setDownloading] = useState(false);
  const [reopenMode, setReopenMode] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenPhoto, setReopenPhoto] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);

  const query = useQuery({
    queryKey: ["complaint", id],
    queryFn: async () => {
      const [complaint, images, history, evidence, support, verifications, analyses] =
        await Promise.all([
          supabase.from("complaints").select("*").eq("id", id).maybeSingle(),
          supabase.from("complaint_images").select("*").eq("complaint_id", id),
          supabase.from("status_history").select("*").eq("complaint_id", id).order("created_at"),
          supabase
            .from("resolution_evidence")
            .select("*")
            .eq("complaint_id", id)
            .order("created_at"),
          supabase.from("community_support").select("user_id").eq("complaint_id", id),
          supabase.from("citizen_verifications").select("*").eq("complaint_id", id),
          supabase.from("ai_analyses").select("kind, risk, raw").eq("complaint_id", id),
        ]);
      if (complaint.error) throw new Error(complaint.error.message);
      const voiceUrl = complaint.data?.voice_note_url
        ? await resolveImageUrl(complaint.data.voice_note_url)
        : null;
      return {
        complaint: complaint.data,
        voiceUrl,
        images: images.data ?? [],
        history: history.data ?? [],
        evidence: evidence.data ?? [],
        support: support.data ?? [],
        verifications: verifications.data ?? [],
        analyses: analyses.data ?? [],
      };
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`complaint-sync-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "complaints", filter: `id=eq.${id}` },
        () => void queryClient.invalidateQueries({ queryKey: ["complaint", id] }),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "complaint_images",
          filter: `complaint_id=eq.${id}`,
        },
        () => void queryClient.invalidateQueries({ queryKey: ["complaint", id] }),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "resolution_evidence",
          filter: `complaint_id=eq.${id}`,
        },
        () => void queryClient.invalidateQueries({ queryKey: ["complaint", id] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  const data = query.data;
  const complaint = data?.complaint;
  if (query.isLoading) return <p className="p-8 text-sm text-muted-foreground">Loading report…</p>;
  if (!complaint) return <p className="p-8 text-sm text-muted-foreground">Report not found.</p>;

  const isOwner = complaint.user_id === user?.id;
  const supported = (data?.support ?? []).some((s) => s.user_id === user?.id);
  const priority = computePriority({
    severity: complaint.severity as Severity,
    category: complaint.category,
    address: complaint.address,
    description: complaint.description,
    supportCount: complaint.support_count,
    createdAt: complaint.created_at,
  });
  const before = data?.images.find((i) => i.kind === "BEFORE")?.image_url;
  const latestEvidence = data?.evidence.at(-1);
  const progressPhotos = data?.images.filter((image) => image.kind === "PROGRESS") ?? [];
  const reachedIndex = TIMELINE_STEPS.findIndex((s) => s.status === complaint.status);
  const integrity = data?.analyses.find((analysis) => analysis.kind === "ISSUE")?.raw as
    | {
        report_integrity?: {
          level?: string;
          reasons?: string[];
          disclaimer?: string;
          requires_authority_review?: boolean;
        };
      }
    | undefined;
  const reportIntegrity = integrity?.report_integrity;

  async function handleDownloadReceipt() {
    if (!complaint) return;
    setDownloading(true);
    try {
      await downloadComplaintReceipt({
        displayId: complaint.display_id,
        title: complaint.title,
        category: complaint.category,
        description: complaint.description,
        severity: complaint.severity,
        priority: priority.score,
        address: complaint.address,
        latitude: complaint.latitude,
        longitude: complaint.longitude,
        createdAt: complaint.created_at,
        status: complaint.status,
        department: complaint.suggested_department,
        trackingUrl: `${window.location.origin}/complaint/${complaint.id}`,
        reporter: isOwner ? fullName || user?.email || "Citizen" : "Citizen",
      });
      toast.success("Receipt downloaded.");
    } catch {
      toast.error("Could not generate the receipt. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function toggleSupport() {
    if (!user) return;
    if (supported) {
      await supabase
        .from("community_support")
        .delete()
        .eq("complaint_id", id)
        .eq("user_id", user.id);
    } else {
      const { error } = await supabase
        .from("community_support")
        .insert({ complaint_id: id, user_id: user.id });
      if (error) toast.error(error.message);
      else {
        const rewardsDb = supabase as unknown as {
          rpc: (
            name: string,
            args: Record<string, unknown>,
          ) => Promise<{ data: unknown; error: { message: string } | null }>;
        };
        const { data: rewardResult } = await rewardsDb.rpc("award_civic_points", {
          _action: "GENUINE_SUPPORT",
          _complaint_id: id,
        });
        const reward = Array.isArray(rewardResult)
          ? rewardResult[0]
          : (rewardResult as { awarded?: number } | null);
        if (reward?.awarded)
          toast.success(`+${reward.awarded} CivicPoints for supporting this report.`);
      }
    }
    void queryClient.invalidateQueries({ queryKey: ["complaint", id] });
  }

  async function verify(isVerified: boolean) {
    if (!user) return;
    if (!isVerified && !reopenReason.trim()) {
      toast.error("Tell the municipal team what still needs attention.");
      return;
    }
    setVerifying(true);
    try {
      let evidenceUrl: string | undefined;
      if (!isVerified && reopenPhoto) {
        const problem = validateImage(reopenPhoto);
        if (problem) throw new Error(problem);
        evidenceUrl = await uploadImage(
          "complaint-images",
          user.id,
          await compressImage(reopenPhoto),
        );
      }
      const { error } = await supabase.from("citizen_verifications").insert({
        complaint_id: id,
        user_id: user.id,
        is_verified: isVerified,
        reason: isVerified ? "Citizen confirmed the fix" : "Citizen reported the issue persists",
        comment: isVerified ? "" : reopenReason.trim(),
        evidence_url: evidenceUrl ?? null,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      const { error: statusError } = await supabase
        .from("complaints")
        .update({ status: isVerified ? "RESOLVED" : "REOPENED" })
        .eq("id", id);
      if (statusError) toast.error(statusError.message);
      else toast.success(isVerified ? "Thanks for confirming the fix." : "Report reopened.");
      if (isVerified && !statusError) {
        const rewardsDb = supabase as unknown as {
          rpc: (
            name: string,
            args: Record<string, unknown>,
          ) => Promise<{ data: unknown; error: { message: string } | null }>;
        };
        const { data: rewardResult } = await rewardsDb.rpc("award_civic_points", {
          _action: "RESOLUTION_VERIFICATION",
          _complaint_id: id,
        });
        const reward = Array.isArray(rewardResult)
          ? rewardResult[0]
          : (rewardResult as { awarded?: number } | null);
        if (reward?.awarded)
          toast.success(`+${reward.awarded} CivicPoints for completing verification.`);
      }
      void queryClient.invalidateQueries({ queryKey: ["complaint", id] });
      setReopenMode(false);
      setReopenReason("");
      setReopenPhoto(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit your response.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="page-shell max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-[0_8px_22px_-24px_oklch(.29_.08_254_/_70%)]">
        <span className="font-mono text-sm text-muted-foreground">{complaint.display_id}</span>
        <StatusBadge status={complaint.status as Status} />
        <SeverityBadge severity={complaint.severity as Severity} />
        <PriorityPill score={priority.score} />
        <Button
          className="ml-auto"
          onClick={() => void handleDownloadReceipt()}
          disabled={downloading}
        >
          {downloading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Download Receipt
        </Button>
      </div>
      <div className="max-w-3xl">
        <p className="page-kicker">Public case file</p>
        <h1 className="page-title">{complaint.title}</h1>
      </div>
      <p className="max-w-3xl text-base leading-7 text-muted-foreground">{complaint.description}</p>
      <p className="text-sm text-muted-foreground">
        {complaint.address} · Assigned department: {complaint.suggested_department}
      </p>
      {complaint.is_emergency ? (
        <section className="rounded-xl border border-warning bg-warning/10 p-5">
          <p className="font-semibold">URGENT ISSUE</p>
          <p className="text-sm">
            Emergency Risk:{" "}
            {String((complaint.emergency_assessment as { risk?: string }).risk ?? "UNDER REVIEW")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            This is a CivicPulse AI prototype assessment and does not guarantee an emergency
            response.
          </p>
        </section>
      ) : null}
      {reportIntegrity ? (
        <section
          className={`rounded-xl border p-5 ${reportIntegrity.level === "HIGH" ? "border-destructive/50 bg-destructive/10" : reportIntegrity.level === "MEDIUM" ? "border-warning/50 bg-warning/10" : "border-success/40 bg-success/10"}`}
        >
          <p className="font-semibold">
            Report integrity check: {reportIntegrity.level ?? "UNDER REVIEW"} risk
          </p>
          {reportIntegrity.requires_authority_review ? (
            <p className="mt-1 text-sm font-medium text-destructive">
              Flagged for authority review. Submission remains active.
            </p>
          ) : null}
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {reportIntegrity.reasons?.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          {reportIntegrity.disclaimer ? (
            <p className="mt-3 text-xs text-muted-foreground">{reportIntegrity.disclaimer}</p>
          ) : null}
        </section>
      ) : null}
      {data?.voiceUrl ? (
        <section className="civic-panel-soft">
          <h2 className="text-lg font-semibold">Citizen voice note</h2>
          <audio className="mt-3 w-full" controls src={data.voiceUrl} />
          {complaint.voice_transcript ? (
            <p className="mt-3 text-sm">
              <strong>Voice transcript:</strong> {complaint.voice_transcript}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Voice transcript unavailable. The original recording is preserved.
            </p>
          )}
        </section>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <StoredImage path={before} alt="Reported issue" className="h-64 w-full rounded-xl border" />
        <CivicMap
          center={[complaint.latitude, complaint.longitude]}
          zoom={16}
          points={[
            {
              id: complaint.id,
              lat: complaint.latitude,
              lng: complaint.longitude,
              status: complaint.status as Status,
              severity: complaint.severity as Severity,
              title: complaint.title,
              displayId: complaint.display_id,
              priority: priority.score,
            },
          ]}
          className="h-64 w-full rounded-xl border"
        />
      </div>

      <section className="civic-panel-soft">
        <h2 className="text-lg font-semibold">Priority breakdown</h2>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {priority.breakdown.map((factor) => (
            <li key={factor.label}>
              +{factor.points} · {factor.label}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm font-medium">Total: {priority.score}/100</p>
      </section>

      <section className="civic-panel-soft">
        <h2 className="text-lg font-semibold">Tracking timeline</h2>
        <ol className="mt-3 space-y-3">
          {TIMELINE_STEPS.map((step, index) => {
            const entry = data?.history.find((h) => h.to_status === step.status);
            const done = Boolean(entry) || (reachedIndex >= 0 && index <= reachedIndex);
            return (
              <li key={step.status} className="flex gap-3 text-sm">
                <span
                  className={
                    done
                      ? "mt-1 h-3 w-3 shrink-0 rounded-full bg-primary ring-4 ring-primary/10"
                      : "mt-1 h-3 w-3 shrink-0 rounded-full bg-muted"
                  }
                />
                <div>
                  <p className={done ? "font-medium" : "text-muted-foreground"}>{step.label}</p>
                  {entry ? (
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(entry.created_at)}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {latestEvidence ? (
        <section className="civic-panel-soft">
          <h2 className="text-lg font-semibold">Resolution evidence</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <StoredImage
              path={latestEvidence.before_image_url}
              alt="Before"
              className="h-48 w-full rounded-md"
            />
            <StoredImage
              path={latestEvidence.after_image_url}
              alt="After"
              className="h-48 w-full rounded-md"
            />
          </div>
          {latestEvidence.ai_assessment ? (
            <p className="mt-3 text-sm">
              AI assessment: <strong>{latestEvidence.ai_assessment.replaceAll("_", " ")}</strong> (
              {latestEvidence.ai_confidence ?? "MEDIUM"} confidence) — {latestEvidence.ai_reason}
            </p>
          ) : null}
          {latestEvidence.notes ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Department note: {latestEvidence.notes}
            </p>
          ) : null}
        </section>
      ) : null}

      {progressPhotos.length > 0 ? (
        <section className="civic-panel-soft">
          <h2 className="text-lg font-semibold">Work progress</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Photos added by the assigned department while work was in progress.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {progressPhotos.map((photo, index) => (
              <StoredImage
                key={photo.id}
                path={photo.image_url}
                alt={`Work progress ${index + 1}`}
                className="h-28 w-28"
              />
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {!isOwner ? (
          <Button variant={supported ? "outline" : "default"} onClick={() => void toggleSupport()}>
            {supported ? "Remove support" : "Support this report"} ({complaint.support_count})
          </Button>
        ) : null}
        {isOwner && complaint.status === "CITIZEN_VERIFICATION" ? (
          <section className="w-full civic-panel-soft">
            <h2 className="text-xl font-bold">Has this issue actually been resolved?</h2>
            {!reopenMode ? (
              <div className="mt-4 flex flex-wrap gap-3">
                <Button disabled={verifying} onClick={() => void verify(true)}>
                  YES — CONFIRM RESOLUTION
                </Button>
                <Button variant="destructive" onClick={() => setReopenMode(true)}>
                  NO — REOPEN ISSUE
                </Button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <Textarea
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="What still needs attention?"
                />
                <label className="block text-sm font-medium">
                  Optional photo evidence
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setReopenPhoto(e.target.files?.[0] ?? null)}
                  />
                </label>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setReopenMode(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={verifying}
                    onClick={() => void verify(false)}
                  >
                    {verifying ? <Loader2 className="animate-spin" /> : null}Submit reopen request
                  </Button>
                </div>
              </div>
            )}
          </section>
        ) : null}
      </div>

      {(data?.verifications.length ?? 0) > 0 ? (
        <section className="civic-panel-soft text-sm">
          <h2 className="font-semibold">Citizen verification</h2>
          {data?.verifications.map((v) => (
            <p key={v.id} className="mt-1 text-muted-foreground">
              {v.is_verified ? "Confirmed fixed" : "Reported still open"} ·{" "}
              {formatDateTime(v.created_at)} · {v.reason}
            </p>
          ))}
        </section>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Current status: {STATUS_LABELS[complaint.status as Status]}
      </p>
    </div>
  );
}
