// PATH: app/signup/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CA_COUNTIES, countyToCourtFinderUrl } from "@/lib/caCounties";
import {
  CaseIntake,
  EducationLevel,
  EmploymentStatus,
  EvidenceItem,
  EvidenceKind,
  EvidenceSide,
  FamilyLawRole,
  IncomeRange,
  IntakeTask,
  loadCase,
  newId,
  saveCase,
} from "@/lib/caseStore";

// ---------- IndexedDB (files) ----------
const DB_NAME = "thoxie_evidence_db";
const DB_VERSION = 1;
const STORE = "files";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, value: any) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGet(key: string) {
  const db = await openDb();
  const res = await new Promise<any>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return res;
}

async function idbDel(key: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

// ---------- UI helpers ----------
const TASKS: { id: IntakeTask; label: string; desc: string }[] = [
  { id: "start_divorce", label: "Start a divorce", desc: "You’re preparing to file." },
  { id: "respond_papers", label: "Respond to papers", desc: "You were served and need to respond." },
  { id: "prepare_hearing", label: "Prepare for a hearing", desc: "You have an upcoming court date." },
  { id: "explain_your_side", label: "Explain your side", desc: "You want to tell your story clearly and safely." },
  { id: "help_me_figure_it_out", label: "Help me figure it out", desc: "You’re not sure what to do next." },
];

const EDU_LEVELS: { id: EducationLevel; label: string }[] = [
  { id: "hs", label: "High School" },
  { id: "some_college", label: "Some College" },
  { id: "ba_bs", label: "BA/BS" },
  { id: "masters", label: "Masters" },
  { id: "jd", label: "JD" },
  { id: "phd", label: "PhD" },
  { id: "other", label: "Other" },
];

const EMPLOYMENT: { id: EmploymentStatus; label: string }[] = [
  { id: "w2", label: "W2 employee" },
  { id: "self", label: "Self-employed" },
  { id: "unemployed", label: "Unemployed" },
  { id: "retired", label: "Retired" },
  { id: "other", label: "Other" },
];

const INCOME: { id: IncomeRange; label: string }[] = [
  { id: "lt_50", label: "< $50k" },
  { id: "50_100", label: "$50k–$100k" },
  { id: "100_200", label: "$100k–$200k" },
  { id: "200_400", label: "$200k–$400k" },
  { id: "gt_400", label: "$400k+" },
  { id: "unknown", label: "Prefer not to say" },
];

const ROLE: { id: FamilyLawRole; label: string }[] = [
  { id: "petitioner", label: "I filed / will file" },
  { id: "respondent", label: "Other party filed" },
  { id: "not_sure", label: "Not sure" },
];

const EVIDENCE_KIND: { id: EvidenceKind; label: string }[] = [
  { id: "email", label: "Email" },
  { id: "text", label: "Text message" },
  { id: "pdf", label: "PDF / document" },
  { id: "photo", label: "Photo" },
  { id: "video", label: "Video" },
  { id: "other", label: "Other" },
];

const EVIDENCE_SIDE: { id: EvidenceSide; label: string }[] = [
  { id: "me", label: "My evidence" },
  { id: "them", label: "Other side evidence" },
];

function clampStr(s: string, max = 4000) {
  const t = (s || "").trim();
  return t.length > max ? t.slice(0, max) : t;
}

export default function Signup() {
  const counties = useMemo(() => CA_COUNTIES, []);
  const [caseId, setCaseId] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  // Intake
  const [task, setTask] = useState<IntakeTask>("start_divorce");
  const [county, setCounty] = useState<string>("San Mateo");
  const [role, setRole] = useState<FamilyLawRole>("not_sure");
  const [education, setEducation] = useState<EducationLevel>("ba_bs");
  const [employment, setEmployment] = useState<EmploymentStatus>("w2");
  const [income, setIncome] = useState<IncomeRange>("unknown");
  const [notes, setNotes] = useState<string>("");

  // Evidence items (metadata)
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Load latest saved case, else create new
    const existing = loadCase();
    if (existing?.id) {
      setCaseId(existing.id);
      setTask(existing.task);
      setCounty(existing.county);
      setRole(existing.role);
      setEducation(existing.education);
      setEmployment(existing.employment);
      setIncome(existing.income);
      setNotes(existing.notes || "");
      setEvidence(existing.evidence || []);
    } else {
      const id = newId();
      setCaseId(id);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const payload: CaseIntake = {
      id: caseId || newId(),
      createdAt: new Date().toISOString(),
      task,
      county,
      role,
      education,
      employment,
      income,
      notes: clampStr(notes, 8000),
      evidence,
    };
    saveCase(payload);
  }, [loaded, caseId, task, county, role, education, employment, income, notes, evidence]);

  async function addEvidence(files: FileList | null) {
    if (!files || files.length === 0) return;

    const next: EvidenceItem[] = [];
    for (const f of Array.from(files)) {
      const id = newId();
      const key = `${caseId}:${id}`;
      const buf = await f.arrayBuffer();

      await idbPut(key, {
        name: f.name,
        type: f.type || "application/octet-stream",
        size: f.size,
        data: buf,
      });

      next.push({
        id,
        name: f.name,
        kind: (inferKind(f) as EvidenceKind) || "other",
        side: "me",
        note: "",
        createdAt: new Date().toISOString(),
      });
    }

    setEvidence((prev) => [...next, ...prev]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function inferKind(f: File): EvidenceKind {
    const name = f.name.toLowerCase();
    const type = (f.type || "").toLowerCase();
    if (type.includes("pdf") || name.endsWith(".pdf")) return "pdf";
    if (type.startsWith("image/")) return "photo";
    if (type.startsWith("video/")) return "video";
    if (name.endsWith(".eml")) return "email";
    if (name.endsWith(".txt")) return "text";
    return "other";
  }

  async function removeEvidence(item: EvidenceItem) {
    const key = `${caseId}:${item.id}`;
    await idbDel(key);
    setEvidence((prev) => prev.filter((e) =>


