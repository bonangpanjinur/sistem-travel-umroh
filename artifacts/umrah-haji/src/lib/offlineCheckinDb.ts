const DB_NAME = "vinstour_offline_checkin";
const DB_VERSION = 1;

export interface OfflineJamaah {
  id: string;
  customer_id: string;
  full_name: string;
  passport_number: string | null;
  phone: string | null;
  gender: string | null;
  booking_code: string;
  departure_id: string;
  checkin_status: string | null;
}

export interface OfflineCheckinEvent {
  id: string;
  passenger_id: string;
  customer_id: string;
  departure_id: string;
  checkpoint: string;
  scanned_at: string;
  synced: boolean;
  full_name: string;
}

export interface OfflineMeta {
  departure_id: string;
  departure_label: string;
  synced_at: string;
  count: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("jamaah")) {
        const store = db.createObjectStore("jamaah", { keyPath: "id" });
        store.createIndex("departure_id", "departure_id", { unique: false });
        store.createIndex("customer_id", "customer_id", { unique: false });
      }
      if (!db.objectStoreNames.contains("checkin_queue")) {
        const qs = db.createObjectStore("checkin_queue", { keyPath: "id" });
        qs.createIndex("departure_id", "departure_id", { unique: false });
        qs.createIndex("synced", "synced", { unique: false });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "departure_id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveJamaahOffline(
  departureId: string,
  departureLabel: string,
  jamaahList: OfflineJamaah[]
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["jamaah", "meta"], "readwrite");
    const store = tx.objectStore("jamaah");
    const metaStore = tx.objectStore("meta");
    jamaahList.forEach((j) => store.put(j));
    metaStore.put({
      departure_id: departureId,
      departure_label: departureLabel,
      synced_at: new Date().toISOString(),
      count: jamaahList.length,
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getJamaahByDeparture(departureId: string): Promise<OfflineJamaah[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("jamaah", "readonly");
    const idx = tx.objectStore("jamaah").index("departure_id");
    const req = idx.getAll(departureId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function findJamaahByCode(
  departureId: string,
  code: string
): Promise<OfflineJamaah | null> {
  const list = await getJamaahByDeparture(departureId);
  const q = code.trim().toLowerCase();
  return (
    list.find(
      (j) =>
        j.booking_code.toLowerCase() === q ||
        (j.passport_number && j.passport_number.toLowerCase() === q) ||
        j.full_name.toLowerCase().includes(q)
    ) || null
  );
}

export async function queueCheckin(event: Omit<OfflineCheckinEvent, "id">): Promise<string> {
  const db = await openDb();
  const id = `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return new Promise((resolve, reject) => {
    const tx = db.transaction("checkin_queue", "readwrite");
    tx.objectStore("checkin_queue").put({ ...event, id, synced: false });
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingQueue(departureId?: string): Promise<OfflineCheckinEvent[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("checkin_queue", "readonly");
    const store = tx.objectStore("checkin_queue");
    const req = store.getAll();
    req.onsuccess = () => {
      let result: OfflineCheckinEvent[] = req.result || [];
      if (departureId) result = result.filter((e) => e.departure_id === departureId);
      resolve(result.filter((e) => !e.synced));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function markSynced(ids: string[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("checkin_queue", "readwrite");
    const store = tx.objectStore("checkin_queue");
    ids.forEach((id) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        if (getReq.result) store.put({ ...getReq.result, synced: true });
      };
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMetaList(): Promise<OfflineMeta[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("meta", "readonly");
    const req = tx.objectStore("meta").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function clearDepartureData(departureId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["jamaah", "checkin_queue", "meta"], "readwrite");
    const jamaahIdx = tx.objectStore("jamaah").index("departure_id");
    const jamaahReq = jamaahIdx.getAllKeys(departureId);
    jamaahReq.onsuccess = () => {
      (jamaahReq.result || []).forEach((k) => tx.objectStore("jamaah").delete(k));
    };
    const queueIdx = tx.objectStore("checkin_queue").index("departure_id");
    const queueReq = queueIdx.getAllKeys(departureId);
    queueReq.onsuccess = () => {
      (queueReq.result || []).forEach((k) => tx.objectStore("checkin_queue").delete(k));
    };
    tx.objectStore("meta").delete(departureId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
