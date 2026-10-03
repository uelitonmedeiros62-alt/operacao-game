import { centsToInput, formatBRL, parseBRL, sumCents } from './money';

describe('valores em centavos', () => {
  it.each([
    ['120,50', 12050],
    ['R$ 120,50', 12050],
    ['120', 12000],
    ['187,50', 18750],
    ['187.50', 18750],
    ['1.234,56', 123456],
    ['1.234', 123400],
    ['1.234.567,89', 123456789],
    ['0,5', 50],
    ['0,05', 5],
    ['10,', 1000],
  ])('interpreta "%s" como %i centavos', (input, cents) => {
    expect(parseBRL(input)).toBe(cents);
  });

  it.each(['', 'abc', '12,345', '1.23.4', '1,2,3', '-5', '12a'])('rejeita "%s"', (input) => {
    expect(parseBRL(input)).toBeNull();
  });

  it('não sofre erro de arredondamento (0,1 + 0,2)', () => {
    expect(sumCents([parseBRL('0,10')!, parseBRL('0,20')!])).toBe(30);
    expect(formatBRL(sumCents([10, 20]))).toBe('R$ 0,30');
  });

  it('formata em reais', () => {
    expect(formatBRL(12050)).toBe('R$ 120,50');
    expect(formatBRL(123456)).toBe('R$ 1.234,56');
    expect(formatBRL(0)).toBe('R$ 0,00');
  });

  it('converte de volta para o campo de edição', () => {
    expect(centsToInput(12050)).toBe('120,50');
    expect(centsToInput(5)).toBe('0,05');
    expect(parseBRL(centsToInput(98765))).toBe(98765);
  });
});
