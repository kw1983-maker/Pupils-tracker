import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import type { Class, LessonMaterial } from "./types";

const firebaseConfig = {
  apiKey: "AIzaSyC4wnHVQQ7NMmGOjHSBzii4hNZB9wJPPx0",
  authDomain: "pupils-tracking-1a57c.firebaseapp.com",
  projectId: "pupils-tracking-1a57c",
  storageBucket: "pupils-tracking-1a57c.firebasestorage.app",
  messagingSenderId: "457836186520",
  appId: "1:457836186520:web:9ad909fba59605eb7bf9ed"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
export const auth = getAuth(app);

// Save metadata/classes to user_state/{teacherId}_metadata
export async function saveMetadata(
  teacherId: string,
  classes: any[],
  currentClassId: string,
  lessonPlanUrl?: string,
  classAliases?: Record<string, string>,
  pbdSheetUrls?: Record<string, string>,
  lessonMaterials?: LessonMaterial[],
  pbdPjSheetUrls?: Record<string, string>
) {
  const docRef = doc(db, "user_state", `${teacherId}_metadata`);
  await setDoc(docRef, {
    classes,
    currentClassId,
    lessonPlanUrl: lessonPlanUrl ?? "",
    classAliases: classAliases ?? {},
    pbdSheetUrls: pbdSheetUrls ?? {},
    pbdPjSheetUrls: pbdPjSheetUrls ?? {},
    lessonMaterials: lessonMaterials ?? [],
    // Add empty structures to satisfy Firebase Security validation rules
    pupils: [],
    assignments: [],
    submissions: {},
  });
}

// Shape a raw user_state/{teacherId}_metadata doc. Optional fields are left
// `undefined` when absent (NOT `|| ""`/`|| {}`) so callers can tell "field
// never written (doc predates this sync)" apart from "written and
// intentionally empty" — only the latter should overwrite a device's local
// lessonPlanUrl/classAliases.
function normalizeMetaDoc(metaData: DocumentData) {
  const lessonPlanUrl: string | undefined =
    typeof metaData.lessonPlanUrl === "string" ? metaData.lessonPlanUrl : undefined;
  const classAliases: Record<string, string> | undefined =
    metaData.classAliases && typeof metaData.classAliases === "object"
      ? metaData.classAliases
      : undefined;
  const pbdSheetUrls: Record<string, string> | undefined =
    metaData.pbdSheetUrls && typeof metaData.pbdSheetUrls === "object"
      ? metaData.pbdSheetUrls
      : undefined;
  const pbdPjSheetUrls: Record<string, string> | undefined =
    metaData.pbdPjSheetUrls && typeof metaData.pbdPjSheetUrls === "object"
      ? metaData.pbdPjSheetUrls
      : undefined;
  const lessonMaterials: LessonMaterial[] | undefined = Array.isArray(
    metaData.lessonMaterials
  )
    ? metaData.lessonMaterials
    : undefined;
  return {
    classes: (metaData.classes || []) as Class[],
    currentClassId: (metaData.currentClassId || "") as string,
    lessonPlanUrl,
    classAliases,
    pbdSheetUrls,
    pbdPjSheetUrls,
    lessonMaterials,
  };
}

export type CloudMetadata = ReturnType<typeof normalizeMetaDoc>;

// Shape a raw user_state/{teacherId}_{classId} doc into ClassData.
export function normalizeClassDoc(classData: DocumentData) {
  return {
    pupils: classData.pupils || [],
    assignments: classData.assignments || [],
    submissions: classData.submissions || {},
    attendance: classData.attendance || {},
    behavior: classData.behavior || [],
    watchList: classData.watchList || [],
    homeworkReminders: classData.homeworkReminders || [],
    // undefined when the cloud doc predates this field — callers can keep
    // local nextSpelling instead of wiping it on first sync after deploy.
    nextSpelling:
      classData.nextSpelling !== undefined ? classData.nextSpelling : undefined,
    calendarEvents: classData.calendarEvents || [],
    badges: classData.badges || [],
    remedialScores: classData.remedialScores || [],
    // undefined when the cloud doc predates this field — callers can keep
    // local purchases instead of wiping them on first sync after deploy.
    petPurchases: Array.isArray(classData.petPurchases)
      ? classData.petPurchases
      : undefined,
  };
}

// Load user_state/{teacherId}_metadata, or null for a brand-new account.
// Class docs are loaded by loadFullStore in lib/class-sync.ts.
export async function loadMetadata(teacherId: string) {
  const metaSnap = await getDoc(doc(db, "user_state", `${teacherId}_metadata`));
  return metaSnap.exists() ? normalizeMetaDoc(metaSnap.data()) : null;
}

// Live updates for the metadata doc, so edits made on another device (class
// list, sheet links, …) show up here without a reload. Snapshots that are
// just this device's own not-yet-acknowledged write are skipped.
export function subscribeMetadata(
  teacherId: string,
  onChange: (meta: CloudMetadata) => void
): Unsubscribe {
  const metaRef = doc(db, "user_state", `${teacherId}_metadata`);
  return onSnapshot(
    metaRef,
    (snap) => {
      if (snap.metadata.hasPendingWrites || !snap.exists()) return;
      onChange(normalizeMetaDoc(snap.data()));
    },
    (err) => console.error("Metadata listener error:", err)
  );
}

// Live updates for one class doc — marks/points entered on another device
// arrive here within a second or two. Own pending writes are NOT skipped: a
// snapshot taken while this device's write is in flight can also carry
// another device's change, and Firestore wouldn't raise it again after the
// ack. The store re-applies unsaved local changes on top instead.
// `data.behavior` is only the live part; see withArchives in class-sync.ts.
export function subscribeClassState(
  teacherId: string,
  classId: string,
  onChange: (
    data: ReturnType<typeof normalizeClassDoc>,
    archiveCount: number
  ) => void
): Unsubscribe {
  const classRef = doc(db, "user_state", `${teacherId}_${classId}`);
  return onSnapshot(
    classRef,
    (snap) => {
      if (!snap.exists()) return;
      const raw = snap.data();
      // archiveCount is bumped whenever older points move to archive docs
      // (lib/class-sync.ts), telling listeners to reload the archives.
      onChange(normalizeClassDoc(raw), Number(raw.archiveCount) || 0);
    },
    (err) => console.error("Class listener error:", err)
  );
}

// "Log out other devices" signal: user_state/{uid}_sessions. Every device
// watches it and signs itself out when revokedAt is later than its own
// sign-in, unless it is keepDeviceId (the device that pressed the button).
// App-enforced only — the client SDK can't revoke other sessions itself.
export async function revokeOtherSessions(uid: string, keepDeviceId: string) {
  await setDoc(doc(db, "user_state", `${uid}_sessions`), {
    revokedAt: serverTimestamp(),
    keepDeviceId,
    // Empty structures every user_state doc carries for the security rules.
    pupils: [],
    assignments: [],
    submissions: {},
  });
}

export function subscribeSessionRevocation(
  uid: string,
  onChange: (signal: { revokedAtMs: number; keepDeviceId: string }) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, "user_state", `${uid}_sessions`),
    (snap) => {
      // Skip our own pending write: revokedAt is only a placeholder until the
      // server fills in its timestamp.
      if (!snap.exists() || snap.metadata.hasPendingWrites) return;
      const data = snap.data();
      if (!(data.revokedAt instanceof Timestamp)) return;
      onChange({
        revokedAtMs: data.revokedAt.toMillis(),
        keepDeviceId: String(data.keepDeviceId ?? ""),
      });
    },
    (err) => console.error("Session listener error:", err)
  );
}

