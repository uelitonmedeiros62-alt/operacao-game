import { addDays, parts } from './dates';
import type {
  Frequency,
  IsoInstant,
  Item,
  ItemKind,
  LocalDate,
  LocalTime,
  OccurrenceOverride,
  Priority,
  Recurrence,
} from './types';

/** Escopo de uma alteração em item recorrente. */
export type Scope = 'this' | 'following';

/** Dados vindos do formulário ou da confirmação do texto interpretado. */
export interface ItemDraft {
  kind: ItemKind;
  title: string;
  notes?: string;
  date: LocalDate | null;
  time: LocalTime | null;
  priority: Priority;
  amountCents?: number;
  category?: string;
  repeat: Frequency | null;
}

/** Resultado de uma operação: itens a gravar e ids a remover. */
export interface Change {
  save: Item[];
  remove: string[];
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildRecurrence(
  repeat: Frequency | null,
  date: LocalDate | null,
  keepDayOfMonth?: number,
): Recurrence | null {
  if (!repeat || !date) return null;
  if (repeat === 'monthly') return { freq: 'monthly', dayOfMonth: keepDayOfMonth ?? parts(date).d };
  return { freq: repeat };
}

function cleanDraft(d: ItemDraft) {
  return {
    title: d.title.trim(),
    notes: d.notes?.trim() || undefined,
    time: d.kind === 'bill' ? null : d.time,
    priority: d.kind === 'task' ? d.priority : ('normal' as Priority),
    amountCents: d.kind === 'bill' ? d.amountCents ?? 0 : undefined,
    category: d.category?.trim() || undefined,
  };
}

export function createItem(draft: ItemDraft, now: IsoInstant, id: string = newId()): Item {
  const date = draft.date;
  return {
    id,
    kind: draft.kind,
    ...cleanDraft(draft),
    date,
    status: 'pending',
    completedAt: null,
    paidOn: null,
    recurrence: buildRecurrence(draft.repeat, date),
    overrides: {},
    createdAt: now,
    updatedAt: now,
  };
}

function withOverride(item: Item, originalDate: LocalDate, patch: OccurrenceOverride, now: IsoInstant): Item {
  const prev = item.overrides?.[originalDate] ?? {};
  return {
    ...item,
    overrides: { ...(item.overrides ?? {}), [originalDate]: { ...prev, ...patch } },
    updatedAt: now,
  };
}

/** Concluir/reabrir tarefa ou compromisso; pagar/desfazer pagamento de conta. */
export function setDone(
  item: Item,
  originalDate: LocalDate | null,
  done: boolean,
  now: IsoInstant,
  today: LocalDate,
): Item {
  const patch: OccurrenceOverride =
    item.kind === 'bill'
      ? { status: done ? 'done' : 'pending', paidOn: done ? today : null, completedAt: done ? now : null }
      : { status: done ? 'done' : 'pending', completedAt: done ? now : null };
  if (originalDate && item.recurrence) return withOverride(item, originalDate, patch, now);
  return { ...item, ...patch, updatedAt: now } as Item;
}

/** Adiar uma ocorrência (sempre só esta) para nova data e, opcionalmente, novo horário. */
export function postpone(
  item: Item,
  originalDate: LocalDate | null,
  date: LocalDate,
  time: LocalTime | null | undefined,
  now: IsoInstant,
): Item {
  if (originalDate && item.recurrence) {
    const patch: OccurrenceOverride = { date };
    if (time !== undefined) patch.time = time;
    return withOverride(item, originalDate, patch, now);
  }
  return { ...item, date, ...(time !== undefined ? { time } : {}), updatedAt: now };
}

function stripContent(o: OccurrenceOverride): OccurrenceOverride | null {
  const { title: _t, notes: _n, amountCents: _a, ...rest } = o;
  if (!rest.date) delete rest.time;
  return Object.keys(rest).length ? rest : null;
}

function filterOverrides(
  overrides: Record<LocalDate, OccurrenceOverride> | undefined,
  keep: (date: LocalDate) => boolean,
  strip = false,
): Record<LocalDate, OccurrenceOverride> {
  const out: Record<LocalDate, OccurrenceOverride> = {};
  for (const [k, v] of Object.entries(overrides ?? {})) {
    if (!keep(k)) continue;
    const val = strip ? stripContent(v) : v;
    if (val) out[k] = val;
  }
  return out;
}

/**
 * Editar um item. Para séries:
 * - "this": altera somente a ocorrência (título, data, horário, valor, observação).
 * - "following": encerra a série antes desta data e cria uma nova a partir dela.
 */
export function editItem(
  item: Item,
  originalDate: LocalDate | null,
  draft: ItemDraft,
  scope: Scope,
  now: IsoInstant,
  id: string = newId(),
): Change {
  const c = cleanDraft(draft);

  if (!item.recurrence || !originalDate || !item.date) {
    const date = draft.date;
    return {
      save: [
        {
          ...item,
          ...c,
          date,
          recurrence: buildRecurrence(draft.repeat, date),
          overrides: {},
          updatedAt: now,
        },
      ],
      remove: [],
    };
  }

  if (scope === 'this') {
    const patch: OccurrenceOverride = {
      title: c.title,
      notes: c.notes ?? '',
      time: c.time,
      date: draft.date ?? originalDate,
    };
    if (item.kind === 'bill') patch.amountCents = c.amountCents;
    return { save: [withOverride(item, originalDate, patch, now)], remove: [] };
  }

  // "Esta e as próximas"
  const newDate = draft.date ?? originalDate;
  const sameDate = newDate === originalDate;
  const keepRef = sameDate && item.recurrence.freq === 'monthly' ? item.recurrence.dayOfMonth : undefined;
  const nextRule = buildRecurrence(draft.repeat, newDate, keepRef);
  const current = item.overrides?.[originalDate] ?? {};
  const until = item.recurrence.until ?? null;

  const base: Item = {
    ...item,
    ...c,
    date: newDate,
    recurrence: nextRule ? { ...nextRule, until: sameDate ? until : null } : null,
    updatedAt: now,
  };
  if (!nextRule) {
    // A série deixa de repetir a partir daqui: vira item único com a situação atual.
    base.overrides = {};
    base.status = current.status ?? 'pending';
    base.completedAt = current.completedAt ?? null;
    base.paidOn = current.paidOn ?? null;
  } else {
    base.overrides = filterOverrides(item.overrides, (k) => k > originalDate, true);
    if (current.status || current.paidOn) {
      base.overrides[newDate] = {
        status: current.status,
        completedAt: current.completedAt,
        paidOn: current.paidOn,
      };
    }
  }

  if (originalDate <= item.date) {
    return { save: [{ ...base, id: item.id }], remove: [] };
  }

  const ended: Item = {
    ...item,
    recurrence: { ...item.recurrence, until: addDays(originalDate, -1) },
    overrides: filterOverrides(item.overrides, (k) => k < originalDate),
    updatedAt: now,
  };
  return { save: [ended, { ...base, id, createdAt: now }], remove: [] };
}

/** Excluir item ou ocorrência. */
export function deleteItem(
  item: Item,
  originalDate: LocalDate | null,
  scope: Scope,
  now: IsoInstant,
): Change {
  if (!item.recurrence || !originalDate || !item.date) return { save: [], remove: [item.id] };
  if (scope === 'this') return { save: [withOverride(item, originalDate, { deleted: true }, now)], remove: [] };
  if (originalDate <= item.date) return { save: [], remove: [item.id] };
  return {
    save: [
      {
        ...item,
        recurrence: { ...item.recurrence, until: addDays(originalDate, -1) },
        overrides: filterOverrides(item.overrides, (k) => k < originalDate),
        updatedAt: now,
      },
    ],
    remove: [],
  };
}
