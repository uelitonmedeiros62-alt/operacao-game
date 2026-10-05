import { addDays, daysInMonth, formatShort, makeDate, parts, weekday } from '../domain/dates';
import { parseBRL } from '../domain/money';
import type { Frequency, ItemKind, LocalDate, LocalTime, Priority } from '../domain/types';
import type { InterpretContext, Interpreter, ParsedDraft } from './types';

/**
 * Interpretador local baseado em regras para frases comuns em português.
 * Não é uma IA: reconhece padrões como "amanhã", "dia 10", "sexta às 15h",
 * "de 120 reais". Quando algo não fica claro, deixa o campo vazio e avisa.
 */

const W = '[\\p{L}\\p{N}]'; // caractere de palavra com acentos
// Início de palavra sem "lookbehind" (não suportado no Safari antes do iOS 16.4):
// consome o caractere anterior, o que é inofensivo porque o trecho é trocado por espaço.
const B = `(?:^|[^\\p{L}\\p{N}])`;
const E = `(?!${W})`; // fim de palavra

function re(src: string, flags = 'iu'): RegExp {
  return new RegExp(src.replace(/\\b<|\\b>/g, (m) => (m === '\\b<' ? B : E)), flags);
}

const WEEKDAYS: Array<[RegExp, number]> = [
  [/^domingo/i, 0],
  [/^segunda/i, 1],
  [/^ter[cç]a/i, 2],
  [/^quarta/i, 3],
  [/^quinta/i, 4],
  [/^sexta/i, 5],
  [/^s[aá]bado/i, 6],
];
const WD_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const WD_SRC = '(domingo|segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado)(?:[- ]feira)?s?';

const MONTHS = [
  'janeiro', 'fevereiro', 'mar[cç]o', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const MONTH_SRC = `(${MONTHS.join('|')})`;

const NUM = '(\\d{1,3}(?:\\.\\d{3})+(?:,\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?)';

const BILL_WORDS = re(
  '\\b<(conta|boleto|fatura|mensalidade|aluguel|condom[ií]nio|parcela|iptu|ipva|presta[cç][aã]o|carn[eê])\\b>',
);
const PAY_VERB = re('^\\s*(pagar|paga|pague)\\b>');
const EVENT_WORDS = re(
  '\\b<(reuni[aã]o|consulta|dentista|m[eé]dic[oa]|exame|entrevista|anivers[aá]rio|festa|aula|culto|missa|compromisso|encontro|almo[cç]o com|jantar com|viagem|voo|show|evento|terapia|academia|pediatra)\\b>',
);

function weekdayIndex(word: string): number {
  for (const [r, i] of WEEKDAYS) if (r.test(word)) return i;
  return -1;
}

function monthIndex(word: string): number {
  const w = word.toLowerCase().replace('ç', 'c');
  return ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'].indexOf(w) + 1;
}

/** Palavras terminadas como verbo (-ar/-er/-ir) que normalmente não são verbos. */
const NOT_VERBS = new Set([
  'açúcar', 'acucar', 'mulher', 'colher', 'celular', 'lugar', 'bar', 'mar', 'lar', 'par', 'ar', 'qualquer',
  'talher', 'dólar', 'dolar', 'militar', 'familiar', 'escolar', 'popular', 'ímpar', 'altar', 'jantar',
  'almoçar', 'polegar', 'pomar', 'radar', 'sonar', 'luar', 'olhar', 'elixir', 'faquir', 'ser', 'ter',
]);

function isVerbLike(word: string): boolean {
  if (word.length < 3 || /^\p{Lu}/u.test(word)) return false;
  const w = word.toLowerCase();
  return /(?:ar|er|ir|ôr|por)$/u.test(w) && !NOT_VERBS.has(w);
}

/** Divide o texto em frases independentes ("… e levar …", "…; …", "… também …"). */
export function splitClauses(text: string): string[] {
  const out: string[] = [];
  for (const sentence of text.split(/[\n;]+|\.(?=\s|$)/u)) {
    const joiner = /(,\s*(?:e\s+)?|\s+e\s+(?:depois\s+)?|\s+(?:e\s+)?tamb[eé]m\s+)(?=(\p{L}+))/giu;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = joiner.exec(sentence))) {
      const isAlso = /tamb[eé]m/i.test(m[1]);
      if (isAlso || isVerbLike(m[2])) {
        out.push(sentence.slice(last, m.index));
        last = m.index + m[1].length;
      }
    }
    out.push(sentence.slice(last));
  }
  return out.map((s) => s.trim()).filter((s) => /\p{L}/u.test(s));
}

interface Cursor {
  rest: string;
}

