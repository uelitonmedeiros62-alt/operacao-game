import { isLocalDate, isLocalTime, isValidTimezone } from '../domain/dates';
import type { Item, ItemKind, OccurrenceOverride, Settings } from '../domain/types';

export const BACKUP_APP = 'dia-leve';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  items: Item[];
  settings: Settings;
}

export interface BackupSummary {
  exportedAt: string;
  tasks: number;
  events: number;
  bills: number;
  name: string;
}

export type ImportResult =
  | { ok: true; backup: BackupFile; summary: BackupSummary }
  | { ok: false; error: string };

export function createBackup(items: Item[], settings: Settings, now = new Date()): BackupFile {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    items: structuredClone(items),
    settings: structuredClone(settings),
  };
}

export function backupFileName(today: string): string {
  return `dia-leve-backup-${today}.json`;
}

const KINDS: ItemKind[] = ['task', 'event', 'bill'];
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isIso = (v: unknown) => isStr(v) && !Number.isNaN(Date.parse(v));
const isCents = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;

function validateOverride(v: unknown): string | null {
  if (!isObj(v)) return 'ocorrência inválida';
  if (v.date !== undefined && !isLocalDate(v.date)) return 'data de ocorrência inválida';
  if (v.time !== undefined && v.time !== null && !isLocalTime(v.time)) return 'horário de ocorrência inválido';
  if (v.title !== undefined && !isStr(v.title)) return 'título de ocorrência inválido';
  if (v.amountCents !== undefined && !isCents(v.amountCents)) return 'valor de ocorrência inválido';
  if (v.status !== undefined && v.status !== 'pending' && v.status !== 'done') return 'situação inválida';
  if (v.paidOn !== undefined && v.paidOn !== null && !isLocalDate(v.paidOn)) return 'data de pagamento inválida';
  return null;
}

/** Valida um item; devolve a descrição do problema ou null. */
export function validateItem(v: unknown): string | null {
  if (!isObj(v)) return 'registro não é um objeto';
  if (!isStr(v.id) || !v.id) return 'registro sem identificador';
  if (!KINDS.includes(v.kind as ItemKind)) return 'tipo de registro desconhecido';
  if (!isStr(v.title)) return 'registro sem título';
  if (v.date !== null && !isLocalDate(v.date)) return 'data inválida';
  if (v.date === null && v.kind !== 'task') return 'compromisso ou conta sem data';
  if (v.time !== null && v.time !== undefined && !isLocalTime(v.time)) return 'horário inválido';
  if (v.priority !== 'high' && v.priority !== 'normal') return 'prioridade inválida';
  if (v.status !== 'pending' && v.status !== 'done') return 'situação inválida';
  if (v.kind === 'bill' && !isCents(v.amountCents)) return 'conta com valor inválido';
  if (v.paidOn != null && !isLocalDate(v.paidOn)) return 'data de pagamento inválida';
  if (!isIso(v.createdAt) || !isIso(v.updatedAt)) return 'datas de criação/atualização inválidas';
  if (v.recurrence != null) {
    const r = v.recurrence;
    if (!isObj(r) || !['daily', 'weekly', 'monthly'].includes(r.freq as string)) return 'repetição inválida';
    if (r.dayOfMonth !== undefined && !(Number.isInteger(r.dayOfMonth) && (r.dayOfMonth as number) >= 1 && (r.dayOfMonth as number) <= 31))
      return 'dia de repetição inválido';
    if (r.until != null && !isLocalDate(r.until)) return 'fim de repetição inválido';
    if (v.date === null) return 'repetição sem data inicial';
  }
  if (v.overrides !== undefined) {
    if (!isObj(v.overrides)) return 'ocorrências inválidas';
    for (const [k, o] of Object.entries(v.overrides)) {
      if (!isLocalDate(k)) return 'data de ocorrência inválida';
      const e = validateOverride(o as OccurrenceOverride);
      if (e) return e;
    }
  }
  return null;
}

function validateSettings(v: unknown): string | null {
  if (!isObj(v)) return 'configurações ausentes';
  if (!isStr(v.name)) return 'nome inválido';
  if (!isStr(v.timezone) || !isValidTimezone(v.timezone)) return 'fuso horário inválido';
  if (typeof v.reminderMinutes !== 'number' || v.reminderMinutes < 0) return 'antecedência inválida';
  if (v.highlights !== undefined && !isObj(v.highlights)) return 'destaques inválidos';
  return null;
}

/** Lê e valida o conteúdo de um arquivo de backup. Nada é gravado aqui. */
export function parseBackup(text: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'O arquivo não é um backup do Dia Leve (formato não reconhecido).' };
  }
  if (!isObj(data) || data.app !== BACKUP_APP) {
    return { ok: false, error: 'Este arquivo não é um backup do Dia Leve.' };
  }
  if (typeof data.version !== 'number') return { ok: false, error: 'Backup sem versão. Não foi possível ler.' };
  if (data.version > BACKUP_VERSION) {
    return {
      ok: false,
      error: 'Este backup foi feito por uma versão mais nova do Dia Leve. Atualize a página e tente de novo.',
    };
  }
  if (data.version < 1) return { ok: false, error: 'Versão de backup não suportada.' };
  if (!Array.isArray(data.items)) return { ok: false, error: 'O backup não contém a lista de lembretes.' };

  const ids = new Set<string>();
  for (let i = 0; i < data.items.length; i++) {
    const err = validateItem(data.items[i]);
    if (err) return { ok: false, error: `Registro ${i + 1} com problema: ${err}.` };
    const id = (data.items[i] as Item).id;
    if (ids.has(id)) return { ok: false, error: `Registro ${i + 1} repetido no arquivo.` };
    ids.add(id);
  }
  const sErr = validateSettings(data.settings);
  if (sErr) return { ok: false, error: `Configurações com problema: ${sErr}.` };

  const items = data.items as Item[];
  const settings = data.settings as Settings;
  const backup: BackupFile = {
    app: BACKUP_APP,
    version: data.version,
    exportedAt: isStr(data.exportedAt) ? data.exportedAt : '',
    items,
    settings: { ...settings, highlights: settings.highlights ?? {}, onboarded: true },
  };
  return {
    ok: true,
    backup,
    summary: {
      exportedAt: backup.exportedAt,
      tasks: items.filter((i) => i.kind === 'task').length,
      events: items.filter((i) => i.kind === 'event').length,
      bills: items.filter((i) => i.kind === 'bill').length,
      name: settings.name,
    },
  };
}
