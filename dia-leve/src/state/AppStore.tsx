import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { buildExample } from '../data/example';
import type { BackupFile } from '../data/backup';
import { IndexedDbRepository, MemoryRepository } from '../data/indexedDbRepository';
import type { DataRepository } from '../data/repository';
import { addDays, detectTimezone, isValidTimezone, nowIn } from '../domain/dates';
import {
  createItem,
  deleteItem,
  editItem,
  postpone as postponeItem,
  setDone as setDoneItem,
  type Change,
  type ItemDraft,
  type Scope,
} from '../domain/mutations';
import { MAX_HIGHLIGHTS } from '../domain/selectors';
import type { Item, LocalDate, LocalTime, Occurrence, Settings } from '../domain/types';

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  timezone: detectTimezone(),
  onboarded: false,
  inAppAlerts: true,
  reminderMinutes: 30,
  systemNotifications: false,
  highlights: {},
};

export interface Toast {
  id: number;
  message: string;
  undo?: () => void;
}

interface Store {
  ready: boolean;
  storageWarning: string | null;
  items: Item[];
  settings: Settings;
  today: LocalDate;
  now: LocalTime;
  toasts: Toast[];
  dismissToast(id: number): void;
  notify(message: string, undo?: () => void): void;
  addItems(drafts: ItemDraft[]): Promise<void>;
  edit(occ: Occurrence, draft: ItemDraft, scope: Scope): Promise<void>;
  setDone(occ: Occurrence, done: boolean): Promise<void>;
  /** Conclui/paga várias ocorrências de uma vez (com desfazer). */
  setDoneMany(occs: Occurrence[], done: boolean): Promise<void>;
  postpone(occ: Occurrence, date: LocalDate, time?: LocalTime | null): Promise<void>;
  remove(occ: Occurrence, scope: Scope): Promise<void>;
  toggleHighlight(occ: Occurrence): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  loadExample(): Promise<void>;
  removeExample(): Promise<void>;
  restoreBackup(backup: BackupFile): Promise<void>;
  clearAll(): Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fora do AppStoreProvider');
  return s;
}

function createRepository(): DataRepository {
  try {
    if (typeof indexedDB !== 'undefined') return new IndexedDbRepository();
  } catch {
    /* cai para memória */
  }
  return new MemoryRepository();
}

const STORAGE_FAIL =
  'Não foi possível guardar dados neste navegador (pode ser modo privado). O que você adicionar agora será perdido ao fechar.';

