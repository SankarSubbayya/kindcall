// Photon / Spectrum outbound messaging — delivers family alerts over
// WhatsApp / iMessage / SMS. Gated on env vars so KindCall runs without
// credentials (it logs + stores the alert instead of sending).

export interface SendResult {
  sent: boolean;
  channel: string;
  detail?: string;
}

export async function sendSpectrumMessage(args: { to?: string; text: string }): Promise<SendResult> {
  const apiKey = process.env.PHOTON_API_KEY;
  const endpoint = process.env.PHOTON_ENDPOINT;
  const channel = process.env.PHOTON_CHANNEL || "whatsapp";

  if (!apiKey || !endpoint || !args.to) {
    console.log(`[KindCall][alert:not-sent] (${channel}) -> ${args.to ?? "no-contact"}:\n${args.text}`);
    return { sent: false, channel: "log", detail: "Photon not configured (set PHOTON_API_KEY + PHOTON_ENDPOINT)" };
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ channel, to: args.to, text: args.text }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { sent: false, channel, detail: `Spectrum send failed: ${res.status} ${detail}`.trim() };
    }
    return { sent: true, channel };
  } catch (e) {
    return { sent: false, channel, detail: String((e as Error)?.message ?? e) };
  }
}
