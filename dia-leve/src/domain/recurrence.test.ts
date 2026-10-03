import { occurrenceDates } from './recurrence';
import { expandItem, occurrencesBetween, overdue } from './occurrences';
import { createItem, deleteItem, editItem, postpone, setDone, type ItemDraft } from './mutations';
import type { Item } from './types';

const NOW = '2026-10-03T12:00:00.000Z';
const draft = (p: Partial<ItemDraft>): ItemDraft => ({
  kind: 'task',
  title: 'X',
  date: '2026-10-03',
  time: null,
  priority: 'normal',
  repeat: null,
  ...p,
});

describe('regras de repetição', () => {
  it('diária', () => {
    expect(occurrenceDates('2026-10-01', { freq: 'daily' }, '2026-10-03', '2026-10-05')).toEqual([
      '2026-10-03',
      '2026-10-04',
      '2026-10-05',
    ]);
  });

  it('semanal mantém o dia da semana', () => {
    expect(occurrenceDates('2026-10-02', { freq: 'weekly' }, '2026-10-03', '2026-10-31')).toEqual([
      '2026-10-09',
      '2026-10-16',
      '2026-10-23',
      '2026-10-30',
    ]);
  });

  it('mensal no dia 31 cai no último dia dos meses curtos e volta para 31', () => {
    expect(
      occurrenceDates('2026-01-31', { freq: 'monthly', dayOfMonth: 31 }, '2026-01-01', '2026-05-31'),
    ).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
  });

  it('mensal em ano bissexto', () => {
    expect(occurrenceDates('2028-01-30', { freq: 'monthly', dayOfMonth: 30 }, '2028-02-01', '2028-03-31')).toEqual([
      '2028-02-29',
      '2028-03-30',
    ]);
  });

  it('respeita data final', () => {
    expect(
      occurrenceDates('2026-10-01', { freq: 'daily', until: '2026-10-02' }, '2026-10-01', '2026-10-10'),
    ).toEqual(['2026-10-01', '2026-10-02']);
  });

  it('não gera duplicadas: mesma consulta, mesmo resultado', () => {
    const bill = createItem(draft({ kind: 'bill', amountCents: 100, date: '2026-01-31', repeat: 'monthly' }), NOW);
    const a = occurrencesBetween([bill], '2026-01-01', '2026-12-31');
    const b = occurrencesBetween([bill], '2026-01-01', '2026-12-31');
    expect(a.length).toBe(12);
    expect(new Set(a.map((o) => o.key)).size).toBe(12);
    expect(b.map((o) => o.key)).toEqual(a.map((o) => o.key));
  });
});

describe('ocorrências independentes', () => {
  let bill: Item;
  beforeEach(() => {
    bill = createItem(
      draft({ kind: 'bill', title: 'Aluguel', amountCents: 150000, date: '2026-10-31', repeat: 'monthly' }),
      NOW,
      'aluguel',
    );
  });

  it('pagar uma conta não paga a série inteira', () => {
    const paid = setDone(bill, '2026-11-30', true, NOW, '2026-11-29');
    const occ = occurrencesBetween([paid], '2026-10-01', '2026-12-31');
    expect(occ.map((o) => [o.date, o.status])).toEqual([
      ['2026-10-31', 'pending'],
      ['2026-11-30', 'done'],
      ['2026-12-31', 'pending'],
    ]);
    expect(occ[1].paidOn).toBe('2026-11-29');
  });

  it('desfazer pagamento', () => {
    const paid = setDone(bill, '2026-10-31', true, NOW, '2026-10-30');
    const undone = setDone(paid, '2026-10-31', false, NOW, '2026-10-30');
    expect(expandItem(undone, '2026-10-31', '2026-10-31')[0].status).toBe('pending');
  });

  it('editar somente esta ocorrência', () => {
    const { save } = editItem(
      bill,
      '2026-11-30',
      draft({ kind: 'bill', title: 'Aluguel + condomínio', amountCents: 180000, date: '2026-11-30', repeat: 'monthly' }),
      'this',
      NOW,
    );
    const occ = occurrencesBetween(save, '2026-10-01', '2026-12-31');
    expect(occ.map((o) => o.amountCents)).toEqual([150000, 180000, 150000]);
  });

  it('editar esta e as próximas divide a série sem duplicar', () => {
    const { save } = editItem(
      bill,
      '2026-12-31',
      draft({ kind: 'bill', title: 'Aluguel novo', amountCents: 160000, date: '2026-12-31', repeat: 'monthly' }),
      'following',
      NOW,
      'novo',
    );
    expect(save).toHaveLength(2);
    const occ = occurrencesBetween(save, '2026-10-01', '2027-02-28');
    expect(occ.map((o) => [o.date, o.amountCents])).toEqual([
      ['2026-10-31', 150000],
      ['2026-11-30', 150000],
      ['2026-12-31', 160000],
      ['2027-01-31', 160000],
      ['2027-02-28', 160000],
    ]);
  });

  it('excluir somente esta ocorrência', () => {
    const { save } = deleteItem(bill, '2026-11-30', 'this', NOW);
    expect(occurrencesBetween(save, '2026-10-01', '2026-12-31').map((o) => o.date)).toEqual([
      '2026-10-31',
      '2026-12-31',
    ]);
  });

  it('excluir esta e as próximas', () => {
    const { save } = deleteItem(bill, '2026-11-30', 'following', NOW);
    expect(occurrencesBetween(save, '2026-10-01', '2027-03-31').map((o) => o.date)).toEqual(['2026-10-31']);
    expect(deleteItem(bill, '2026-10-31', 'following', NOW).remove).toEqual(['aluguel']);
  });

  it('adiar uma ocorrência move só ela', () => {
    const ev = createItem(draft({ kind: 'event', date: '2026-10-05', time: '19:00', repeat: 'weekly' }), NOW);
    const moved = postpone(ev, '2026-10-12', '2026-10-14', '20:00', NOW);
    const occ = occurrencesBetween([moved], '2026-10-01', '2026-10-20');
    expect(occ.map((o) => [o.date, o.time])).toEqual([
      ['2026-10-05', '19:00'],
      ['2026-10-14', '20:00'],
      ['2026-10-19', '19:00'],
    ]);
    // A ocorrência movida aparece mesmo consultando só o novo dia.
    expect(occurrencesBetween([moved], '2026-10-14', '2026-10-14')).toHaveLength(1);
    expect(occurrencesBetween([moved], '2026-10-12', '2026-10-12')).toHaveLength(0);
  });

  it('contas recorrentes não pagas aparecem como atrasadas; tarefas diárias não acumulam', () => {
    const daily = createItem(draft({ date: '2026-09-01', repeat: 'daily' }), NOW);
    const late = overdue([bill, daily], '2027-01-05');
    expect(late.map((o) => o.date)).toEqual(['2026-10-31', '2026-11-30', '2026-12-31']);
  });
});