export function AppStoreProvider({ children, repository }: { children: ReactNode; repository?: DataRepository }) {
  const repoRef = useRef<DataRepository>(repository ?? createRepository());
  const [ready, setReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [clock, setClock] = useState(() => nowIn(DEFAULT_SETTINGS.timezone));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const toastId = useRef(0);

  // Carregamento inicial.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [loaded, s] = await Promise.all([repoRef.current.loadItems(), repoRef.current.loadSettings()]);
        if (!alive) return;
        const merged: Settings = { ...DEFAULT_SETTINGS, ...(s ?? {}) };
        if (!isValidTimezone(merged.timezone)) merged.timezone = detectTimezone();
        setItems(loaded);
        setSettings(merged);
        setClock(nowIn(merged.timezone));
      } catch {
        repoRef.current = new MemoryRepository();
        setStorageWarning(STORAGE_FAIL);
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Relógio no fuso escolhido (atualiza a virada do dia e os alertas).
  useEffect(() => {
    const tick = () => setClock(nowIn(settingsRef.current.timezone));
    tick();
    const t = setInterval(tick, 20_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [settings.timezone]);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const notify = useCallback(
    (message: string, undo?: () => void) => {
      const id = ++toastId.current;
      // Mostra só o aviso mais recente: evita vários botões "Desfazer" ao mesmo tempo.
      setToasts([{ id, message, undo }]);
      setTimeout(() => dismissToast(id), undo ? 7000 : 4000);
    },
    [dismissToast],
  );

  /** Aplica uma alteração: atualiza a tela na hora e grava em seguida. */
  const commit = useCallback(
    async (change: Change, message?: string, undoable = false) => {
      const before = itemsRef.current;
      const touched = new Set([...change.save.map((i) => i.id), ...change.remove]);
      const previous = before.filter((i) => touched.has(i.id));
      const created = change.save.filter((i) => !before.some((b) => b.id === i.id)).map((i) => i.id);

      const saveMap = new Map(change.save.map((i) => [i.id, i]));
      const next = [
        ...before.filter((i) => !change.remove.includes(i.id)).map((i) => saveMap.get(i.id) ?? i),
        ...change.save.filter((i) => !before.some((b) => b.id === i.id)),
      ];
      setItems(next);
      itemsRef.current = next;
      try {
        await repoRef.current.apply(change.save, change.remove);
      } catch {
        setStorageWarning(STORAGE_FAIL);
      }
      if (message) {
        const undo = undoable
          ? () => {
              void commit({ save: previous, remove: created }, 'Desfeito.');
            }
          : undefined;
        notify(message, undo);
      }
    },
    [notify],
  );

  const nowIso = () => new Date().toISOString();
  const findItem = (id: string) => itemsRef.current.find((i) => i.id === id);

  const saveSettings = useCallback(async (next: Settings) => {
    setSettings(next);
    settingsRef.current = next;
    try {
      await repoRef.current.saveSettings(next);
    } catch {
      setStorageWarning(STORAGE_FAIL);
    }
  }, []);

  const store = useMemo<Store>(
    () => ({
      ready,
      storageWarning,
      items,
      settings,
      today: clock.date,
      now: clock.time,
      toasts,
      dismissToast,
      notify,

      async addItems(drafts) {
        const now = nowIso();
        const created = drafts.map((d) => createItem(d, now));
        await commit(
          { save: created, remove: [] },
          created.length === 1 ? 'Salvo.' : `${created.length} lembretes salvos.`,
          true,
        );
      },

      async edit(occ, draft, scope) {
        const item = findItem(occ.itemId);
        if (!item) return;
        await commit(editItem(item, occ.originalDate, draft, scope, nowIso()), 'Alterações salvas.', true);
      },

      async setDone(occ, done) {
        const item = findItem(occ.itemId);
        if (!item) return;
        const msg =
          occ.kind === 'bill'
            ? done
              ? 'Conta marcada como paga.'
              : 'Pagamento desfeito.'
            : done
              ? 'Concluído. Muito bem!'
              : 'Reaberto.';
        await commit({ save: [setDoneItem(item, occ.originalDate, done, nowIso(), clock.date)], remove: [] }, msg, true);
      },

      async setDoneMany(occs, done) {
        const now = nowIso();
        const changed = new Map<string, Item>();
        for (const occ of occs) {
          const item = changed.get(occ.itemId) ?? findItem(occ.itemId);
          if (item) changed.set(item.id, setDoneItem(item, occ.originalDate, done, now, clock.date));
        }
        if (!changed.size) return;
        const isBill = occs[0]?.kind === 'bill';
        const n = occs.length;
        const msg = isBill
          ? `${n} ${n === 1 ? 'conta marcada como paga' : 'contas marcadas como pagas'}.`
          : `${n} ${n === 1 ? 'item concluído' : 'itens concluídos'}.`;
        await commit({ save: [...changed.values()], remove: [] }, msg, true);
      },

      async postpone(occ, date, time) {
        const item = findItem(occ.itemId);
        if (!item) return;
        await commit({ save: [postponeItem(item, occ.originalDate, date, time, nowIso())], remove: [] }, 'Adiado.', true);
      },

      async remove(occ, scope) {
        const item = findItem(occ.itemId);
        if (!item) return;
        await commit(deleteItem(item, occ.originalDate, scope, nowIso()), 'Excluído.', true);
      },

      async toggleHighlight(occ) {
        const s = settingsRef.current;
        const day = clock.date;
        const current = s.highlights[day] ?? [];
        let list: string[];
        if (current.includes(occ.key)) {
          list = current.filter((k) => k !== occ.key);
          notify('Removido dos destaques.');
        } else {
          if (current.length >= MAX_HIGHLIGHTS) {
            notify(`Você já tem ${MAX_HIGHLIGHTS} destaques hoje. Remova um para destacar outro.`);
            return;
          }
          list = [...current, occ.key];
          notify('Destacado para hoje.');
        }
        // Guarda apenas destaques recentes.
        const cutoff = addDays(day, -7);
        const highlights = Object.fromEntries(
          Object.entries({ ...s.highlights, [day]: list }).filter(([d, v]) => d >= cutoff && v.length),
        );
        await saveSettings({ ...s, highlights });
      },

      async updateSettings(patch) {
        await saveSettings({ ...settingsRef.current, ...patch });
      },

      async loadExample() {
        const example = buildExample(clock.date, nowIso());
        await commit({ save: example, remove: [] });
      },

      async removeExample() {
        const ids = itemsRef.current.filter((i) => i.isExample).map((i) => i.id);
        await commit({ save: [], remove: ids }, 'Exemplo removido.');
      },

      async restoreBackup(backup) {
        const nextSettings: Settings = { ...DEFAULT_SETTINGS, ...backup.settings, onboarded: true };
        await repoRef.current.replaceAll(backup.items, nextSettings);
        setItems(backup.items);
        itemsRef.current = backup.items;
        setSettings(nextSettings);
        settingsRef.current = nextSettings;
        notify('Backup restaurado.');
      },

      async clearAll() {
        await repoRef.current.clearAll();
        const fresh = { ...DEFAULT_SETTINGS, timezone: detectTimezone() };
        setItems([]);
        itemsRef.current = [];
        setSettings(fresh);
        settingsRef.current = fresh;
      },
    }),
    [ready, storageWarning, items, settings, clock, toasts, commit, notify, dismissToast, saveSettings],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
