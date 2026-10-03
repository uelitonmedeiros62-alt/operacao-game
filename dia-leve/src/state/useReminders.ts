import { useEffect, useState } from 'react';
import { formatTime, wallMinutes } from '../domain/dates';
import { occurrencesBetween } from '../domain/occurrences';
import { showSystemNotification } from '../services/notifications';
import { useStore } from './AppStore';

export interface InAppAlert {
  key: string;
  title: string;
  message: string;
}

const STORAGE_KEY = 'dia-leve:alertas';

function loadAlerted(day: string): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as { day: string; keys: string[] }) : null;
    return new Set(parsed && parsed.day === day ? parsed.keys : []);
  } catch {
    return new Set();
  }
}

function saveAlerted(day: string, keys: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ day, keys: [...keys] }));
  } catch {
    /* sem armazenamento: só não lembra entre recarregamentos */
  }
}

/**
 * Verifica, enquanto o app está aberto, compromissos e tarefas com horário
 * que estão para começar. Não funciona com o app fechado.
 */
export function useReminders(): { alerts: InAppAlert[]; dismiss(key: string): void } {
  const { items, settings, today, now } = useStore();
  const [alerts, setAlerts] = useState<InAppAlert[]>([]);

  useEffect(() => {
    if (!settings.onboarded || (!settings.inAppAlerts && !settings.systemNotifications)) return;
    const alerted = loadAlerted(today);
    const nowMin = wallMinutes(today, now);
    const fresh: InAppAlert[] = [];
    for (const o of occurrencesBetween(items, today, today)) {
      if (o.status !== 'pending' || !o.time || !o.date || o.kind === 'bill') continue;
      const start = wallMinutes(o.date, o.time);
      if (nowMin < start - settings.reminderMinutes || nowMin > start + 5) continue;
      const key = `${o.key}@${o.date}T${o.time}`;
      if (alerted.has(key)) continue;
      alerted.add(key);
      const mins = start - nowMin;
      const when = mins <= 0 ? 'agora' : mins === 1 ? 'em 1 minuto' : `em ${mins} minutos`;
      const alert = { key, title: o.title, message: `Às ${formatTime(o.time)} (${when})` };
      fresh.push(alert);
      if (settings.systemNotifications) void showSystemNotification(o.title, alert.message, key);
    }
    if (fresh.length) {
      saveAlerted(today, alerted);
      if (settings.inAppAlerts) setAlerts((a) => [...a, ...fresh]);
    }
  }, [items, settings, today, now]);

  return {
    alerts,
    dismiss: (key) => setAlerts((a) => a.filter((x) => x.key !== key)),
  };
}
