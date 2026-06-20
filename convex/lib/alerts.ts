// Decide whether a structured note should page the family, and format the message
// that Photon/Spectrum delivers over WhatsApp / iMessage / SMS.

import type { StructuredNote } from "./domain";

/** High or critical urgency pages the family. */
export function shouldAlert(note: StructuredNote): boolean {
  return note.urgency === "high" || note.urgency === "critical";
}

export function buildAlertMessage(patientName: string, note: StructuredNote): string {
  const icon = note.urgency === "critical" ? "🚨" : "⚠️";
  const lines = [`${icon} KindCall alert for ${patientName}`];

  if (note.summary) lines.push(note.summary);
  if (note.serviceRequests.length) {
    lines.push(`Needs: ${note.serviceRequests.map((s) => s.label).join(", ")}`);
  }
  if (note.concerns.length) {
    lines.push(`Concerns: ${note.concerns.join(", ")}`);
  }
  lines.push(
    note.urgency === "critical"
      ? "Please respond immediately."
      : "Please check in when you can.",
  );
  return lines.join("\n");
}
