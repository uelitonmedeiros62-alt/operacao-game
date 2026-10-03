/**
 * Valores em reais são sempre guardados como inteiros em centavos.
 * Nunca use ponto flutuante para somar dinheiro.
 */

/**
 * Converte texto digitado pelo usuário em centavos.
 * Aceita: "120", "120,50", "R$ 1.234,56", "187.50", "1.234", "0,5".
 * Retorna null quando não for possível entender o valor.
 */
export function parseBRL(input: string): number | null {
  if (typeof input !== 'string') return null;
  let s = input.trim().replace(/^R\$\s*/i, '').replace(/\s+/g, '');
  if (!s) return null;
  if (!/^\d[\d.,]*$/.test(s)) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let intPart: string;
  let decPart = '';

  if (lastComma >= 0) {
    // Vírgula é o separador decimal; pontos antes dela são milhares.
    intPart = s.slice(0, lastComma);
    decPart = s.slice(lastComma + 1);
    if (decPart.includes('.') || decPart.includes(',')) return null;
    if (!validThousands(intPart, '.')) return null;
    intPart = intPart.replace(/\./g, '');
  } else if (lastDot >= 0) {
    const after = s.slice(lastDot + 1);
    const dots = (s.match(/\./g) ?? []).length;
    if (dots === 1 && after.length > 0 && after.length <= 2) {
      // "187.50" → decimal
      intPart = s.slice(0, lastDot);
      decPart = after;
    } else {
      // "1.234" ou "1.234.567" → milhares
      if (!validThousands(s, '.')) return null;
      intPart = s.replace(/\./g, '');
    }
  } else {
    intPart = s;
  }

  if (decPart.length > 2) return null;
  if (intPart === '') intPart = '0';
  if (!/^\d+$/.test(intPart) || (decPart && !/^\d+$/.test(decPart))) return null;

  const cents = Number(intPart) * 100 + Number(decPart.padEnd(2, '0') || '0');
  if (!Number.isSafeInteger(cents)) return null;
  return cents;
}

function validThousands(s: string, sep: string): boolean {
  if (!s.includes(sep)) return true;
  const groups = s.split(sep);
  return groups[0].length >= 1 && groups[0].length <= 3 && groups.slice(1).every((g) => g.length === 3);
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 12050 → "R$ 120,50" (com espaço comum, não o espaço especial do Intl). */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100).replace(/ /g, ' ');
}

/** 12050 → "120,50" — usado para preencher campos de edição. */
export function centsToInput(cents: number | undefined | null): string {
  if (cents == null) return '';
  const neg = cents < 0;
  const abs = Math.abs(cents);
  const s = `${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
  return neg ? `-${s}` : s;
}

export function sumCents(values: Array<number | undefined>): number {
  return values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
}
