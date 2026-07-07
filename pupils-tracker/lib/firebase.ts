import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

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

// Save class data to user_state/{teacherId}_{classId}
export async function saveClassState(
  teacherId: string,
  classId: string,
  classData: {
    pupils: any[];
    assignments: any[];
    submissions: any;
    attendance: any;
    behavior: any[];
    watchList?: string[];
    homeworkReminders?: unknown[];
    calendarEvents?: unknown[];
    badges?: unknown[];
  }
) {
  const docRef = doc(db, "user_state", `${teacherId}_${classId}`);
  await setDoc(docRef, {
    pupils: classData.pupils || [],
    assignments: classData.assignments || [],
    submissions: classData.submissions || {},
    attendance: classData.attendance || {},
    behavior: classData.behavior || [],
    watchList: classData.watchList || [],
    homeworkReminders: classData.homeworkReminders || [],
    calendarEvents: classData.calendarEvents || [],
    badges: classData.badges || [],
  });
}

// Save metadata/classes to user_state/{teacherId}_metadata
export async function saveMetadata(
  teacherId: string,
  classes: any[],
  currentClassId: string,
  lessonPlanUrl?: string,
  classAliases?: Record<string, string>
) {
  const docRef = doc(db, "user_state", `${teacherId}_metadata`);
  await setDoc(docRef, {
    classes,
    currentClassId,
    lessonPlanUrl: lessonPlanUrl ?? "",
    classAliases: classAliases ?? {},
    // Add empty structures to satisfy Firebase Security validation rules
    pupils: [],
    assignments: [],
    submissions: {},
  });
}

// Load the complete store data from Firebase
export async function loadFullStore(teacherId: string) {
  const metaRef = doc(db, "user_state", `${teacherId}_metadata`);
  const metaSnap = await getDoc(metaRef);
  if (!metaSnap.exists()) return null;

  const metaData = metaSnap.data();
  const classes = metaData.classes || [];
  const currentClassId = metaData.currentClassId || "";
  // Left `undefined` when absent (NOT `|| ""`/`|| {}`) so callers can tell
  // "field never written (doc predates this sync)" apart from "written and
  // intentionally empty" — only the latter should overwrite a device's local
  // lessonPlanUrl/classAliases.
  const lessonPlanUrl: string | undefined =
    typeof metaData.lessonPlanUrl === "string" ? metaData.lessonPlanUrl : undefined;
  const classAliases: Record<string, string> | undefined =
    metaData.classAliases && typeof metaData.classAliases === "object"
      ? metaData.classAliases
      : undefined;

  const data: Record<string, any> = {};
  for (const c of classes) {
    const classRef = doc(db, "user_state", `${teacherId}_${c.id}`);
    const classSnap = await getDoc(classRef);
    if (classSnap.exists()) {
      const classData = classSnap.data();
      data[c.id] = {
        pupils: classData.pupils || [],
        assignments: classData.assignments || [],
        submissions: classData.submissions || {},
        attendance: classData.attendance || {},
        behavior: classData.behavior || [],
        watchList: classData.watchList || [],
        homeworkReminders: classData.homeworkReminders || [],
        calendarEvents: classData.calendarEvents || [],
        badges: classData.badges || [],
      };
    } else {
      data[c.id] = {
        pupils: [],
        assignments: [],
        submissions: {},
        attendance: {},
        behavior: [],
        watchList: [],
        homeworkReminders: [],
        calendarEvents: [],
        badges: [],
      };
    }
  }

  return { classes, currentClassId, data, lessonPlanUrl, classAliases };
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
    calendarEvents?: unknown[];
    badges?: unknown[];
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
    calendarEvents: classData.calendarEvents || [],
    badges: classData.badges || [],
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
