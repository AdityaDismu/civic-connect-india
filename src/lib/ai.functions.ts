import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MODEL = "gemini-2.5-flash";

const AnalyzeInput = z.object({
  imageDataUrl: z.string().min(20),
  claim: z
    .object({
      title: z.string().max(200).default(""),
      description: z.string().max(2000).default(""),
      category: z.string().max(50).default(""),
      latitude: z.number().finite().optional(),
      longitude: z.number().finite().optional(),
    })
    .optional(),
  metadata: z
    .object({
      available: z.boolean().default(false),
      capturedAt: z.string().max(80).optional(),
      latitude: z.number().finite().optional(),
      longitude: z.number().finite().optional(),
    })
    .optional(),
  duplicate: z
    .object({
      similarity: z.number().min(0).max(100).default(0),
      matchedComplaintId: z.string().uuid().optional(),
    })
    .optional(),
});

const AssessInput = z.object({
  beforeDataUrl: z.string().min(20),
  afterDataUrl: z.string().min(20),
  issueTitle: z.string().default(""),
});

const EmergencyInput = z.object({
  imageDataUrl: z.string().min(20),
  title: z.string().max(200).default(""),
  description: z.string().max(2000).default(""),
  category: z.string().max(50).default("OTHER"),
  severity: z.string().max(20).default("MEDIUM"),
  address: z.string().max(300).default(""),
  citizenFlags: z
    .object({
      markedEmergency: z.boolean().default(false),
      dangerNow: z.boolean().default(false),
      peopleAtRisk: z.boolean().default(false),
      accessBlocked: z.boolean().default(false),
      hazardType: z.string().max(200).default(""),
    })
    .default({}),
});

const AssistInput = z.object({
  question: z.string().min(1).max(500),
  context: z.string().max(4000).default(""),
});

type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

function parseDataUrl(dataUrl: string): { mimeType: string; base64Data: string } {
  const matches = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!matches || !matches[1] || !matches[2]) {
    throw new Error("Invalid image data URL format.");
  }
  return { mimeType: matches[1], base64Data: matches[2] };
}

