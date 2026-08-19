import { cn } from "@/lib/utils";
import { STATUS_LABELS, severityTone, statusTone, type Severity, type Status } from "@/lib/civic";
import { priorityLabel } from "@/lib/priority";

const toneClass: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-primary/10 text-primary border-primary/25",
  warn: "bg-warning/15 text-warning-foreground border-warning/40",
  success: "bg-success/12 text-success border-success/30",
  danger: "bg-destructive/12 text-destructive border-destructive/30",
};

export function Chip({
  tone = "neutral",
  className,
  children,
}: {
  tone?: keyof typeof toneClass;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  return <Chip tone={statusTone(status)}>{STATUS_LABELS[status] ?? status}</Chip>;
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Chip tone={severityTone(severity)}>{severity}</Chip>;
}

export function PriorityPill({ score }: { score: number }) {
  const label = priorityLabel(score);
  const tone =
    label === "CRITICAL"
      ? "danger"
      : label === "HIGH"
        ? "warn"
        : label === "MEDIUM"
          ? "info"
          : "neutral";
  return (
    <Chip tone={tone} className="font-semibold tabular-nums">
      Priority {score} · {label}
    </Chip>
  );
}