// Board remote: user_state/{uid}_remote holds the latest command sent from one
// device (e.g. the phone) for the others (e.g. the projector) to carry out.
// Each send overwrites it; cmdId tells a new command from a re-delivered one.
export async function sendRemoteCommand(
  uid: string,
  sentBy: string,
  command: Record<string, unknown>
) {
  await setDoc(doc(db, "user_state", `${uid}_remote`), {
    command,
    cmdId: Math.random().toString(36).slice(2),
    sentBy,
    sentAt: serverTimestamp(),
    // Empty structures every user_state doc carries for the security rules.
    pupils: [],
    assignments: [],
    submissions: {},
  });
}

// Calls back for each NEW command. The first snapshot (whatever was sent
// before this device started listening) and this device's own sends are
// skipped, so opening the app never replays an old command.
export function subscribeRemoteCommands(
  uid: string,
  deviceId: string,
  onCommand: (command: Record<string, unknown>) => void
): Unsubscribe {
  let first = true;
  let lastId: string | null = null;
  return onSnapshot(
    doc(db, "user_state", `${uid}_remote`),
    (snap) => {
      const data = snap.exists() ? snap.data() : null;
      const cmdId = data ? String(data.cmdId ?? "") : null;
      // The baseline must be the server's copy: an early cache-only snapshot
      // (e.g. while offline) would make an old command look new later.
      if (first && snap.metadata.fromCache) return;
      if (first) {
        first = false;
        lastId = cmdId;
        return;
      }
      if (!data || !cmdId || cmdId === lastId) return;
      lastId = cmdId;
      if (data.sentBy === deviceId || !data.command) return;
      onCommand(data.command as Record<string, unknown>);
    },
    (err) => console.error("Remote listener error:", err)
  );
}

// Save a historical snapshot to history/{historyId}
export async function saveHistoryRecord(
  teacherId: string,
  classId: string,
  className: string,
  name: string,
  classData: {
    pupils: any[];
    assignments: any[];
    submissions: any;
    attendance: any;
    behavior: any[];
    watchList?: string[];
    homeworkReminders?: unknown[];
    nextSpelling?: unknown;
    calendarEvents?: unknown[];
    badges?: unknown[];
    remedialScores?: unknown[];
    petPurchases?: unknown[];
  }
) {
  const timestamp = new Date().toISOString();
  const historyId = `${teacherId}_${classId}_${Date.now()}`;
  const docRef = doc(db, "history", historyId);
  await setDoc(docRef, {
    id: historyId,
    name: `${className} - ${name}`,
    timestamp,
    pupils: classData.pupils || [],
    assignments: classData.assignments || [],
    submissions: classData.submissions || {},
    attendance: classData.attendance || {},
    behavior: classData.behavior || [],
    watchList: classData.watchList || [],
    homeworkReminders: classData.homeworkReminders || [],
    nextSpelling: classData.nextSpelling ?? null,
    calendarEvents: classData.calendarEvents || [],
    badges: classData.badges || [],
    remedialScores: classData.remedialScores || [],
    petPurchases: classData.petPurchases || [],
  });
}

// Retrieve all historical snapshots for this teacher key
export async function fetchHistoryRecords(teacherId: string) {
  const colRef = collection(db, "history");
  const snap = await getDocs(colRef);
  return snap.docs
    .map((d) => d.data())
    .filter((r) => r.id && r.id.startsWith(`${teacherId}_`))
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}

// Delete a historical snapshot
export async function deleteHistoryRecord(historyId: string) {
  const docRef = doc(db, "history", historyId);
  await deleteDoc(docRef);
}

export { db };
