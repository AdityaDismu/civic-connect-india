import type { Severity } from "./civic";

export type PriorityFactor = { label: string; points: number };

export type PriorityResult = {
  score: number;
  breakdown: PriorityFactor[];
};

const SEVERITY_POINTS: Record<Severity, number> = {
  LOW: 8,
  MEDIUM: 18,
  HIGH: 30,
  CRITICAL: 40,
};

const HIGH_RISK_CATEGORIES = ["MANHOLE", "FALLEN_TREE", "POTHOLE", "STREETLIGHT"];
const SENSITIVE_KEYWORDS = [
  "school",
  "hospital",
  "college",
  "clinic",
  "market",
  "station",
  "bus stop",
  "highway",
  "junction",
];

export type PriorityInput = {
  severity: Severity;
  category: string;
  risk?: string;
  address?: string;
  description?: string;
  supportCount: number;
  createdAt: string;
  reopenCount?: number;
};

/**
 * Deterministic, explainable 0-100 priority score.
 * No randomness: the same complaint always scores the same.
 */
export function computePriority(input: PriorityInput): PriorityResult {
  const breakdown: PriorityFactor[] = [];

  breakdown.push({
    label: `${input.severity.charAt(0)}${input.severity.slice(1).toLowerCase()} severity issue`,
    points: SEVERITY_POINTS[input.severity],
  });

  const riskText = `${input.risk ?? ""} ${input.description ?? ""}`.toLowerCase();
  let safetyPoints = 0;
  if (HIGH_RISK_CATEGORIES.includes(input.category)) safetyPoints += 8;
  if (/safety|injur|accident|danger|hazard|electric|fall/.test(riskText)) safetyPoints += 7;
  if (safetyPoints > 0) {
    breakdown.push({ label: "Public safety risk identified", points: Math.min(safetyPoints, 15) });
  }

  const supportPoints = Math.min(input.supportCount * 3, 15);
  if (supportPoints > 0) {
    breakdown.push({
      label: `${input.supportCount} community ${input.supportCount === 1 ? "supporter" : "supporters"}`,
      points: supportPoints,
    });
  }

  const haystack = `${input.address ?? ""} ${input.description ?? ""}`.toLowerCase();
  const sensitive = SENSITIVE_KEYWORDS.find((k) => haystack.includes(k));
  if (sensitive) {
    breakdown.push({ label: `Near a sensitive location (${sensitive})`, points: 10 });
  }

  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(input.createdAt).getTime()) / 86_400_000),
  );
  if (days > 0) {
    const pendingPoints = Math.min(days * 2, 12);
    breakdown.push({
      label: `Pending for ${days} ${days === 1 ? "day" : "days"}`,
      points: pendingPoints,
    });
  }

  const affected = Math.min(input.supportCount, 3) * 2;
  if (affected > 0) {
    breakdown.push({ label: "Wider affected area", points: affected });
  }

  const reopens = input.reopenCount ?? 0;
  if (reopens > 0) {
    breakdown.push({
      label: `Reopened ${reopens} ${reopens === 1 ? "time" : "times"}`,
      points: Math.min(reopens * 6, 12),
    });
  }

  const score = Math.max(
    0,
    Math.min(
      100,
      breakdown.reduce((sum, factor) => sum + factor.points, 0),
    ),
  );
  return { score, breakdown };
}

export function priorityLabel(score: number): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  if (score >= 85) return "CRITICAL";
  if (score >= 65) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}
