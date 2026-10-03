import { readFileSync } from 'node:fs';
import { emptyForm, validateForm } from './formModel';

// Lê os tokens de cor do CSS e confere o contraste mínimo WCAG AA (4,5:1 para texto).
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const token = (name: string) => {
  const m = new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(css);
  if (!m) throw new Error(`token ${name} ausente`);
  return m[1];
};
function lum(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

describe('contraste das cores', () => {
  it.each([
    ['text', 'bg'],
    ['muted', 'bg'],
    ['muted', 'surface'],
    ['primary', 'surface'],
    ['primary-strong', 'primary-soft'],
    ['danger', 'danger-soft'],
    ['warn-text', 'warn-soft'],
    ['ok-text', 'ok-soft'],
    ['event', 'event-soft'],
    ['bill', 'bill-soft'],
    ['task', 'task-soft'],
  ])('%s sobre %s ≥ 4,5:1', (fg, bg) => {
    expect(ratio(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it('texto branco sobre o verde-petróleo', () => {
    expect(ratio('#ffffff', token('primary'))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('formulário de conta', () => {
  it('registra R$ 120,50 exatamente como 12050 centavos', () => {
    const f = { ...emptyForm('bill', '2026-10-20'), title: 'Escola', amount: '120,50' };
    const r = validateForm(f);
    expect('draft' in r && r.draft.amountCents).toBe(12050);
  });
  it('exige valor e data na conta', () => {
    const r = validateForm({ ...emptyForm('bill', null), title: 'Luz' });
    expect('errors' in r && r.errors).toMatchObject({ amount: expect.any(String), date: expect.any(String) });
  });
  it('tarefa sem data é permitida', () => {
    const r = validateForm({ ...emptyForm('task', null), title: 'Trocar lâmpada' });
    expect('draft' in r && r.draft.date).toBeNull();
  });
});
