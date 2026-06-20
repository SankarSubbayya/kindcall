import { useEffect, useRef, useState } from "react";

// Hook around the browser Web Speech API. Reports errors (instead of failing
// silently), keeps listening through Chrome's silence auto-stop, and appends to
// whatever is already in the box. Falls back to typing / Voice Cursor when the
// API is missing (Firefox) or blocked.
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

export function useDictation() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const wantRef = useRef(false); // user intends to keep listening
  const finalRef = useRef(""); // committed text so far

  useEffect(() => {
    const Ctor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    setSupported(true);

    const rec: SpeechRecognitionLike = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onstart = () => {
      setListening(true);
      setError(null);
    };

    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalRef.current += res[0].transcript;
        else interim += res[0].transcript;
      }
      setTranscript((finalRef.current + interim).replace(/\s+/g, " ").trimStart());
    };

    rec.onerror = (event: any) => {
      const code = event?.error ?? "unknown";
      if (code === "not-allowed" || code === "service-not-allowed") {
        wantRef.current = false;
        setError(
          "Microphone is blocked. Click the 🔒/aA in the address bar → allow Microphone for this site, then reload and try again.",
        );
      } else if (code === "no-speech") {
        setError("Didn't catch anything — try speaking a bit louder.");
      } else if (code === "audio-capture") {
        setError("No microphone found. Check your input device.");
      } else if (code !== "aborted") {
        setError(`Speech recognition error: ${code}`);
      }
    };

    rec.onend = () => {
      // Chrome ends the session after a pause; restart if the user hasn't stopped.
      if (wantRef.current) {
        try {
          rec.start();
          return;
        } catch {
          /* fall through to stop */
        }
      }
      setListening(false);
    };

    recRef.current = rec;
    return () => {
      wantRef.current = false;
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const start = () => {
    if (!recRef.current) return;
    setError(null);
    // Keep any text already typed/dictated, then append speech to it.
    finalRef.current = transcript ? transcript.trimEnd() + " " : "";
    wantRef.current = true;
    try {
      recRef.current.start();
      setListening(true);
    } catch {
      // start() throws if already running — that's fine.
    }
  };

  const stop = () => {
    wantRef.current = false;
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  };

  return { supported, listening, transcript, setTranscript, error, start, stop };
}