/** Procura o padrão no texto restante; se achar, remove o trecho e devolve o resultado. */
function take(c: Cursor, pattern: RegExp): RegExpExecArray | null {
  const m = pattern.exec(c.rest);
  if (!m) return null;
  c.rest = `${c.rest.slice(0, m.index)} ${c.rest.slice(m.index + m[0].length)}`;
  return m;
}

function nextDayOfMonth(today: LocalDate, day: number): { date: LocalDate; warning?: string } {
  const t = parts(today);
  let y = t.y;
  let m = t.m;
  if (day < t.d) {
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  let skipped = false;
  for (let i = 0; i < 12 && day > daysInMonth(y, m); i++) {
    skipped = true;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  const date = makeDate(y, m, day);
  return {
    date,
    warning: skipped ? `Este mês não tem dia ${day}. Entendi como ${formatShort(date)} — confira.` : undefined,
  };
}

function interpretClause(clause: string, ctx: InterpretContext): ParsedDraft {
  const c: Cursor = { rest: clause };
  const warnings: string[] = [];
  let date: LocalDate | null = null;
  let time: LocalTime | null = null;
  let amountCents: number | undefined;
  let repeat: Frequency | null = null;
  let monthlyDay: number | null = null;
  let priority: Priority = 'normal';
  let m: RegExpExecArray | null;

  // ----- Prioridade -----
  if (take(c, re('\\b<(urgente|important[ea]|prioridade|priorit[aá]ri[oa])\\b>'))) priority = 'high';

  // ----- Repetição -----
  if ((m = take(c, re('\\b<todo\\s+dia\\s+(\\d{1,2})\\b>(?:\\s+de\\s+cada\\s+m[eê]s)?')))) {
    const d = Number(m[1]);
    if (d >= 1 && d <= 31) {
      repeat = 'monthly';
      monthlyDay = d;
    }
  } else if (take(c, re('\\b<(todo\\s+m[eê]s|todos\\s+os\\s+meses|mensal(?:mente)?)\\b>'))) {
    repeat = 'monthly';
  } else if (take(c, re('\\b<(todos\\s+os\\s+dias|todo\\s+dia|diariamente)\\b>'))) {
    repeat = 'daily';
  } else if ((m = take(c, re(`\\b<(?:toda|todo|todas\\s+as|todos\\s+os)\\s+${WD_SRC}\\b>`)))) {
    repeat = 'weekly';
    const wd = weekdayIndex(m[1]);
    const diff = (wd - weekday(ctx.today) + 7) % 7;
    date = addDays(ctx.today, diff);
  } else if (take(c, re('\\b<(toda\\s+semana|todas\\s+as\\s+semanas|semanalmente)\\b>'))) {
    repeat = 'weekly';
  }

  // ----- Valor -----
  const isPay = PAY_VERB.test(clause);
  const billish = isPay || BILL_WORDS.test(clause);
  const moneyPatterns = [
    re(`(?:\\b<(?:de|no\\s+valor\\s+de|valor\\s+de|por)\\s+)?R\\$\\s*${NUM}(?:\\s+e\\s+(\\d{1,2})\\s+centavos)?`),
    re(`(?:\\b<(?:de|no\\s+valor\\s+de|valor\\s+de|por)\\s+)?${NUM}\\s*(?:reais|real|conto|pila)\\b>(?:\\s+e\\s+(\\d{1,2})\\s+centavos)?`),
  ];
  if (billish) {
    moneyPatterns.push(
      re(
        `\\b<(?:de|no\\s+valor\\s+de|valor\\s+de|por)\\s+${NUM}(?![\\d/:]|\\s*(?:h\\b>|hs\\b>|horas?\\b>|de\\s+${MONTH_SRC}))`,
      ),
    );
  }
  for (const p of moneyPatterns) {
    if ((m = take(c, p))) {
      const base = parseBRL(m[1]);
      if (base != null) {
        const extra = m[2] ? Number(m[2]) : 0;
        amountCents = m[2] ? Math.floor(base / 100) * 100 + extra : base;
      }
      break;
    }
  }

  // ----- Horário -----
  let hour: number | null = null;
  let minute = 0;
  let explicitHourMark = false;
  if (take(c, re('\\b<(?:ao\\s+|à\\s+|a\\s+)?meio[- ]dia\\b>(?:\\s+e\\s+meia)?'))) {
    hour = 12;
    explicitHourMark = true;
  } else if (take(c, re('\\b<(?:à\\s+|a\\s+)?meia[- ]noite\\b>'))) {
    hour = 0;
    explicitHourMark = true;
  } else if ((m = take(c, re('(?:\\b<(?:às|as|a\\s+partir\\s+das|lá\\s+pelas|pelas|das)\\s+)?(\\d{1,2})\\s*(?::|h)\\s*(\\d{2})\\b>(?:\\s*min)?')))) {
    hour = Number(m[1]);
    minute = Number(m[2]);
    explicitHourMark = true;
  } else if ((m = take(c, re('(?:\\b<(?:às|as|a\\s+partir\\s+das|lá\\s+pelas|pelas|das)\\s+)?(\\d{1,2})\\s*(?:h|hs|hrs?|horas?)\\b>(?:\\s+e\\s+meia)?')))) {
    hour = Number(m[1]);
    if (/e\s+meia$/i.test(m[0])) minute = 30;
    explicitHourMark = true;
  } else if ((m = take(c, re('\\b<(?:às|as)\\s+(\\d{1,2})(?![\\d/.,])\\b>(?:\\s+e\\s+meia)?')))) {
    hour = Number(m[1]);
    if (/e\s+meia$/i.test(m[0])) minute = 30;
  }
  const period = take(c, re('\\b<(?:da|de|pela)\\s+(manh[aã]|tarde|noite|madrugada)\\b>'));
  if (hour != null) {
    if (period) {
      const p = period[1].toLowerCase();
      if ((p === 'tarde' || p === 'noite') && hour < 12) hour += 12;
      if (p === 'noite' && hour === 24) hour = 0;
    } else if (!explicitHourMark && hour >= 1 && hour <= 7) {
      warnings.push(`Confira se ${hour}h é de manhã ou à tarde/noite.`);
    }
    if (hour > 23 || minute > 59) {
      warnings.push('Não entendi o horário. Informe novamente.');
      hour = null;
    } else {
      time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
  }

  // ----- Data -----
  if (!date) {
    if (take(c, re('\\b<depois\\s+de\\s+amanh[aã]\\b>'))) {
      date = addDays(ctx.today, 2);
    } else if (take(c, re('\\b<(?:para\\s+|pra\\s+|de\\s+)?amanh[aã]\\b>'))) {
      date = addDays(ctx.today, 1);
    } else if (take(c, re('\\b<(?:para\\s+|pra\\s+|até\\s+)?hoje\\b>(?:\\s+mesmo)?'))) {
      date = ctx.today;
    } else if ((m = take(c, re('\\b<(?:no\\s+|para\\s+o\\s+|até\\s+o\\s+)?(?:dia\\s+)?(\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{2,4}))?\\b>')))) {
      date = explicitDate(Number(m[1]), Number(m[2]), m[3], ctx.today, warnings);
    } else if ((m = take(c, re(`\\b<(?:no\\s+|para\\s+o\\s+|até\\s+o\\s+)?(?:dia\\s+)?(\\d{1,2})\\s+de\\s+${MONTH_SRC}(?:\\s+de\\s+(\\d{4}))?\\b>`)))) {
      date = explicitDate(Number(m[1]), monthIndex(m[2]), m[3], ctx.today, warnings);
    } else if ((m = take(c, re('\\b<(?:no\\s+|para\\s+o\\s+|até\\s+o\\s+|vence\\s+)?dia\\s+(\\d{1,2})\\b>')))) {
      const d = Number(m[1]);
      if (d >= 1 && d <= 31) {
        if (repeat === 'monthly' && !monthlyDay) monthlyDay = d;
        const r = nextDayOfMonth(ctx.today, d);
        date = r.date;
        if (r.warning && repeat !== 'monthly') warnings.push(r.warning);
      } else {
        warnings.push('Não entendi o dia. Escolha a data.');
      }
    } else if ((m = take(c, re(`\\b<(?:na\\s+|no\\s+|nesta\\s+|neste\\s+|esta\\s+|este\\s+|essa\\s+|esse\\s+|pr[oó]xim[ao]\\s+|até\\s+(?:a\\s+|o\\s+)?)?${WD_SRC}(?:\\s+que\\s+vem)?\\b>`)))) {
      const wd = weekdayIndex(m[1]);
      const next = /pr[oó]xim|que\s+vem/i.test(m[0]);
      let diff = (wd - weekday(ctx.today) + 7) % 7;
      if (diff === 0 && next) diff = 7;
      date = addDays(ctx.today, diff);
      if (diff === 0) warnings.push(`Hoje já é ${WD_NAMES[wd]}: entendi como hoje. Confira.`);
      else if (/que\s+vem/i.test(m[0])) warnings.push('Confira se a data escolhida é a semana certa.');
      if (repeat === 'weekly') {
        /* já tratado acima */
      }
    } else if (take(c, re('\\b<(?:na\\s+)?(?:pr[oó]xima\\s+semana|semana\\s+que\\s+vem)\\b>'))) {
      warnings.push('Não ficou claro o dia exato da próxima semana. Escolha a data.');
    }
  }

  if (repeat === 'monthly' && monthlyDay && !date) {
    date = nextDayOfMonth(ctx.today, monthlyDay).date;
    if (monthlyDay > daysInMonth(parts(date).y, parts(date).m)) {
      date = makeDate(parts(date).y, parts(date).m, daysInMonth(parts(date).y, parts(date).m));
    }
  }
  if (repeat && !date && repeat !== 'monthly') date = ctx.today;

  // ----- Tipo -----
  let kind: ItemKind = 'task';
  if (isPay || (billish && amountCents != null) || (repeat === 'monthly' && amountCents != null)) kind = 'bill';
  else if (time || EVENT_WORDS.test(clause)) kind = 'event';

  // Ajusta repetições não permitidas para o tipo.
  if (kind === 'bill' && repeat && repeat !== 'monthly') {
    warnings.push('Contas só repetem todo mês. Ajuste se precisar.');
    repeat = null;
  }
  if (kind === 'event' && repeat === 'daily') {
    warnings.push('Compromissos podem repetir toda semana. Para todo dia, use uma tarefa.');
    repeat = null;
  }
  if (kind === 'event' && repeat === 'monthly') repeat = null;
  if (kind === 'task' && repeat === 'monthly') {
    warnings.push('Tarefas podem repetir todo dia ou toda semana.');
    repeat = null;
  }

  // ----- Título -----
  let title = c.rest;
  if (kind === 'bill') {
    title = title.replace(re('^\\s*(?:pagar|paga|pague)\\s+(?:a\\s+|o\\s+)?(?:(?:conta|fatura|boleto)\\s+(?:de|da|do)\\s+)?'), '');
  }
  title = cleanupTitle(title);
  if (!title) {
    title = cleanupTitle(clause);
    warnings.push('Confira o nome do lembrete.');
  }

  // ----- Avisos de dados faltando (nunca inventamos) -----
  if (kind === 'bill') {
    if (amountCents == null) warnings.push('Informe o valor da conta.');
    if (!date) warnings.push('Informe a data de vencimento.');
  } else if (kind === 'event') {
    if (!date) warnings.push('Informe a data do compromisso.');
    if (!time) warnings.push('Sem horário: ficará como "dia inteiro". Adicione um horário se quiser.');
  } else if (!date) {
    warnings.push('Sem data: vai para a lista "Sem data".');
  }

  return {
    kind,
    title,
    date,
    time: kind === 'bill' ? null : time,
    priority,
    amountCents: kind === 'bill' ? amountCents : undefined,
    repeat,
    source: clause,
    warnings,
  };
}

function explicitDate(d: number, mo: number, yRaw: string | undefined, today: LocalDate, warnings: string[]): LocalDate | null {
  const t = parts(today);
  let y = yRaw ? Number(yRaw) : t.y;
  if (yRaw && yRaw.length === 2) y = 2000 + y;
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) {
    warnings.push('Essa data não existe. Escolha a data correta.');
    return null;
  }
  let date = makeDate(y, mo, d);
  if (!yRaw && date < today) {
    date = makeDate(y + 1, mo, Math.min(d, daysInMonth(y + 1, mo)));
    warnings.push(`Como essa data já passou neste ano, entendi como ${formatShort(date)} de ${y + 1}. Confira.`);
  }
  return date;
}

const DANGLING = /^(?:e|na|no|nas|nos|de|do|da|às|as|a|o|para|pra|em|até|valor|dia|que|com|por|,|-)$/i;

function cleanupTitle(s: string): string {
  let words = s.replace(/[.,;!?]+(?=\s|$)/g, ' ').split(/\s+/).filter(Boolean);
  while (words.length && DANGLING.test(words[words.length - 1])) words.pop();
  while (words.length && /^(?:e|,|-)$/i.test(words[0])) words.shift();
  const out = words.join(' ').trim();
  return out ? out.charAt(0).toLocaleUpperCase('pt-BR') + out.slice(1) : '';
}

export function interpretLocally(text: string, ctx: InterpretContext): ParsedDraft[] {
  return splitClauses(text).map((cl) => interpretClause(cl, ctx));
}

export const localInterpreter: Interpreter = {
  id: 'local',
  description:
    'Reconhecimento simples de frases comuns, feito no próprio aparelho. Pode errar: confira antes de salvar.',
  requiresInternet: false,
  async interpret(text, ctx) {
    return { drafts: interpretLocally(text, ctx) };
  },
};
