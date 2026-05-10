import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface QueuedAction {
  id: string;
  type: string;
  label: string;
  payload: unknown;
  url?: string;
  queuedAt: number;
  retries: number;
}

const QUEUE_KEY = 'vinstour-offline-queue';

function loadQueue(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedAction[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedAction[]>(loadQueue);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      toast.info('Koneksi kembali! Mengirim ulang data yang tertunda…', { duration: 3000 });
    };
    const onOffline = () => {
      setIsOnline(false);
      toast.warning('Anda sedang offline. Aksi akan disimpan dan dikirim saat online kembali.', { duration: 4000 });
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Sync queue when coming back online
  useEffect(() => {
    if (!isOnline || queue.length === 0) return;

    const syncQueue = async () => {
      const remaining: QueuedAction[] = [];
      for (const action of queue) {
        try {
          if (action.url) {
            const res = await fetch(action.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action.payload),
            });
            if (!res.ok) throw new Error('Server error');
          }
          // action succeeded, don't add to remaining
        } catch {
          if (action.retries < 3) {
            remaining.push({ ...action, retries: action.retries + 1 });
          }
          // give up after 3 retries
        }
      }

      setQueue(remaining);
      saveQueue(remaining);

      const synced = queue.length - remaining.length;
      if (synced > 0) {
        toast.success(`${synced} aksi berhasil disinkronkan ✅`);
      }
    };

    syncQueue();
  }, [isOnline]); // intentionally only on isOnline change

  const enqueue = useCallback((action: Omit<QueuedAction, 'id' | 'queuedAt' | 'retries'>) => {
    const item: QueuedAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      queuedAt: Date.now(),
      retries: 0,
    };
    setQueue((prev) => {
      const next = [...prev, item];
      saveQueue(next);
      return next;
    });
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => {
      const next = prev.filter((a) => a.id !== id);
      saveQueue(next);
      return next;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    saveQueue([]);
  }, []);

  return { queue, isOnline, enqueue, removeFromQueue, clearQueue };
}
