import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Mic, Square, Trash2, Upload } from "lucide-react";
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
import type { EmergencyAssessment } from "@/lib/ai.functions";
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
    const compressed = await compressImage(file);
    const dataUrl = await blobToDataUrl(compressed);
    setBlob(compressed);
    setPreview(dataUrl);
    setAnalyzing(true);
    try {
      const result = await analyze({ data: { imageDataUrl: dataUrl } });
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
      setStep(2);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI analysis failed.");
      setStep(2);
    } finally {
      setAnalyzing(false);
    }
  }

  async function checkDuplicates() {
    if (!coords) return;
    const { data } = await supabase
      .from("complaints")
      .select("id, display_id, title, latitude, longitude, status")
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

      // AI decides the emergency verdict; the citizen answers are only evidence.
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
        risk,
        description,
        suggested_department: department,
        confidence: confidence || "MEDIUM",
        raw: { title, description, risk, confidence },
      });

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
        <div className="civic-panel mt-6 border-dashed p-8 text-center md:p-12">
          <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">Upload a photo of the issue</p>
          <p className="text-sm text-muted-foreground">JPG, PNG or WEBP up to 8MB.</p>
          <Input
            type="file"
            accept="image/*"
            className="mx-auto mt-4 max-w-xs"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <label className="mt-4 block text-sm font-medium">
            Add supporting photos (optional)
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setExtraImages(Array.from(e.target.files ?? []))}
            />
          </label>
          {analyzing ? (
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> AI is analysing the photo…
            </p>
          ) : null}
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
