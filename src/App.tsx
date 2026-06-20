import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { useDictation } from "./lib/speech";

const URGENCY_STYLE: Record<string, { bg: string; label: string }> = {
  normal: { bg: "#1f6f3f", label: "Normal" },
  high: { bg: "#b8860b", label: "High" },
  critical: { bg: "#b00020", label: "Critical" },
};

export default function App() {
  const patients = useQuery(api.patients.list);
  const seed = useMutation(api.patients.seed);
  const dictate = useMutation(api.careNotes.dictate);

  const [patientId, setPatientId] = useState<Id<"patients"> | null>(null);
  const [author, setAuthor] = useState("Caregiver");

  useEffect(() => {
    if (patients && patients.length === 0) void seed();
  }, [patients, seed]);

  useEffect(() => {
    if (!patientId && patients && patients.length > 0) setPatientId(patients[0]._id);
  }, [patients, patientId]);

  const notes = useQuery(api.careNotes.listByPatient, patientId ? { patientId } : "skip");
  const alerts = useQuery(api.careNotes.alertsByPatient, patientId ? { patientId } : "skip");

  const { supported, listening, transcript, setTranscript, error, start, stop } = useDictation();

  const EXAMPLES: { label: string; text: string }[] = [
    { label: "Critical", text: "She had chest pain and we need an ambulance right away" },
    { label: "Medication", text: "She forgot her pills and we ran out of her blood pressure medication" },
    { label: "Calm", text: "She was happy and feeling great today, we had a lovely chat" },
  ];

  const selectedPatient = useMemo(
    () => patients?.find((p) => p._id === patientId) ?? null,
    [patients, patientId],
  );

  const submit = async () => {
    if (!patientId || !transcript.trim()) return;
    await dictate({ patientId, author, transcript });
    setTranscript("");
  };

  return (
    <div className="app">
      <header>
        <h1>KindCall</h1>
        <p className="tag">Dictate a care note → structured, scored &amp; family-alerted in realtime.</p>
        <p className="sponsors">Voice Cursor · Convex · Respan · Photon</p>
      </header>

      <nav className="patients">
        {patients?.map((p) => (
          <button
            key={p._id}
            className={p._id === patientId ? "tab active" : "tab"}
            onClick={() => setPatientId(p._id)}
          >
            {p.name}
          </button>
        ))}
      </nav>

      {selectedPatient && (
        <div className="contactbar">
          <span>
            <b>Family contact:</b> {selectedPatient.emergencyContactName ?? "—"}
            {selectedPatient.emergencyContactPhone ? ` · ${selectedPatient.emergencyContactPhone}` : ""}
          </span>
          {selectedPatient.medications?.length > 0 && (
            <span><b>Meds:</b> {selectedPatient.medications.join(", ")}</span>
          )}
        </div>
      )}

      <section className="card dictate">
        <h2>Dictate a care note{selectedPatient ? ` for ${selectedPatient.name}` : ""}</h2>
        <input
          className="author"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Your name"
        />
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder={
            supported
              ? "Tap the mic and speak, or dictate here with Voice Cursor…"
              : "Dictate here with Voice Cursor, or type…"
          }
          rows={4}
        />
        <div className="examples">
          <span className="examples-label">Quick fill:</span>
          {EXAMPLES.map((ex) => (
            <button key={ex.label} className="chip" onClick={() => setTranscript(ex.text)}>
              {ex.label}
            </button>
          ))}
        </div>
        <div className="row">
          {supported && (
            <button className={listening ? "mic listening" : "mic"} onClick={listening ? stop : start}>
              {listening ? "● Stop" : "🎙 Speak"}
            </button>
          )}
          <button className="submit" onClick={submit} disabled={!transcript.trim() || !patientId}>
            Save note
          </button>
        </div>
        {error && <p className="hint error">{error}</p>}
        {!supported && (
          <p className="hint">In-app mic not available in this browser — use the Quick fill buttons, type, or dictate with Voice Cursor.</p>
        )}
        {supported && !error && (
          <p className="hint">Tip: 🎙 Speak needs Chrome/Edge + mic permission. Or use Quick fill / Voice Cursor.</p>
        )}
      </section>

      {selectedPatient && (
        <section className="phone-wrap">
          <h2 className="alerts-title">🔔 Family notifications</h2>
          <div className="phone">
            <div className="phone-top">
              <div className="avatar">
                {(selectedPatient.emergencyContactName ?? "F").charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="contact-name">{selectedPatient.emergencyContactName ?? "Family contact"}</div>
                <div className="contact-sub">
                  KindCall · {selectedPatient.emergencyContactPhone ?? "no number"} · WhatsApp
                </div>
              </div>
            </div>
            <div className="phone-body">
              {(!alerts || alerts.length === 0) && (
                <div className="bubble-empty">
                  No urgent alerts yet. Calm notes don't page the family — dictate something urgent.
                </div>
              )}
              {alerts?.map((a) => (
                <div key={a._id} className={a.urgency === "critical" ? "bubble crit" : "bubble"}>
                  <pre>{a.message}</pre>
                  <div className="bubble-meta">
                    {a.sent ? `Delivered via ${a.channel}` : "Logged · live send when Photon is configured"}
                    {" · "}
                    {new Date(a._creationTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="feed">
        <h2>Care notes</h2>
        {!notes && <p>Loading…</p>}
        {notes?.length === 0 && <p>No notes yet — dictate the first one above.</p>}
        {notes?.map((n) => {
          const u = n.urgency ?? "normal";
          return (
            <article key={n._id} className="card note">
              <div className="note-head">
                <span className="badge" style={{ background: URGENCY_STYLE[u]?.bg }}>
                  {URGENCY_STYLE[u]?.label}
                </span>
                <span className="author-name">{n.author}</span>
                {n.status === "processing" && <span className="proc">structuring…</span>}
                {n.source && <span className="source">{n.source === "respan" ? "Respan ✓" : "heuristic"}</span>}
              </div>
              <p className="raw">“{n.normalized || n.rawTranscript}”</p>
              {n.summary && <p className="summary">{n.summary}</p>}
              <div className="meta">
                {n.mood && <span>Mood: {n.mood}</span>}
                {typeof n.wellnessScore === "number" && <span>Wellness: {n.wellnessScore}/10</span>}
                {n.medicationTaken === true && <span>Meds: taken</span>}
                {n.medicationTaken === false && <span className="warn">Meds: NOT taken</span>}
                {typeof n.evalScore === "number" && (
                  <span className={n.evalPass ? "eval ok" : "eval bad"}>
                    Faithfulness: {(n.evalScore * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              {n.serviceRequests && n.serviceRequests.length > 0 && (
                <ul className="needs">
                  {n.serviceRequests.map((s, i) => (
                    <li key={i}>{s.label}</li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </section>

      <footer className="stack">
        <span><b>Voice Cursor</b> — voice dictation</span>
        <span><b>Respan</b> — AI structuring + faithfulness evals</span>
        <span><b>Convex</b> — realtime backend &amp; database</span>
        <span><b>Photon</b> — family alerts (WhatsApp/iMessage)</span>
      </footer>
    </div>
  );
}
