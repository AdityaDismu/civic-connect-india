import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileImage, ImagePlus, Loader2, Mic, Plus, Square, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CivicMap } from "@/components/civic/CivicMap";
import { Chip } from "@/components/civic/badges";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { analyzeIssueImage, assessEmergency } from "@/lib/ai.functions";
import type { EmergencyAssessment, ReportIntegrity } from "@/lib/ai.functions";
import { blobToDataUrl, compressImage, uploadImage, validateImage } from "@/lib/storage";
import {
  CATEGORIES,
  CATEGORY_DEPARTMENT,
  CATEGORY_LABELS,
  SEVERITIES,
  distanceMeters,
  formatDistance,
  type Category,
  type Severity,
} from "@/lib/civic";
import { computePriority } from "@/lib/priority";
import { findSimilarImage, readImageMetadata, type ImageMetadata } from "@/lib/image-forensics";

export const Route = createFileRoute("/_authenticated/report")({
  head: () => ({
    meta: [
      { title: "Report a civic issue — CivicPulse AI" },
      {
        name: "description",
        content:
          "Upload a photo, let AI classify the issue, pin the location and file a tracked civic report.",
      },
      { property: "og:title", content: "Report a civic issue — CivicPulse AI" },
      { property: "og:description", content: "AI-assisted civic issue reporting in four steps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportPage,
});

type Nearby = { id: string; display_id: string; title: string; distance: number };

function IntegrityNotice({ integrity }: { integrity: ReportIntegrity }) {
  const tone =
    integrity.level === "HIGH"
      ? "border-destructive/50 bg-destructive/10"
      : integrity.level === "MEDIUM"
        ? "border-warning/50 bg-warning/10"
        : "border-success/40 bg-success/10";
  return (
    <section className={`rounded-xl border p-4 ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">Report integrity check: {integrity.level} risk</p>
        {integrity.requires_authority_review ? (
          <span className="text-xs font-bold text-destructive">FLAGGED FOR AUTHORITY REVIEW</span>
        ) : null}
      </div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {integrity.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">{integrity.disclaimer}</p>
    </section>
  );
}

function ReportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const analyze = useServerFn(analyzeIssueImage);
  const triage = useServerFn(assessEmergency);

  const [step, setStep] = useState(1);
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("OTHER");
  const [severity, setSeverity] = useState<Severity>("MEDIUM");
  const [risk, setRisk] = useState("");
  const [confidence, setConfidence] = useState("");
  const [department, setDepartment] = useState("Road Maintenance");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [nearby, setNearby] = useState<Nearby[]>([]);
  const [isEmergency, setIsEmergency] = useState(false);
  const [dangerNow, setDangerNow] = useState(false);
  const [peopleAtRisk, setPeopleAtRisk] = useState(false);
  const [accessBlocked, setAccessBlocked] = useState(false);
  const [hazardType, setHazardType] = useState("");
  const [extraImages, setExtraImages] = useState<File[]>([]);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata>({ available: false });
  const [imageIntegrity, setImageIntegrity] = useState<ReportIntegrity | null>(null);
  const [duplicateSignal, setDuplicateSignal] = useState<{
    similarity: number;
    matchedComplaintId?: string;
  }>({ similarity: 0 });

  useEffect(() => {
    if (step !== 3 || coords) return;
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords({ lat: 19.076, lng: 72.8777 }),
      { timeout: 8000 },
    );
  }, [step, coords]);

  async function handleFile(file: File) {
    const problem = validateImage(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    const metadata = await readImageMetadata(file);
    setImageMetadata(metadata);
    const compressed = await compressImage(file);
    const dataUrl = await blobToDataUrl(compressed);
    setBlob(compressed);
    setPreview(dataUrl);
    setAnalyzing(true);
    try {
      const result = await analyze({ data: { imageDataUrl: dataUrl, metadata } });
      if (!result.is_civic_issue) {
        toast.warning(
          "AI could not find a civic issue in this photo. You can still edit and submit.",
        );
      }
      const cat = (CATEGORIES as readonly string[]).includes(result.category)
        ? (result.category as Category)
        : "OTHER";
      const sev = (SEVERITIES as readonly string[]).includes(result.severity)
        ? (result.severity as Severity)
        : "MEDIUM";
      setCategory(cat);
      setSeverity(sev);
      setTitle(result.issue_type || CATEGORY_LABELS[cat]);
      setDescription(result.description || "");
      setRisk(result.risk || "");
      setConfidence(result.confidence || "");
      setDepartment(result.suggested_department || CATEGORY_DEPARTMENT[cat]);
      setImageIntegrity(result.integrity);
      setStep(2);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI analysis failed.");
      setStep(2);
    } finally {
      setAnalyzing(false);
    }
  }

  function handleExtraFiles(files: FileList | null) {
    if (!files) return;
    const newFiles = Array.from(files);
    setExtraImages((prev) => [...prev, ...newFiles]);
  }

  function removeExtraImage(index: number) {
    setExtraImages((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  async function checkDuplicates() {
    if (!coords) return;
    const { data } = await supabase
      .from("complaints")
      .select(
        "id, display_id, title, latitude, longitude, status, complaint_images(image_url, kind)",
      )
      .eq("category", category)
      .neq("status", "RESOLVED");
    const list = (data ?? [])
      .map((row) => ({
        id: row.id,
        display_id: row.display_id,
        title: row.title,
        distance: distanceMeters(coords.lat, coords.lng, row.latitude, row.longitude),
      }))
      .filter((row) => row.distance <= 150)
      .sort((a, b) => a.distance - b.distance);
    setNearby(list);
    if (preview) {
      try {
        const duplicate = await findSimilarImage(
          preview,
          (data ?? []).flatMap((row) =>
            (row.complaint_images ?? [])
              .filter((image) => image.kind === "BEFORE")
              .map((image) => ({ complaintId: row.id, imageUrl: image.image_url })),
          ),
        );
        setDuplicateSignal(duplicate);
        const refreshed = await analyze({
          data: {
            imageDataUrl: preview,
            metadata: imageMetadata,
            duplicate,
            claim: {
              title: title.trim(),
              description: description.trim(),
              category,
              latitude: coords.lat,
              longitude: coords.lng,
            },
          },
        });
        setImageIntegrity(refreshed.integrity);
      } catch {
        toast.warning("Some report-integrity checks were unavailable. You can still submit.");
      }
    }
    setStep(4);
  }

  async function startVoiceRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = [];
      const next = new MediaRecorder(stream);
      next.ondataavailable = (event) => chunks.push(event.data);
      next.onstop = () => {
        const audio = new Blob(chunks, { type: "audio/webm" });
        setVoiceBlob(audio);
        setVoiceUrl(URL.createObjectURL(audio));
        stream.getTracks().forEach((track) => track.stop());
      };
      next.start();
      setRecorder(next);
    } catch {
      toast.error("Microphone access was not available. You can continue without a voice note.");
    }
  }

  function stopVoiceRecording() {
    recorder?.stop();
    setRecorder(null);
  }

  async function submit() {
    if (!user || !coords || !blob) return;
    setSubmitting(true);
    try {
      const priority = computePriority({
        severity,
        category,
        risk,
        address,
        description,
        supportCount: 0,
        createdAt: new Date().toISOString(),
      });

      const path = await uploadImage("complaint-images", user.id, blob);

      const fallbackRisk =
        dangerNow && (peopleAtRisk || accessBlocked || severity === "CRITICAL")
          ? "HIGH"
          : peopleAtRisk || accessBlocked
            ? "MEDIUM"
            : "LOW";
      let triaged: EmergencyAssessment | null = null;
      try {
        triaged = await triage({
          data: {
            imageDataUrl: preview ?? (await blobToDataUrl(blob)),
            title: title.trim(),
            description: description.trim(),
            category,
            severity,
            address: address.trim(),
            citizenFlags: {
              markedEmergency: isEmergency,
              dangerNow,
              peopleAtRisk,
              accessBlocked,
              hazardType,
            },
          },
        });
      } catch (triageError) {
        console.error("[AI] Emergency triage unavailable", triageError);
      }
      const finalRisk = triaged?.risk ?? fallbackRisk;
      const finalEmergency = triaged
        ? triaged.is_emergency || isEmergency
        : isEmergency && fallbackRisk !== "LOW";

      const { data: complaint, error } = await supabase
        .from("complaints")
        .insert({
          user_id: user.id,
          title: title.trim() || CATEGORY_LABELS[category],
          description: description.trim(),
          category,
          severity,
          address: address.trim(),
          latitude: coords.lat,
          longitude: coords.lng,
          suggested_department: department,
          priority_score: priority.score,
          priority_breakdown: priority.breakdown,
          status: "AI_VERIFIED",
          is_emergency: finalEmergency,
          emergency_assessment: {
            source: triaged ? "AI" : "RULES",
            risk: finalRisk,
            hazard: triaged?.hazard ?? hazardType,
            explanation:
              triaged?.explanation ??
              "Risk derived from the citizen's safety answers and the issue severity because AI triage was unavailable.",
            recommended_action: triaged?.recommended_action ?? "",
            confidence: triaged?.confidence_label ?? "LOW",
            citizen_flags: {
              markedEmergency: isEmergency,
              dangerNow,
              peopleAtRisk,
              accessBlocked,
              hazardType,
            },
            factors: {
              severity,
              hasPhoto: Boolean(blob),
              extraEvidence: extraImages.length,
            },
          },
        })
        .select("id, display_id")
        .single();
      if (error) throw new Error(error.message);

      await supabase.from("complaint_images").insert({
        complaint_id: complaint.id,
        image_url: path,
        kind: "BEFORE",
        uploaded_by: user.id,
      });
      for (const image of extraImages) {
        const imagePath = await uploadImage(
          "complaint-images",
          user.id,
          await compressImage(image),
        );
        const { error: imageError } = await supabase.from("complaint_images").insert({
          complaint_id: complaint.id,
          image_url: imagePath,
          kind: "SUPPORTING",
          uploaded_by: user.id,
        });
        if (imageError) throw new Error(imageError.message);
      }
      if (voiceBlob) {
        const voicePath = await uploadImage("voice-notes", user.id, voiceBlob);
        const { error: voiceError } = await supabase
          .from("complaints")
          .update({ voice_note_url: voicePath })
          .eq("id", complaint.id);
        if (voiceError) throw new Error(voiceError.message);
      }

      await supabase.from("ai_analyses").insert({
        complaint_id: complaint.id,
        kind: "ISSUE",
        issue_type: title,
        category,
        severity,
        risk: imageIntegrity?.level ?? risk,
        description,
        suggested_department: department,
        confidence: confidence || "MEDIUM",
        raw: {
          title,
          description,
          risk,
          confidence,
          report_integrity: imageIntegrity,
          exif_metadata: imageMetadata,
          duplicate_signal: duplicateSignal,
        },
      });

      // The database independently checks integrity signals and the monthly cap.
      const rewardsDb = supabase as unknown as {
        rpc: (
          name: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: unknown; error: { message: string } | null }>;
      };
      const { data: rewardResult } = await rewardsDb.rpc("award_civic_points", {
        _action: "VALID_COMPLAINT",
        _complaint_id: complaint.id,
      });
      const reward = Array.isArray(rewardResult)
        ? rewardResult[0]
        : (rewardResult as { awarded?: number } | null);
      if (reward?.awarded)
        toast.success(`+${reward.awarded} CivicPoints for your verified report.`);

      await supabase.from("notifications").insert({
        user_id: user.id,
        complaint_id: complaint.id,
        event: "SUBMITTED",
        title: `Report ${complaint.display_id} filed`,
        body: `Your ${CATEGORY_LABELS[category]} report was routed to ${department}.`,
      });

      if (finalEmergency && !isEmergency) {
        toast.warning(
          `AI triage flagged this as an emergency (${finalRisk} risk). It has been escalated for priority attention.`,
        );
      }
      toast.success(`Report ${complaint.display_id} submitted.`);
      void navigate({ to: "/complaint/$id", params: { id: complaint.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit the report.");
    } finally {
      setSubmitting(false);
    }
  }

  const priorityPreview = computePriority({
    severity,
    category,
    risk,
    address,
    description,
    supportCount: 0,
    createdAt: new Date().toISOString(),
  });

  return (
    <div className="page-shell max-w-4xl">
      <p className="page-kicker">New case</p>
      <h1 className="page-title">Report a civic issue</h1>
      <ol className="mt-7 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {["Photo", "AI details", "Location", "Confirm"].map((label, index) => (
          <li
            key={label}
            className={
              step === index + 1
                ? "rounded-lg border border-primary bg-primary px-3 py-3 text-center font-bold text-primary-foreground shadow-sm"
                : "rounded-lg border border-border bg-card px-3 py-3 text-center font-bold text-muted-foreground"
            }
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <div className="mt-6 space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all duration-200 md:p-12 ${
              isDragging
                ? "border-primary bg-primary/10 scale-[0.99]"
                : "border-muted-foreground/25 bg-card hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            {analyzing ? (
              <div className="flex flex-col items-center justify-center space-y-3 py-6">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-4 border-primary/20 animate-pulse" />
                  <Loader2 className="absolute inset-0 m-auto h-6 w-6 animate-spin text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">Analyzing image with AI...</p>
                <p className="text-xs text-muted-foreground">
                  Classifying issue and severity details
                </p>
              </div>
            ) : preview ? (
              <div className="relative w-full overflow-hidden rounded-xl border bg-background shadow-md">
                <img
                  src={preview}
                  alt="Main issue preview"
                  className="max-h-80 w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <Label
                    htmlFor="primary-image-input"
                    className="cursor-pointer rounded-lg bg-background/90 px-4 py-2 text-xs font-semibold text-foreground shadow-sm backdrop-blur transition hover:bg-background"
                  >
                    Replace Photo
                  </Label>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary transition-transform group-hover:scale-110">
                  <Upload className="h-7 w-7" />
                </div>
                <p className="text-base font-semibold text-foreground">
                  Drag and drop your primary photo here
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Supports JPG, PNG or WEBP up to 8MB
                </p>
                <Label
                  htmlFor="primary-image-input"
                  className="mt-5 inline-flex cursor-pointer items-center justify-center rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90"
                >
                  Browse Files
                </Label>
              </div>
            )}
            <Input
              id="primary-image-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Supporting Photos (Optional)
                </p>
                <p className="text-xs text-muted-foreground">Add extra angles or close-ups</p>
              </div>
              <Label
                htmlFor="extra-images-input"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> Add Images
              </Label>
              <Input
                id="extra-images-input"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleExtraFiles(e.target.files)}
              />
            </div>

            {extraImages.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {extraImages.map((file, index) => (
                  <div
                    key={index}
                    className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Supporting item ${index + 1}`}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <button
                      type="button"
                      onClick={() => removeExtraImage(index)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-6 space-y-4">
          {preview ? (
            <img
              src={preview}
              alt="Uploaded issue"
              className="max-h-72 w-full rounded-xl border object-cover shadow-sm"
            />
          ) : null}
          {confidence ? <Chip tone="info">AI confidence: {confidence}</Chip> : null}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(value) => {
                  setCategory(value as Category);
                  setDepartment(CATEGORY_DEPARTMENT[value as Category]);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={(value) => setSeverity(value as Severity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {risk ? <p className="text-sm text-muted-foreground">Risk noted by AI: {risk}</p> : null}
          {imageIntegrity ? <IntegrityNotice integrity={imageIntegrity} /> : null}
          <p className="text-sm text-muted-foreground">Routing to: {department}</p>
          <section className="rounded-xl border bg-card p-5 shadow-[0_8px_22px_-24px_oklch(.29_.08_254_/_70%)]">
            <p className="font-semibold">Add a voice note (optional)</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Explain anything the photo may not show. This will be attached to this complaint.
            </p>
            {voiceUrl ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <audio controls src={voiceUrl} />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setVoiceBlob(null);
                    setVoiceUrl(null);
                  }}
                >
                  <Trash2 />
                  Delete and re-record
                </Button>
              </div>
            ) : recorder ? (
              <Button className="mt-3" variant="destructive" onClick={stopVoiceRecording}>
                <Square />
                Stop recording
              </Button>
            ) : (
              <Button className="mt-3" variant="outline" onClick={() => void startVoiceRecording()}>
                <Mic />
                Record voice note
              </Button>
            )}
          </section>
          <section className="rounded-xl border-2 border-destructive/70 bg-destructive/10 p-5">
            <label className="flex items-center gap-2 text-lg font-black text-destructive">
              <input
                type="checkbox"
                checked={isEmergency}
                onChange={(e) => setIsEmergency(e.target.checked)}
              />
              Emergency / Urgent Issue
            </label>
            <p className="mt-1 text-sm text-muted-foreground">
              For immediate danger to life or safety, contact your local emergency services. AI also
              reviews your photo on submission and can escalate the report even if you leave this
              unticked.
            </p>
            {isEmergency ? (
              <div className="mt-3 grid gap-2 text-sm">
                <label>
                  <input
                    type="checkbox"
                    checked={dangerNow}
                    onChange={(e) => setDangerNow(e.target.checked)}
                  />{" "}
                  This creates immediate danger to people
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={peopleAtRisk}
                    onChange={(e) => setPeopleAtRisk(e.target.checked)}
                  />{" "}
                  Someone is currently at risk
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={accessBlocked}
                    onChange={(e) => setAccessBlocked(e.target.checked)}
                  />{" "}
                  Major road or public access is blocked
                </label>
                <Input
                  value={hazardType}
                  onChange={(e) => setHazardType(e.target.value)}
                  placeholder="Injury, fire, electrocution, flooding, collapse, or other risk"
                />
                <p className="font-bold text-destructive">
                  Emergency Risk:{" "}
                  {dangerNow && (peopleAtRisk || accessBlocked || severity === "CRITICAL")
                    ? "HIGH"
                    : peopleAtRisk || accessBlocked
                      ? "MEDIUM"
                      : "LOW"}
                </p>
              </div>
            ) : null}
          </section>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={() => setStep(3)} disabled={!title.trim()}>
              Continue
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Use your current location only if you are reporting from where the issue is happening.
            Otherwise move the marker or enter the issue address.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                navigator.geolocation?.getCurrentPosition(
                  (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                  () => toast.error("Location permission was not available."),
                )
              }
            >
              USE MY CURRENT LOCATION
            </Button>
            <Button variant="outline" onClick={() => setCoords(null)}>
              SELECT ON MAP
            </Button>
          </div>
          <CivicMap
            center={[coords?.lat ?? 19.076, coords?.lng ?? 72.8777]}
            zoom={16}
            picked={coords}
            onPick={(lat, lng) => setCoords({ lat, lng })}
            className="h-[360px] w-full rounded-lg border"
          />
          <div className="space-y-2">
            <Label htmlFor="address">Landmark / address</Label>
            <Input
              id="address"
              value={address}
              placeholder="e.g. Near City School, MG Road"
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={() => void checkDuplicates()} disabled={!coords || !address.trim()}>
              Check for duplicates
            </Button>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="mt-6 space-y-4">
          {nearby.length > 0 ? (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-4">
              <p className="font-medium">Similar open reports nearby</p>
              <ul className="mt-2 space-y-1 text-sm">
                {nearby.map((item) => (
                  <li key={item.id}>
                    {item.display_id} · {item.title} · {formatDistance(item.distance)} away
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                You can still submit — support an existing report from the Community page instead if
                it is the same issue.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No similar open reports within 150m.</p>
          )}

          <div className="rounded-xl border bg-card p-5 shadow-[0_8px_22px_-24px_oklch(.29_.08_254_/_70%)]">
            <p className="font-medium">Priority preview: {priorityPreview.score}/100</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {priorityPreview.breakdown.map((factor) => (
                <li key={factor.label}>
                  +{factor.points} · {factor.label}
                </li>
              ))}
            </ul>
          </div>
          {imageIntegrity ? <IntegrityNotice integrity={imageIntegrity} /> : null}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button onClick={() => void submit()} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit report
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
