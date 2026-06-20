// KindCall domain model.
// Ported from CareCompanion's call_analyzer.py + models/senior.py so the
// structured care note speaks the same clinical vocabulary as the original project.

export type Urgency = "normal" | "high" | "critical";
export type Mood = "happy" | "neutral" | "sad" | "concerning" | "unknown";

export interface ServiceCategory {
  type: string;
  label: string;
  defaultUrgency: Urgency;
  phrases: string[];
}

// The service requests a caregiver might capture in a note.
export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    type: "shower_help",
    label: "Shower / Bathing Help",
    defaultUrgency: "normal",
    phrases: ["shower", "bath", "bathing", "help washing", "help me wash", "need help cleaning", "can't shower", "washing up"],
  },
  {
    type: "medicine_need",
    label: "Medicine / Prescription",
    defaultUrgency: "high",
    phrases: ["need medicine", "ran out of", "prescription", "refill", "pharmacy", "need my pills", "out of medication", "need medication", "drug store"],
  },
  {
    type: "food_order",
    label: "Food / Meal Help",
    defaultUrgency: "normal",
    phrases: ["hungry", "need food", "order food", "groceries", "grocery", "meal", "breakfast", "lunch", "dinner", "can't cook", "need to eat", "delivery"],
  },
  {
    type: "mail_help",
    label: "Mail / Package Help",
    defaultUrgency: "normal",
    phrases: ["mail", "mailbox", "letter", "package", "post office", "send mail", "check mail", "pick up mail", "postal", "envelope", "stamp"],
  },
  {
    type: "medical_emergency",
    label: "Medical Emergency",
    defaultUrgency: "critical",
    phrases: ["chest pain", "can't breathe", "stroke", "heart attack", "ambulance", "911", "emergency", "bleeding badly", "unconscious", "severe pain", "hospital"],
  },
  {
    type: "transportation",
    label: "Transportation",
    defaultUrgency: "normal",
    phrases: ["ride", "drive", "appointment", "doctor visit", "need a ride", "can't drive", "pick me up", "taxi", "uber"],
  },
  {
    type: "companionship",
    label: "Companionship / Social",
    defaultUrgency: "normal",
    phrases: ["lonely", "alone", "no one", "nobody", "someone to talk", "visit me", "company", "miss my family", "bored"],
  },
];

export const CATEGORY_TYPES: string[] = SERVICE_CATEGORIES.map((c) => c.type);

export const POSITIVE_WORDS: string[] = [
  "good", "great", "fine", "wonderful", "happy", "well", "better",
  "fantastic", "lovely", "okay", "excellent", "nice",
];

export const NEGATIVE_WORDS: string[] = [
  "bad", "terrible", "awful", "pain", "hurt", "sick", "tired",
  "lonely", "sad", "depressed", "worried", "confused", "dizzy",
  "weak", "worse", "struggling",
];

export const EMERGENCY_WORDS: string[] = [
  "fall", "fell", "fallen", "chest pain", "can't breathe",
  "breathing", "emergency", "help me", "ambulance", "911",
  "stroke", "heart attack", "unconscious", "bleeding",
];

export interface ServiceRequest {
  type: string;
  label: string;
  urgency: Urgency;
}

export interface StructuredNote {
  summary: string;
  mood: Mood;
  wellnessScore: number; // 1-10
  medicationTaken: boolean | null;
  concerns: string[];
  serviceRequests: ServiceRequest[];
  urgency: Urgency;
  actionItems: string[];
}

const URGENCY_RANK: Record<Urgency, number> = { normal: 0, high: 1, critical: 2 };

/** Return the most severe urgency in the list (defaults to "normal"). */
export function maxUrgency(list: Urgency[]): Urgency {
  return list.reduce<Urgency>((acc, u) => (URGENCY_RANK[u] > URGENCY_RANK[acc] ? u : acc), "normal");
}

export function labelForCategory(type: string, fallback?: string): string {
  const cat = SERVICE_CATEGORIES.find((c) => c.type === type);
  if (cat) return cat.label;
  return typeof fallback === "string" && fallback.length ? fallback : type;
}
