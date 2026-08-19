import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  formatDateTime,
  type Category,
  type Status,
} from "@/lib/civic";

export type ReceiptData = {
  displayId: string;
  title: string;
  category: string;
  description: string;
  severity: string;
  priority: number;
  address: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  status: string;
  department: string;
  trackingUrl: string;
  reporter: string;
};

export async function downloadComplaintReceipt(data: ReceiptData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;

  // Header band
  doc.setFillColor(13, 91, 102);
  doc.rect(0, 0, W, 92, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("CivicPulse AI", M, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("REPORT IT.  PRIORITIZE IT.  TRACK IT.  VERIFY IT.", M, 62);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("COMPLAINT RECEIPT", W - M, 44, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Issued ${formatDateTime(new Date().toISOString())}`, W - M, 62, { align: "right" });

  let y = 128;
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(data.displayId, M, y);
  doc.setFontSize(12);
  y += 20;
  const titleLines = doc.splitTextToSize(data.title, W - M * 2 - 130);
  doc.text(titleLines, M, y);
  y += titleLines.length * 15 + 8;

  // QR code
  try {
    const qr = await QRCode.toDataURL(data.trackingUrl, { margin: 1, width: 320 });
    doc.addImage(qr, "PNG", W - M - 110, 118, 110, 110);
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    doc.text("Scan to track this report", W - M - 55, 238, { align: "center" });
  } catch {
    /* QR is optional */
  }

  y = Math.max(y, 252);
  doc.setDrawColor(220, 224, 226);
  doc.line(M, y, W - M, y);
  y += 24;

  const rows: Array<[string, string]> = [
    ["Issue / Category", CATEGORY_LABELS[data.category as Category] ?? data.category],
    ["Severity", data.severity],
    ["Priority score", `${data.priority} / 100`],
    ["Current status", STATUS_LABELS[data.status as Status] ?? data.status],
    ["Assigned department", data.department || "Pending assignment"],
    ["Location", data.address || "Not provided"],
    ["Coordinates", `${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}`],
    ["Submitted on", formatDateTime(data.createdAt)],
    ["Reported by", data.reporter],
    ["Tracking reference", data.trackingUrl],
  ];

  for (const [label, value] of rows) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(90, 100, 105);
    doc.text(label.toUpperCase(), M, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(value, W - M * 2 - 170);
    doc.text(lines, M + 170, y);
    y += Math.max(lines.length * 14, 14) + 12;
  }

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(90, 100, 105);
  doc.text("DESCRIPTION", M, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  const desc = doc.splitTextToSize(data.description || "No description provided.", W - M * 2);
  doc.text(desc, M, y);
  y += desc.length * 14 + 24;

  doc.setDrawColor(220, 224, 226);
  doc.line(M, y, W - M, y);
  y += 18;
  doc.setFontSize(8.5);
  doc.setTextColor(120, 128, 132);
  const footer = doc.splitTextToSize(
    "This receipt confirms that your civic report was recorded by CivicPulse AI. Keep the complaint ID for follow-up. Status shown reflects the report at the time of download; scan the QR code for the live status.",
    W - M * 2,
  );
  doc.text(footer, M, y);

  doc.save(`${data.displayId}-civicpulse-receipt.pdf`);
}
