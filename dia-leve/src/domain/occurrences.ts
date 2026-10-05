import { addDays } from './dates';
import { isOccurrenceDate, occurrenceDates } from './recurrence';
import type { Item, LocalDate, Occurrence } from './types';

export function occurrenceKey(itemId: string, originalDate: LocalDate | null): string {
  return originalDate ? `${itemId}::${originalDate}` : itemId;
}

export function parseOccurrenceKey(key: string): { itemId: string; originalDate: LocalDate | null } {
  const idx = key.indexOf('::');
  return idx < 0
    ? { itemId: key, originalDate: null }
    : { itemId: key.slice(0, idx), originalDate: key.slice(idx + 2) };
}

function single(item: Item): Occurrence {
  return {
    key: item.id,
    itemId: item.id,
    originalDate: null,
    kind: item.kind,
    title: item.title,
    notes: item.notes,
    date: item.date,
    time: item.time,
    priority: item.priority,
    amountCents: item.amountCents,
    category: item.category,
    status: item.status,
    completedAt: item.completedAt,
    paidOn: item.paidOn,
    isRecurring: false,
    recurrence: null,
    isExample: item.isExample,
    createdAt: item.createdAt,
  };
}

/** Monta a ocorrência de uma série aplicando as alterações individuais. */
export function seriesOccurrence(item: Item, originalDate: LocalDate): Occurrence | null {
  const o = item.overrides?.[originalDate] ?? {};
  if (o.deleted) return null;
  return {
    key: occurrenceKey(item.id, originalDate),
    itemId: item.id,
    originalDate,
    kind: item.kind,
    title: o.title ?? item.title,
    notes: o.notes ?? item.notes,
    date: o.date ?? originalDate,
    time: o.time !== undefined ? o.time : item.time,
    priority: item.priority,
    amountCents: o.amountCents ?? item.amountCents,
    category: item.category,
    status: o.status ?? 'pending',
    completedAt: o.completedAt ?? null,
    paidOn: o.paidOn ?? null,
    isRecurring: true,
    recurrence: item.recurrence,
    isExample: item.isExample,
    createdAt: item.createdAt,
  };
}

/** Todas as ocorrências cuja data (efetiva) cai entre `from` e `to`. */
export function expandItem(item: Item, from: LocalDate, to: LocalDate): Occurrence[] {
  if (!item.recurrence || !item.date) {
    if (item.date && item.date >= from && item.date <= to) return [single(item)];
    return [];
  }
  const out: Occurrence[] = [];
  const seen = new Set<string>();
  for (const d of occurrenceDates(item.date, item.recurrence, from, to)) {
    const occ = seriesOccurrence(item, d);
    if (occ && occ.date && occ.date >= from && occ.date <= to) {
      out.push(occ);
      seen.add(d);
    }
  }
  // Ocorrências adiadas para dentro do intervalo, vindas de fora dele.
  for (const [orig, o] of Object.entries(item.overrides ?? {})) {
    if (seen.has(orig) || o.deleted || !o.date) continue;
    if (o.date < from || o.date > to) continue;
    if (!isOccurrenceDate(item.date, item.recurrence, orig)) continue;
    const occ = seriesOccurrence(item, orig);
    if (occ) out.push(occ);
  }
  return out;
}

export function occurrencesBetween(items: Item[], from: LocalDate, to: LocalDate): Occurrence[] {
  return items.flatMap((it) => expandItem(it, from, to)).sort(compareByDateTime);
}

export function undatedTasks(items: Item[]): Occurrence[] {
  return items.filter((it) => it.kind === 'task' && !it.date).map(single);
}

/** Busca uma ocorrência pela chave (inclusive itens sem data). */
export function findOccurrence(items: Item[], key: string): Occurrence | null {
  const { itemId, originalDate } = parseOccurrenceKey(key);
  const item = items.find((i) => i.id === itemId);
  if (!item) return null;
  if (originalDate) return seriesOccurrence(item, originalDate);
  return single(item);
}

/**
 * Pendências atrasadas: tarefas e contas não concluídas com data anterior a hoje.
 * Nada é descartado por idade: toda ocorrência passada de uma série (tarefa diária,
 * semanal ou conta mensal) continua pendente até ser concluída, paga ou excluída.
 * A tela inicial mostra só um resumo (ver `summarizeOverdue`); a lista completa
 * fica em "Todas as pendências".
 */
export function overdue(items: Item[], today: LocalDate): Occurrence[] {
  const yesterday = addDays(today, -1);
  const out: Occurrence[] = [];
  for (const it of items) {
    if (it.kind === 'event' || !it.date) continue;
    if (!it.recurrence) {
      if (it.status === 'pending' && it.date < today) out.push(single(it));
      continue;
    }
    if (it.date > yesterday) continue;
    for (const occ of expandItem(it, it.date, yesterday)) {
      if (occ.status === 'pending') out.push(occ);
    }
  }
  return out.sort(compareByDateTime);
}

export interface OverdueGroup {
  /** Ocorrência mais recente (a que aparece no resumo). */
  latest: Occurrence;
  /** Todas as ocorrências pendentes do mesmo item, da mais antiga à mais recente. */
  all: Occurrence[];
}

/**
 * Agrupa as pendências por item: uma série com várias ocorrências atrasadas vira
 * um único grupo, para o resumo não ficar enorme. Nenhuma ocorrência é perdida.
 */
export function groupOverdue(late: Occurrence[]): OverdueGroup[] {
  const map = new Map<string, Occurrence[]>();
  for (const o of late) {
    const list = map.get(o.itemId) ?? [];
    list.push(o);
    map.set(o.itemId, list);
  }
  return [...map.values()]
    .map((all) => ({ all, latest: all[all.length - 1] }))
    .sort((a, b) => compareByDateTime(a.all[0], b.all[0]));
}

export function compareByDateTime(a: Occurrence, b: Occurrence): number {
  const da = a.date ?? '9999-12-31';
  const db = b.date ?? '9999-12-31';
  if (da !== db) return da < db ? -1 : 1;
  // Sem horário primeiro (dia inteiro), depois por horário.
  const ta = a.time ?? '';
  const tb = b.time ?? '';
  if (ta !== tb) return ta < tb ? -1 : 1;
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

/**
 * Ordem das tarefas sugeridas:
 * 1. prioridade alta; 2. vencimento mais próximo; 3. criação mais antiga.
 */
export function compareSuggested(a: Occurrence, b: Occurrence): number {
  if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1;
  const da = a.date ?? '9999-12-31';
  const db = b.date ?? '9999-12-31';
  if (da !== db) return da < db ? -1 : 1;
  const ta = a.time ?? '99:99';
  const tb = b.time ?? '99:99';
  if (ta !== tb) return ta < tb ? -1 : 1;
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}
