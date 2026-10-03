import { monthRange } from './dates';
import { sumCents } from './money';
import {
  compareByDateTime,
  compareSuggested,
  findOccurrence,
  occurrencesBetween,
  overdue,
  undatedTasks,
} from './occurrences';
import type { Item, LocalDate, Occurrence } from './types';

export const MAX_HIGHLIGHTS = 3;

export interface TodayView {
  /** Até 3 tarefas em destaque (escolhidas manualmente primeiro, depois sugeridas). */
  priorities: Occurrence[];
  /** Chaves das tarefas destacadas manualmente. */
  manualKeys: Set<string>;
  /** Demais tarefas pendentes de hoje. */
  otherTasks: Occurrence[];
  events: Occurrence[];
  bills: Occurrence[];
  /** Atrasados que não estão nas prioridades. */
  overdue: Occurrence[];
  doneToday: Occurrence[];
  undated: Occurrence[];
  progress: { done: number; total: number };
  isEmpty: boolean;
}

export function buildToday(items: Item[], today: LocalDate, highlightKeys: string[] = []): TodayView {
  const todays = occurrencesBetween(items, today, today);
  const tasks = todays.filter((o) => o.kind === 'task');
  const pendingTasks = tasks.filter((o) => o.status === 'pending');
  const late = overdue(items, today);
  const lateTasks = late.filter((o) => o.kind === 'task');

  // Destaques manuais válidos e ainda pendentes.
  const manual: Occurrence[] = [];
  for (const key of highlightKeys) {
    const occ = findOccurrence(items, key);
    if (occ && occ.kind === 'task' && occ.status === 'pending' && manual.length < MAX_HIGHLIGHTS) {
      manual.push(occ);
    }
  }
  const manualKeys = new Set(manual.map((o) => o.key));
  const suggestions = [...pendingTasks, ...lateTasks]
    .filter((o) => !manualKeys.has(o.key))
    .sort(compareSuggested);
  const priorities = [...manual, ...suggestions.slice(0, Math.max(0, MAX_HIGHLIGHTS - manual.length))];
  const prioKeys = new Set(priorities.map((o) => o.key));

  const undated = undatedTasks(items)
    .filter((o) => o.status === 'pending' && !prioKeys.has(o.key))
    .sort(compareSuggested);

  const events = todays.filter((o) => o.kind === 'event').sort(compareByDateTime);
  const bills = todays.filter((o) => o.kind === 'bill');
  const otherTasks = pendingTasks.filter((o) => !prioKeys.has(o.key)).sort(compareSuggested);
  const doneToday = tasks.filter((o) => o.status === 'done');

  return {
    priorities,
    manualKeys,
    otherTasks,
    events,
    bills,
    overdue: late.filter((o) => !prioKeys.has(o.key)),
    doneToday,
    undated,
    progress: { done: doneToday.length, total: tasks.length },
    isEmpty:
      priorities.length + otherTasks.length + events.length + bills.length + late.length + doneToday.length === 0,
  };
}

export interface MonthBills {
  /** Critério: mês do vencimento. */
  pendingCents: number;
  paidCents: number;
  pending: Occurrence[];
  paid: Occurrence[];
}

export function billsOfMonth(items: Item[], monthKey: string): MonthBills {
  const { from, to } = monthRange(monthKey);
  const bills = occurrencesBetween(items, from, to).filter((o) => o.kind === 'bill');
  const pending = bills.filter((o) => o.status === 'pending');
  const paid = bills.filter((o) => o.status === 'done');
  return {
    pendingCents: sumCents(pending.map((o) => o.amountCents)),
    paidCents: sumCents(paid.map((o) => o.amountCents)),
    pending,
    paid,
  };
}

export function overdueBills(items: Item[], today: LocalDate): Occurrence[] {
  return overdue(items, today).filter((o) => o.kind === 'bill');
}

/** Itens de um dia, com filtro opcional por tipo. */
export function dayItems(items: Item[], date: LocalDate, kinds?: Set<Occurrence['kind']>): Occurrence[] {
  return occurrencesBetween(items, date, date).filter((o) => !kinds || kinds.has(o.kind));
}
