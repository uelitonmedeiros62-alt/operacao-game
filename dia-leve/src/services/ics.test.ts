import { createItem } from '../domain/mutations';
import { buildIcs, upcomingForCalendar } from './ics';

const NOW = '2026-10-03T12:00:00.000Z';
describe('exportação .ics', () => {
  it('gera eventos com horário local e contas de dia inteiro', () => {
    const ev = createItem({ kind: 'event', title: 'Dentista, filha', date: '2026-10-09', time: '15:00', priority: 'normal', repeat: null }, NOW, 'e1');
    const bill = createItem({ kind: 'bill', title: 'Luz', date: '2026-10-15', time: null, priority: 'normal', amountCents: 18750, repeat: null }, NOW, 'b1');
    const ics = buildIcs(upcomingForCalendar([ev, bill], '2026-10-03', true), new Date(NOW));
    expect(ics).toContain('DTSTART:20261009T150000');
    expect(ics).toContain('DTEND:20261009T160000');
    expect(ics).toContain('SUMMARY:Dentista\\, filha');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261015');
    expect(ics).toContain('Pagar: Luz (R$ 187\\,50)');
    expect(upcomingForCalendar([ev, bill], '2026-10-03', false)).toHaveLength(1);
  });
});
