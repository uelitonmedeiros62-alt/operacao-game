import { addDays, addMonthsClamped, diffDays, parts, weekday } from './dates';
import type { LocalDate, Recurrence } from './types';

export const FREQ_LABEL: Record<Recurrence['freq'], string> = {
  daily: 'Todo dia',
  weekly: 'Toda semana',
  monthly: 'Todo mês',
};

/** Quais repetições cada tipo de item permite nesta versão. */
export const ALLOWED_FREQ = {
  task: ['daily', 'weekly'],
  event: ['weekly'],
  bill: ['monthly'],
} as const;

export function describeRecurrence(rule: Recurrence, start: LocalDate): string {
  if (rule.freq === 'daily') return 'Repete todo dia';
  if (rule.freq === 'weekly') {
    const names = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    const wd = weekday(start);
    return `Repete ${wd === 0 || wd === 6 ? 'todo' : 'toda'} ${names[wd]}`;
  }
  const day = rule.dayOfMonth ?? parts(start).d;
  return `Repete todo dia ${day}${day > 28 ? ' (ou último dia do mês)' : ''}`;
}

/**
 * Datas das ocorrências de uma série entre `from` e `to` (inclusive).
 * Determinístico: as mesmas entradas sempre geram as mesmas datas,
 * por isso nada é gravado e não há como duplicar ao recarregar.
 */
export function occurrenceDates(
  start: LocalDate,
  rule: Recurrence,
  from: LocalDate,
  to: LocalDate,
): LocalDate[] {
  const end = rule.until && rule.until < to ? rule.until : to;
  if (end < start || end < from) return [];
  const out: LocalDate[] = [];

  if (rule.freq === 'daily' || rule.freq === 'weekly') {
    const step = rule.freq === 'daily' ? 1 : 7;
    let first = start;
    if (from > start) {
      const skip = Math.ceil(diffDays(from, start) / step);
      first = addDays(start, skip * step);
    }
    for (let d = first; d <= end; d = addDays(d, step)) out.push(d);
    return out;
  }

  // Mensal: dia de referência fixo; meses curtos usam o último dia.
  const ref = rule.dayOfMonth ?? parts(start).d;
  const s = parts(start);
  const f = parts(from > start ? from : start);
  let k = (f.y - s.y) * 12 + (f.m - s.m);
  if (k < 0) k = 0;
  // Volta um mês por segurança (o dia ajustado pode cair antes de `from`).
  k = Math.max(0, k - 1);
  for (;;) {
    const d = addMonthsClamped(`${start.slice(0, 7)}-01`, k, ref);
    k++;
    if (d < start || d < from) continue;
    if (d > end) break;
    out.push(d);
  }
  return out;
}

/** A data informada é uma ocorrência válida da série? */
export function isOccurrenceDate(start: LocalDate, rule: Recurrence, date: LocalDate): boolean {
  return occurrenceDates(start, rule, date, date).length === 1;
}
