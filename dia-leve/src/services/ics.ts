import { addDays } from '../domain/dates';
import { formatBRL } from '../domain/money';
import { occurrencesBetween } from '../domain/occurrences';
import type { Item, LocalDate, Occurrence } from '../domain/types';

/**
 * Exporta compromissos (e, opcionalmente, contas) para um arquivo .ics,
 * que pode ser aberto no calendário do celular. Usamos horário "flutuante"
 * (sem fuso), então 15h continua 15h no calendário do aparelho.
 */

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  out.push(rest);
  return out.join('\r\n');
}

const d8 = (d: LocalDate) => d.replace(/-/g, '');

function stamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function eventLines(o: Occurrence, now: Date, durationMin = 60): string[] {
  const lines = ['BEGIN:VEVENT', `UID:${o.key.replace(/[^\w.-]/g, '-')}@dia-leve`, `DTSTAMP:${stamp(now)}`];
  const title = o.kind === 'bill' ? `Pagar: ${o.title}${o.amountCents != null ? ` (${formatBRL(o.amountCents)})` : ''}` : o.title;
  if (o.time && o.date) {
    const [h, m] = o.time.split(':').map(Number);
    const endMin = h * 60 + m + durationMin;
    const endDate = endMin >= 1440 ? addDays(o.date, 1) : o.date;
    const em = endMin % 1440;
    lines.push(`DTSTART:${d8(o.date)}T${o.time.replace(':', '')}00`);
    lines.push(`DTEND:${d8(endDate)}T${String(Math.floor(em / 60)).padStart(2, '0')}${String(em % 60).padStart(2, '0')}00`);
  } else if (o.date) {
    lines.push(`DTSTART;VALUE=DATE:${d8(o.date)}`);
    lines.push(`DTEND;VALUE=DATE:${d8(addDays(o.date, 1))}`);
  }
  lines.push(`SUMMARY:${esc(title)}`);
  if (o.notes) lines.push(`DESCRIPTION:${esc(o.notes)}`);
  lines.push('END:VEVENT');
  return lines;
}

export function buildIcs(occurrences: Occurrence[], now = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dia Leve//PT-BR',
    'CALSCALE:GREGORIAN',
    ...occurrences.filter((o) => o.date).flatMap((o) => eventLines(o, now)),
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

/** Ocorrências futuras (próximos `days` dias) para exportar. */
export function upcomingForCalendar(items: Item[], today: LocalDate, includeBills: boolean, days = 180): Occurrence[] {
  return occurrencesBetween(items, today, addDays(today, days)).filter(
    (o) => o.status === 'pending' && (o.kind === 'event' || (includeBills && o.kind === 'bill')),
  );
}
