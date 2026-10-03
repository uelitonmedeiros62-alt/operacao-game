import type { LocalDate, LocalTime } from './types';

/**
 * Utilitários de data sem fuso horário.
 * Toda aritmética usa Date.UTC apenas como calendário, nunca como instante.
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isLocalDate(value: unknown): value is LocalDate {
  if (typeof value !== 'string') return false;
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo);
}

export function isLocalTime(value: unknown): value is LocalTime {
  return typeof value === 'string' && TIME_RE.test(value);
}

export function parts(date: LocalDate): { y: number; m: number; d: number } {
  const [y, m, d] = date.split('-').map(Number);
  return { y, m, d };
}

export function makeDate(y: number, m: number, d: number): LocalDate {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** m de 1 a 12. */
export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function toUtc(date: LocalDate): Date {
  const { y, m, d } = parts(date);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(dt: Date): LocalDate {
  return makeDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function addDays(date: LocalDate, n: number): LocalDate {
  const dt = toUtc(date);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fromUtc(dt);
}

/** Soma meses mantendo o dia de referência; usa o último dia quando o mês é mais curto. */
export function addMonthsClamped(date: LocalDate, n: number, refDay?: number): LocalDate {
  const { y, m, d } = parts(date);
  const idx = y * 12 + (m - 1) + n;
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12) + 1;
  const day = Math.min(refDay ?? d, daysInMonth(ny, nm));
  return makeDate(ny, nm, day);
}

/** 0 = domingo … 6 = sábado. */
export function weekday(date: LocalDate): number {
  return toUtc(date).getUTCDay();
}

export function diffDays(a: LocalDate, b: LocalDate): number {
  return Math.round((toUtc(a).getTime() - toUtc(b).getTime()) / 86_400_000);
}

/** Semana começando na segunda-feira. */
export function startOfWeek(date: LocalDate): LocalDate {
  const wd = weekday(date);
  return addDays(date, wd === 0 ? -6 : 1 - wd);
}

export function weekDates(date: LocalDate): LocalDate[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function monthKey(date: LocalDate): string {
  return date.slice(0, 7);
}

export function monthRange(key: string): { from: LocalDate; to: LocalDate } {
  const [y, m] = key.split('-').map(Number);
  return { from: makeDate(y, m, 1), to: makeDate(y, m, daysInMonth(y, m)) };
}

export function shiftMonthKey(key: string, n: number): string {
  return monthKey(addMonthsClamped(`${key}-01`, n));
}

// ---------- Relógio e fuso do usuário ----------

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
  } catch {
    return 'America/Sao_Paulo';
  }
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Data e hora "de parede" no fuso escolhido. */
export function nowIn(tz: string, now: Date = new Date()): { date: LocalDate; time: LocalTime } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: isValidTimezone(tz) ? tz : undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const get = (type: string) => fmt.formatToParts(now).find((p) => p.type === type)?.value ?? '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour') === '24' ? '00' : get('hour')}:${get('minute')}`,
  };
}

export function todayIn(tz: string, now: Date = new Date()): LocalDate {
  return nowIn(tz, now).date;
}

/** Minutos "de parede" desde a época — útil para comparar data+hora sem fuso. */
export function wallMinutes(date: LocalDate, time: LocalTime): number {
  const [h, mi] = time.split(':').map(Number);
  return toUtc(date).getTime() / 60_000 + h * 60 + mi;
}

// ---------- Formatação em português ----------

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const k = JSON.stringify(opts);
  let f = fmtCache.get(k);
  if (!f) {
    f = new Intl.DateTimeFormat('pt-BR', { ...opts, timeZone: 'UTC' });
    fmtCache.set(k, f);
  }
  return f;
}

/** "sábado, 3 de outubro" */
export function formatLong(date: LocalDate): string {
  return fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(toUtc(date));
}

/** "sábado, 3 de outubro de 2026" */
export function formatFull(date: LocalDate): string {
  return fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(toUtc(date));
}

/** "3 de out." */
export function formatShort(date: LocalDate): string {
  return fmt({ day: 'numeric', month: 'short' }).format(toUtc(date));
}

/** "outubro de 2026" */
export function formatMonth(key: string): string {
  const s = fmt({ month: 'long', year: 'numeric' }).format(toUtc(`${key}-01`));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function weekdayShort(date: LocalDate): string {
  return fmt({ weekday: 'short' }).format(toUtc(date)).replace('.', '');
}

export function weekdayLong(date: LocalDate): string {
  return fmt({ weekday: 'long' }).format(toUtc(date));
}

/** "Hoje", "Amanhã", "Ontem" ou "seg., 5 de out." */
export function formatRelative(date: LocalDate, today: LocalDate): string {
  const diff = diffDays(date, today);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  return fmt(
    sameYear
      ? { weekday: 'short', day: 'numeric', month: 'short' }
      : { day: 'numeric', month: 'short', year: 'numeric' },
  ).format(toUtc(date));
}

/** "15:00" → "15h", "09:30" → "9h30" */
export function formatTime(time: LocalTime): string {
  const [h, m] = time.split(':').map(Number);
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

export function greeting(time: LocalTime): string {
  const h = Number(time.slice(0, 2));
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}
