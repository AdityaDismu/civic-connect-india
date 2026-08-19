export const CATEGORIES = [
  "POTHOLE",
  "GARBAGE",
  "DRAINAGE",
  "WATER",
  "STREETLIGHT",
  "FOOTPATH",
  "MANHOLE",
  "FALLEN_TREE",
  "OTHER",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  POTHOLE: "Pothole / Road damage",
  GARBAGE: "Garbage overflow",
  DRAINAGE: "Drainage problem",
  WATER: "Water leakage",
  STREETLIGHT: "Broken streetlight",
  FOOTPATH: "Damaged footpath",
  MANHOLE: "Open manhole",
  FALLEN_TREE: "Fallen tree",
  OTHER: "Other civic issue",
};

export const CATEGORY_DEPARTMENT: Record<Category, string> = {
  POTHOLE: "Road Maintenance",
  FOOTPATH: "Road Maintenance",
  GARBAGE: "Waste Management",
  WATER: "Water Supply",
  DRAINAGE: "Drainage Department",
  MANHOLE: "Drainage Department",
  STREETLIGHT: "Electrical",
  FALLEN_TREE: "Garden / Disaster Response",
  OTHER: "Road Maintenance",
};

export const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const STATUSES = [
  "SUBMITTED",
  "AI_VERIFIED",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLUTION_SUBMITTED",
  "CITIZEN_VERIFICATION",
  "RESOLVED",
  "REOPENED",
  "ESCALATED",
] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  SUBMITTED: "Submitted",
  AI_VERIFIED: "AI Verified",
  ASSIGNED: "Department Assigned",
  IN_PROGRESS: "Work In Progress",
  RESOLUTION_SUBMITTED: "Resolution Submitted",
  CITIZEN_VERIFICATION: "Awaiting Your Verification",
  RESOLVED: "Resolved",
  REOPENED: "Reopened",
  ESCALATED: "Escalated",
};

/** Ordered lifecycle used by the tracking timeline. */
export const TIMELINE_STEPS: { status: Status; label: string }[] = [
  { status: "SUBMITTED", label: "Report Submitted" },
  { status: "AI_VERIFIED", label: "AI Verified" },
  { status: "ASSIGNED", label: "Department Assigned" },
  { status: "IN_PROGRESS", label: "Work In Progress" },
  { status: "RESOLUTION_SUBMITTED", label: "Resolution Evidence" },
  { status: "CITIZEN_VERIFICATION", label: "Citizen Verification" },
  { status: "RESOLVED", label: "Resolved" },
];

export const ACTIVE_STATUSES: Status[] = [
  "SUBMITTED",
  "AI_VERIFIED",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLUTION_SUBMITTED",
  "CITIZEN_VERIFICATION",
  "REOPENED",
  "ESCALATED",
];

export function statusTone(status: Status): "neutral" | "info" | "warn" | "success" | "danger" {
  switch (status) {
    case "RESOLVED":
      return "success";
    case "REOPENED":
    case "ESCALATED":
      return "danger";
    case "IN_PROGRESS":
    case "ASSIGNED":
      return "info";
    case "CITIZEN_VERIFICATION":
    case "RESOLUTION_SUBMITTED":
      return "warn";
    default:
      return "neutral";
  }
}

export function severityTone(severity: Severity): "neutral" | "info" | "warn" | "danger" {
  switch (severity) {
    case "CRITICAL":
      return "danger";
    case "HIGH":
      return "warn";
    case "MEDIUM":
      return "info";
    default:
      return "neutral";
  }
}

/** Marker colour used on every map. */
export function markerColor(status: Status, severity: Severity): string {
  if (status === "RESOLVED") return "#1f9254";
  if (status === "IN_PROGRESS" || status === "ASSIGNED" || status === "RESOLUTION_SUBMITTED")
    return "#2563eb";
  if (severity === "CRITICAL" || severity === "HIGH") return "#dc2626";
  if (severity === "MEDIUM") return "#ea8000";
  return "#64748b";
}

/** Metres between two coordinates (haversine). */
export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
