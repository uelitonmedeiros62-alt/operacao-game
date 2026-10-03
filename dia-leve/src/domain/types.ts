/**
 * Modelo de dados do Dia Leve.
 *
 * Regras importantes:
 * - Datas sem horário são guardadas como texto "AAAA-MM-DD" (LocalDate) e
 *   horários como "HH:mm" (LocalTime). Nunca convertemos esses valores para
 *   UTC, assim um compromisso do dia 10 continua no dia 10 em qualquer fuso.
 * - Instantes reais (criação, atualização, conclusão) usam ISO 8601 em UTC.
 * - Valores monetários são inteiros em centavos.
 */

export type LocalDate = string; // AAAA-MM-DD
export type LocalTime = string; // HH:mm
export type IsoInstant = string; // 2026-10-03T12:00:00.000Z

export type ItemKind = 'task' | 'event' | 'bill';
export type Priority = 'high' | 'normal';
export type ItemStatus = 'pending' | 'done';

export type Frequency = 'daily' | 'weekly' | 'monthly';

export interface Recurrence {
  freq: Frequency;
  /** Para contas mensais: dia de referência (1–31). Meses mais curtos usam o último dia. */
  dayOfMonth?: number;
  /** Última data possível (inclusive). Usado ao encerrar uma série. */
  until?: LocalDate | null;
}

/** Alterações de uma ocorrência específica de um item recorrente. */
export interface OccurrenceOverride {
  date?: LocalDate;
  time?: LocalTime | null;
  title?: string;
  notes?: string;
  amountCents?: number;
  status?: ItemStatus;
  completedAt?: IsoInstant | null;
  paidOn?: LocalDate | null;
  deleted?: boolean;
}

export interface Item {
  id: string;
  kind: ItemKind;
  title: string;
  notes?: string;
  /** Data (início da série, se recorrente). null = "Sem data" (apenas tarefas). */
  date: LocalDate | null;
  /** Horário; null = sem horário / dia inteiro. */
  time: LocalTime | null;
  priority: Priority;
  /** Somente contas. */
  amountCents?: number;
  category?: string;
  /** Situação para itens não recorrentes. Em séries, cada ocorrência tem a sua em `overrides`. */
  status: ItemStatus;
  completedAt?: IsoInstant | null;
  /** Data em que a conta foi paga. */
  paidOn?: LocalDate | null;
  recurrence?: Recurrence | null;
  /** Chave = data original da ocorrência. */
  overrides?: Record<LocalDate, OccurrenceOverride>;
  /** Marcado quando o item faz parte do exemplo de demonstração. */
  isExample?: boolean;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}

/** Uma ocorrência concreta, pronta para exibir na interface. */
export interface Occurrence {
  /** Identificador estável: id do item, ou id + data original em séries. */
  key: string;
  itemId: string;
  /** Data original da ocorrência dentro da série (null para itens únicos). */
  originalDate: LocalDate | null;
  kind: ItemKind;
  title: string;
  notes?: string;
  date: LocalDate | null;
  time: LocalTime | null;
  priority: Priority;
  amountCents?: number;
  category?: string;
  status: ItemStatus;
  completedAt?: IsoInstant | null;
  paidOn?: LocalDate | null;
  isRecurring: boolean;
  recurrence?: Recurrence | null;
  isExample?: boolean;
  createdAt: IsoInstant;
}

export interface Settings {
  name: string;
  timezone: string;
  onboarded: boolean;
  /** Alertas dentro do app quando ele está aberto. */
  inAppAlerts: boolean;
  /** Antecedência dos alertas em minutos. */
  reminderMinutes: number;
  /** Também mostrar notificação do navegador (com o app aberto). */
  systemNotifications: boolean;
  /** Tarefas destacadas manualmente: data → chaves de ocorrência. */
  highlights: Record<LocalDate, string[]>;
}

export const KIND_LABEL: Record<ItemKind, string> = {
  task: 'Tarefa',
  event: 'Compromisso',
  bill: 'Conta',
};

export const BILL_CATEGORIES = [
  'Moradia',
  'Água, luz e gás',
  'Internet e telefone',
  'Mercado',
  'Saúde',
  'Educação',
  'Transporte',
  'Cartão de crédito',
  'Lazer',
  'Outros',
];
