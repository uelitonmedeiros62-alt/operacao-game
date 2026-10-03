import { isLocalDate, isLocalTime } from '../domain/dates';
import { centsToInput, parseBRL } from '../domain/money';
import type { ItemDraft } from '../domain/mutations';
import { ALLOWED_FREQ } from '../domain/recurrence';
import type { Frequency, ItemKind, LocalDate, Occurrence } from '../domain/types';

/** Estado do formulário (tudo em texto, como a pessoa digita). */
export interface FormState {
  kind: ItemKind;
  title: string;
  date: string;
  noDate: boolean;
  time: string;
  important: boolean;
  amount: string;
  category: string;
  notes: string;
  repeat: Frequency | '';
}

export type FormErrors = Partial<Record<'title' | 'date' | 'time' | 'amount', string>>;

export function emptyForm(kind: ItemKind, date: LocalDate | null): FormState {
  return {
    kind,
    title: '',
    date: date ?? '',
    noDate: kind === 'task' && !date,
    time: '',
    important: false,
    amount: '',
    category: '',
    notes: '',
    repeat: '',
  };
}

export function draftToForm(d: ItemDraft): FormState {
  return {
    kind: d.kind,
    title: d.title,
    date: d.date ?? '',
    noDate: d.kind === 'task' && !d.date,
    time: d.time ?? '',
    important: d.priority === 'high',
    amount: d.amountCents != null ? centsToInput(d.amountCents) : '',
    category: d.category ?? '',
    notes: d.notes ?? '',
    repeat: d.repeat ?? '',
  };
}

export function occurrenceToForm(o: Occurrence): FormState {
  return draftToForm({
    kind: o.kind,
    title: o.title,
    date: o.date,
    time: o.time,
    priority: o.priority,
    amountCents: o.amountCents,
    category: o.category,
    notes: o.notes,
    repeat: o.recurrence?.freq ?? null,
  });
}

/** Ajusta campos ao trocar o tipo (mantém o que for comum). */
export function changeKind(f: FormState, kind: ItemKind, fallbackDate: LocalDate): FormState {
  const allowed = ALLOWED_FREQ[kind] as readonly string[];
  return {
    ...f,
    kind,
    noDate: kind === 'task' ? f.noDate : false,
    date: kind !== 'task' && !f.date ? fallbackDate : f.date,
    repeat: f.repeat && allowed.includes(f.repeat) ? f.repeat : '',
  };
}

export function validateForm(f: FormState): { draft: ItemDraft } | { errors: FormErrors } {
  const errors: FormErrors = {};
  const title = f.title.trim();
  if (!title) errors.title = 'Escreva um nome.';
  else if (title.length > 200) errors.title = 'Nome muito longo (máximo de 200 letras).';

  const needsDate = f.kind !== 'task' || !f.noDate;
  if (needsDate && !isLocalDate(f.date)) {
    errors.date = f.kind === 'bill' ? 'Escolha a data de vencimento.' : 'Escolha a data.';
  }
  if (f.kind !== 'bill' && f.time && !isLocalTime(f.time)) errors.time = 'Horário inválido.';

  let amountCents: number | undefined;
  if (f.kind === 'bill') {
    const v = parseBRL(f.amount);
    if (!f.amount.trim()) errors.amount = 'Informe o valor.';
    else if (v == null) errors.amount = 'Valor inválido. Exemplo: 120,50';
    else amountCents = v;
  }

  const allowed = ALLOWED_FREQ[f.kind] as readonly string[];
  const repeat = f.repeat && allowed.includes(f.repeat) && needsDate ? (f.repeat as Frequency) : null;

  if (Object.keys(errors).length) return { errors };
  return {
    draft: {
      kind: f.kind,
      title,
      date: needsDate ? f.date : null,
      time: f.kind === 'bill' ? null : f.time || null,
      priority: f.kind === 'task' && f.important ? 'high' : 'normal',
      amountCents,
      category: f.kind === 'bill' ? f.category || undefined : undefined,
      notes: f.notes.trim() || undefined,
      repeat,
    },
  };
}
