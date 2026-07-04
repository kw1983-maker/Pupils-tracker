// Local (per-device) storage for the uploaded lesson-plan workbook bytes.
// The parsed plan + the sheet URL live in the app store (localStorage/cloud),
// but the raw .xlsx is binary and stays here in IndexedDB — never synced.

const DB_NAME = "pupil-tracker-lesson-plan";
const STORE = "workbook";
const KEY = "current";

export interface StoredWorkbook {
  fileName: string;
  bytes: ArrayBuffer;
  savedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveWorkbook(
  fileName: string,
  bytes: ArrayBuffer
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(
      { fileName, bytes, savedAt: Date.now() } as StoredWorkbook,
      KEY
    );
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadWorkbook(): Promise<StoredWorkbook | null> {
  const db = await openDb();
  const result = await new Promise<StoredWorkbook | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve((req.result as StoredWorkbook) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function clearWorkbook(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
