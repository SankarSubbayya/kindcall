# KindCall 🎙️💙

**Dictate a care note → it's structured, scored, and the family is alerted — in realtime.**

KindCall is a voice-first care-coordination tool for seniors and people with
disabilities. A caregiver speaks a free-form note ("she seemed tired, forgot her
pills, and we're out of her blood-pressure meds"). KindCall transcribes it,
turns it into a structured clinical record, scores its own faithfulness, and — if
it's urgent — pages the family on their phone. No keyboard required.

Built for the **Voice Cursor × Photon × Convex × Respan** mini-hackathon, porting
the care domain model from [CareCompanion](../BetaFund-CareCompanion).

---

## How it uses every sponsor

| Sponsor | Role in KindCall |
| --- | --- |
| **Voice Cursor** | The dictation layer. Caregivers speak the note hands-free (and we built KindCall hands-free too). The in-app mic uses the Web Speech API as a fallback. |
| **Convex** | Reactive backend + source of truth. Dictate a note and the dashboard, structured fields, and alerts update **live** — no refresh. |
| **Respan** | Every LLM call (structuring + the LLM-as-judge faithfulness eval) runs through the Respan gateway, so each note is fully traced and graded. Mis-structuring a senior's meds is safety-critical — Respan is how we catch it. |
| **Photon (Spectrum)** | Urgent notes page the family over WhatsApp / iMessage / SMS, where they actually look. |

## The "dictate a care note" flow

```
🎙️ caregiver speaks
   │  Voice Cursor / Web Speech API
   ▼
Convex mutation (dictate)  ──►  note stored, status: processing  ──►  UI updates live
   │
   ▼  scheduled action
Respan gateway: structure the note  ──►  {summary, mood, wellness, meds, concerns,
   │                                       serviceRequests, urgency, actionItems}
   ▼
Respan gateway: LLM-as-judge faithfulness eval  ──►  score 0–1
   │
   ▼  if urgency is high/critical
Photon/Spectrum  ──►  WhatsApp alert to the family
```

If no `RESPAN_API_KEY` is set (or the call fails), KindCall falls back to a
deterministic `heuristicStructure()` — ported from CareCompanion's
`call_analyzer.py` — so the demo always works.

## Care categories (ported from CareCompanion)

`shower_help` · `medicine_need` (high) · `food_order` · `mail_help` ·
`medical_emergency` (**critical**) · `transportation` · `companionship`

## Stack

Vite + React + TypeScript · Convex · Vitest. Pure logic lives in
[`convex/lib/`](convex/lib) (framework-free, fully unit-tested); Convex functions
are thin wrappers.

## Run it

```bash
npm install
npm test                 # 21 unit tests, no keys needed

# Live app:
npx convex dev           # logs you in (browser) + generates convex/_generated
npm run dev              # open the printed localhost URL
```

Configure keys in Convex (not just `.env.local`):

```bash
npx convex env set RESPAN_API_KEY <key>
npx convex env set KINDCALL_MODEL claude-sonnet-4-6
# optional — real family alerts:
npx convex env set PHOTON_API_KEY <key>
npx convex env set PHOTON_ENDPOINT <spectrum-send-url>
```

See [`.env.local.example`](.env.local.example) for the full list and
[`hackathon.toml`](hackathon.toml) for the event plan.

## Tests

```bash
npm test          # run once
npm run test:watch
```

Covers: the Respan client request/response, transcript normalization, care-note
parsing + the heuristic fallback, the faithfulness eval parser, and the family
alert logic.