async function callGemini(
  parts: GeminiPart[],
  systemInstruction: string,
  jsonMode: boolean,
): Promise<string> {
  const apiKey = process.env["GEMINI_API_KEY"] || process.env["VITE_GEMINI_API_KEY"];
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured on the server.");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const payload: any = {
    contents: [
      {
        role: "user",
        parts: parts,
      },
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
  };

  if (jsonMode) {
    payload.generationConfig = {
      response_mime_type: "application/json",
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 429)
      throw new Error("AI rate limit reached. Please try again shortly.");
    throw new Error(`Gemini API request failed [${response.status}]: ${body.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function parseJson<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("AI returned an unreadable response.");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

export type IssueAnalysis = {
  issue_type: string;
  category: string;
  severity: string;
  risk: string;
  description: string;
  suggested_department: string;
  confidence: string;
  is_civic_issue: boolean;
  integrity: ReportIntegrity;
};

export type ReportIntegrity = {
  level: "LOW" | "MEDIUM" | "HIGH";
  reasons: string[];
  requires_authority_review: boolean;
  vision_match: "MATCH" | "UNCERTAIN" | "MISMATCH";
  synthetic_or_manipulated_signal: "LOW" | "MEDIUM" | "HIGH";
  metadata_available: boolean;
  location_consistent: boolean | null;
  duplicate_similarity: number;
  disclaimer: string;
};

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function combinedIntegrity(
  vision: Partial<Pick<ReportIntegrity, "vision_match" | "synthetic_or_manipulated_signal">>,
  data: z.infer<typeof AnalyzeInput>,
): ReportIntegrity {
  const reasons: string[] = [];
  let score = 0;
  const visionMatch = ["MATCH", "UNCERTAIN", "MISMATCH"].includes(vision.vision_match ?? "")
    ? (vision.vision_match as ReportIntegrity["vision_match"])
    : "UNCERTAIN";
  const syntheticSignal = ["LOW", "MEDIUM", "HIGH"].includes(
    vision.synthetic_or_manipulated_signal ?? "",
  )
    ? (vision.synthetic_or_manipulated_signal as ReportIntegrity["synthetic_or_manipulated_signal"])
    : "LOW";
  if (visionMatch === "MISMATCH") {
    score += 45;
    reasons.push("The visible image does not clearly support the submitted issue description.");
  } else if (visionMatch === "UNCERTAIN") {
    score += 12;
    reasons.push("Image-to-claim match is inconclusive and may need a human check.");
  }
  if (syntheticSignal === "HIGH") {
    score += 25;
    reasons.push("Vision analysis found strong visual anomalies that warrant review.");
  } else if (syntheticSignal === "MEDIUM") {
    score += 12;
    reasons.push(
      "Vision analysis found visual anomalies; this is not conclusive evidence of manipulation.",
    );
  }
  let locationConsistent: boolean | null = null;
  if (
    data.metadata?.latitude != null &&
    data.metadata.longitude != null &&
    data.claim?.latitude != null &&
    data.claim.longitude != null
  ) {
    const km = distanceKm(
      data.metadata.latitude,
      data.metadata.longitude,
      data.claim.latitude,
      data.claim.longitude,
    );
    locationConsistent = km <= 2;
    if (!locationConsistent) {
      score += 25;
      reasons.push(`Photo GPS metadata is ${km.toFixed(1)} km from the selected report location.`);
    }
  } else if (!data.metadata?.available) {
    reasons.push(
      "No usable EXIF metadata was available; this is not treated as evidence of manipulation.",
    );
  }
  const similarity = Math.round(data.duplicate?.similarity ?? 0);
  if (similarity >= 90) {
    score += 35;
    reasons.push("This image is highly similar to a photo already attached to another report.");
  } else if (similarity >= 75) {
    score += 18;
    reasons.push("This image appears visually similar to an existing report photo.");
  }
  const level: ReportIntegrity["level"] = score >= 45 ? "HIGH" : score >= 20 ? "MEDIUM" : "LOW";
  if (reasons.length === 0)
    reasons.push("No material consistency signals were found in the checks that were available.");
  return {
    level,
    reasons,
    requires_authority_review: level === "HIGH",
    vision_match: visionMatch,
    synthetic_or_manipulated_signal: syntheticSignal,
    metadata_available: Boolean(data.metadata?.available),
    location_consistent: locationConsistent,
    duplicate_similarity: similarity,
    disclaimer:
      "These signals help prioritise review and cannot determine with certainty whether an image is AI-generated or manipulated.",
  };
}

export const analyzeIssueImage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data }): Promise<IssueAnalysis> => {
    const { mimeType, base64Data } = parseDataUrl(data.imageDataUrl);

    const systemInstruction =
      "You are a municipal civic-infrastructure inspector. Look at the photo and report only what is actually visible. " +
      "Respond with strict JSON matching: {issue_type, category, severity, risk, description, suggested_department, confidence, is_civic_issue, vision_match, synthetic_or_manipulated_signal}. " +
      "category must be one of POTHOLE, GARBAGE, DRAINAGE, WATER, STREETLIGHT, FOOTPATH, MANHOLE, FALLEN_TREE, OTHER. " +
      "severity must be one of LOW, MEDIUM, HIGH, CRITICAL. confidence must be LOW, MEDIUM or HIGH. " +
      "suggested_department must be one of Road Maintenance, Waste Management, Water Supply, Drainage Department, Electrical, Garden / Disaster Response. " +
      "description is one or two factual sentences a citizen could file as a complaint. " +
      "is_civic_issue is false when the photo shows no civic infrastructure problem. " +
      "vision_match must be MATCH, UNCERTAIN or MISMATCH based only on whether the image supports the supplied claim. " +
      "synthetic_or_manipulated_signal must be LOW, MEDIUM or HIGH and represents visual anomalies only, never a definitive determination that an image is generated or manipulated.";

    const parts: GeminiPart[] = [
      {
        text: `Analyse this civic issue photo. Claimed report: ${JSON.stringify(data.claim ?? {})}`,
      },
      {
        inline_data: {
          mime_type: mimeType,
          data: base64Data,
        },
      },
    ];

    const text = await callGemini(parts, systemInstruction, true);
    const parsed = parseJson<IssueAnalysis>(text);
    return { ...parsed, integrity: combinedIntegrity(parsed, data) };
  });

export type ResolutionAssessment = {
  assessment: "LIKELY_RESOLVED" | "PARTIALLY_RESOLVED" | "NOT_RESOLVED" | string;
  reason: string;
  confidence_label: string;
};

export const assessResolution = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AssessInput.parse(input))
  .handler(async ({ data }): Promise<ResolutionAssessment> => {
    const beforeParsed = parseDataUrl(data.beforeDataUrl);
    const afterParsed = parseDataUrl(data.afterDataUrl);

    const systemInstruction =
      "You compare a BEFORE photo of a reported civic issue with an AFTER photo submitted as proof of repair. " +
      "Respond with strict JSON: {assessment, reason, confidence_label}. " +
      "assessment must be LIKELY_RESOLVED, PARTIALLY_RESOLVED or NOT_RESOLVED. " +
      "confidence_label must be LOW, MEDIUM or HIGH. reason is one factual sentence describing what changed. " +
      "Never invent numeric accuracy figures.";

    const parts: GeminiPart[] = [
      { text: `Reported issue: ${data.issueTitle}. First image is BEFORE, second is AFTER.` },
      {
        inline_data: {
          mime_type: beforeParsed.mimeType,
          data: beforeParsed.base64Data,
        },
      },
      {
        inline_data: {
          mime_type: afterParsed.mimeType,
          data: afterParsed.base64Data,
        },
      },
    ];

    const text = await callGemini(parts, systemInstruction, true);
    return parseJson<ResolutionAssessment>(text);
  });

export type EmergencyAssessment = {
  is_emergency: boolean;
  risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  hazard: string;
  explanation: string;
  recommended_action: string;
  confidence_label: string;
};

/**
 * AI decides whether a report is a genuine public-safety emergency.
 * The citizen's answers are evidence, not the verdict, so an unticked photo of
 * an open manhole can still be escalated and a ticked cosmetic issue can be
 * downgraded.
 */
export const assessEmergency = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => EmergencyInput.parse(input))
  .handler(async ({ data }): Promise<EmergencyAssessment> => {
    const { mimeType, base64Data } = parseDataUrl(data.imageDataUrl);

    const systemInstruction =
      "You are a municipal emergency triage officer. Judge how dangerous a reported civic issue is to the public right now, " +
      "using the photo as primary evidence and the citizen's answers as supporting claims you may override. " +
      "Respond with strict JSON: {is_emergency, risk, hazard, explanation, recommended_action, confidence_label}. " +
      "risk must be LOW, MEDIUM, HIGH or CRITICAL. is_emergency is true only when risk is HIGH or CRITICAL. " +
      "hazard is a short phrase such as 'fall into open manhole' or 'none'. explanation is one factual sentence about what the photo shows. " +
      "recommended_action is one short municipal instruction. confidence_label must be LOW, MEDIUM or HIGH. " +
      "Do not treat a citizen's emergency checkbox as proof, and never invent details not visible in the photo.";

    const context = [
      `Title: ${data.title}`,
      `Description: ${data.description}`,
      `Category: ${data.category}`,
      `Citizen-selected severity: ${data.severity}`,
      `Location: ${data.address}`,
      `Citizen marked emergency: ${data.citizenFlags.markedEmergency}`,
      `Citizen says immediate danger: ${data.citizenFlags.dangerNow}`,
      `Citizen says someone at risk now: ${data.citizenFlags.peopleAtRisk}`,
      `Citizen says access blocked: ${data.citizenFlags.accessBlocked}`,
      `Citizen hazard note: ${data.citizenFlags.hazardType || "none"}`,
    ].join("\n");

    const parts: GeminiPart[] = [
      { text: `Assess the emergency risk of this civic issue.\n${context}` },
      { inline_data: { mime_type: mimeType, data: base64Data } },
    ];

    const parsed = parseJson<EmergencyAssessment>(await callGemini(parts, systemInstruction, true));
    const risk = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(String(parsed.risk).toUpperCase())
      ? String(parsed.risk).toUpperCase()
      : "LOW";
    return {
      ...parsed,
      risk,
      is_emergency: risk === "HIGH" || risk === "CRITICAL",
    };
  });

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AssistInput.parse(input))
  .handler(async ({ data }): Promise<{ answer: string }> => {
    const systemInstruction =
      "You are the CivicPulse assistant. Help citizens report and track civic issues on this platform. " +
      "The flow is: upload a photo, AI analyses it, review and edit the details, confirm the location on the map, " +
      "check for nearby duplicates, submit, then track the complaint by its CP-YEAR-NNNNN id. " +
      "Admins assign a department, work on it, upload proof, and the citizen verifies the fix. " +
      "Answer in at most four short sentences. Only use the supplied public context for data questions and never reveal personal details.";

    const promptText = `Public context:\n${data.context || "none"}\n\nQuestion: ${data.question}`;
    const parts: GeminiPart[] = [{ text: promptText }];

    const answer = await callGemini(parts, systemInstruction, false);
    return { answer: answer.trim() || "I could not answer that right now." };
  });
