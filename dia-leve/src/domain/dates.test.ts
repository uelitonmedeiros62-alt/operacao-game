import {
  addDays,
  addMonthsClamped,
  formatLong,
  formatTime,
  isLocalDate,
  nowIn,
  startOfWeek,
  todayIn,
  weekDates,
  weekday,
} from './dates';

describe('datas locais', () => {
  it('valida datas', () => {
    expect(isLocalDate('2026-02-28')).toBe(true);
    expect(isLocalDate('2026-02-29')).toBe(false);
    expect(isLocalDate('2028-02-29')).toBe(true);
    expect(isLocalDate('2026-13-01')).toBe(false);
    expect(isLocalDate('3/10/2026')).toBe(false);
  });

  it('soma dias atravessando mês e ano', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('soma meses mantendo o dia de referência', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2026-02-28', 1, 31)).toBe('2026-03-31');
    expect(addMonthsClamped('2026-12-15', 2)).toBe('2027-02-15');
  });

  it('semana começa na segunda-feira', () => {
    expect(weekday('2026-10-03')).toBe(6); // sábado
    expect(startOfWeek('2026-10-03')).toBe('2026-09-28');
    expect(startOfWeek('2026-10-04')).toBe('2026-09-28'); // domingo
    expect(weekDates('2026-10-05')[6]).toBe('2026-10-11');
  });

  it('usa o fuso do usuário para saber o dia de hoje', () => {
    const instant = new Date('2026-10-04T01:30:00Z'); // 22h30 do dia 3 em São Paulo
    expect(todayIn('America/Sao_Paulo', instant)).toBe('2026-10-03');
    expect(todayIn('Europe/Lisbon', instant)).toBe('2026-10-04');
    expect(nowIn('America/Sao_Paulo', instant).time).toBe('22:30');
    expect(todayIn('America/Manaus', instant)).toBe('2026-10-03');
  });

  it('não muda o dia por causa do fuso ao formatar', () => {
    expect(formatLong('2026-10-03')).toBe('sábado, 3 de outubro');
    expect(formatTime('15:00')).toBe('15h');
    expect(formatTime('09:30')).toBe('9h30');
  });
});
