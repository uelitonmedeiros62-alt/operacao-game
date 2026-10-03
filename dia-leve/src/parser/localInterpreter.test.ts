import { interpretLocally, splitClauses } from './localInterpreter';

// Sábado, 3 de outubro de 2026
const ctx = { today: '2026-10-03', now: '09:00' };
const one = (text: string) => {
  const r = interpretLocally(text, ctx);
  expect(r).toHaveLength(1);
  return r[0];
};

describe('interpretador local', () => {
  it('exemplo principal: conta + compromisso', () => {
    const r = interpretLocally(
      'Pagar internet de 120 reais dia 10 e levar minha filha ao dentista na sexta às 15h.',
      ctx,
    );
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ kind: 'bill', title: 'Internet', amountCents: 12000, date: '2026-10-10' });
    expect(r[1]).toMatchObject({
      kind: 'event',
      title: 'Levar minha filha ao dentista',
      date: '2026-10-09',
      time: '15:00',
    });
  });

  it('Comprar pão amanhã', () => {
    expect(one('Comprar pão amanhã.')).toMatchObject({ kind: 'task', title: 'Comprar pão', date: '2026-10-04', time: null });
  });

  it('Reunião sexta às 14h', () => {
    expect(one('Reunião sexta às 14h.')).toMatchObject({ kind: 'event', title: 'Reunião', date: '2026-10-09', time: '14:00' });
  });

  it('Pagar luz de 187,50 dia 15', () => {
    expect(one('Pagar luz de 187,50 dia 15.')).toMatchObject({
      kind: 'bill',
      title: 'Luz',
      amountCents: 18750,
      date: '2026-10-15',
    });
  });

  it('Buscar as crianças hoje às 17h', () => {
    expect(one('Buscar as crianças hoje às 17h.')).toMatchObject({
      kind: 'event',
      title: 'Buscar as crianças',
      date: '2026-10-03',
      time: '17:00',
    });
  });

  it('não inventa dados: conta sem valor e sem data', () => {
    const r = one('Pagar o condomínio');
    expect(r.kind).toBe('bill');
    expect(r.amountCents).toBeUndefined();
    expect(r.date).toBeNull();
    expect(r.warnings.join(' ')).toMatch(/valor/);
    expect(r.warnings.join(' ')).toMatch(/vencimento/);
  });

  it('tarefa sem data vai para "Sem data"', () => {
    const r = one('Trocar a lâmpada');
    expect(r).toMatchObject({ kind: 'task', date: null });
    expect(r.warnings.join(' ')).toMatch(/Sem data/);
  });

  it('não divide "pão e açúcar"', () => {
    expect(splitClauses('Comprar pão e açúcar amanhã')).toHaveLength(1);
    expect(one('Comprar pão e açúcar amanhã').title).toBe('Comprar pão e açúcar');
  });

  it('dia que já passou no mês vai para o mês seguinte', () => {
    expect(one('Pagar água de 80 dia 2').date).toBe('2026-11-02');
  });

  it('dia 31 em mês sem 31 pede confirmação', () => {
    const r = interpretLocally('Pagar cartão de 300 dia 31', { today: '2026-11-05', now: '09:00' })[0];
    expect(r.date).toBe('2026-12-31');
    expect(r.warnings.join(' ')).toMatch(/não tem dia 31/);
  });

  it('dia da semana igual a hoje pede confirmação', () => {
    const r = one('Feira no sábado');
    expect(r.date).toBe('2026-10-03');
    expect(r.warnings.join(' ')).toMatch(/Confira/);
  });

  it('próxima + dia de hoje pula uma semana', () => {
    expect(one('Reunião próximo sábado às 10h').date).toBe('2026-10-10');
  });

  it('formatos de horário', () => {
    expect(one('Consulta amanhã 9h30').time).toBe('09:30');
    expect(one('Consulta amanhã às 8:15').time).toBe('08:15');
    expect(one('Jantar com amigos sábado às 8 da noite').time).toBe('20:00');
    expect(one('Almoço com a Bia amanhã ao meio-dia').time).toBe('12:00');
  });

  it('horário ambíguo pede confirmação', () => {
    const r = one('Reunião amanhã às 3');
    expect(r.time).toBe('03:00');
    expect(r.warnings.join(' ')).toMatch(/manhã ou à tarde/);
  });

  it('datas explícitas', () => {
    expect(one('Consulta dia 20/10 às 10h').date).toBe('2026-10-20');
    expect(one('Exame 5 de novembro').date).toBe('2026-11-05');
    expect(one('Viagem 15/12/2026').date).toBe('2026-12-15');
  });

  it('valores com R$ e milhares', () => {
    expect(one('Pagar aluguel R$ 1.500,00 dia 5').amountCents).toBe(150000);
    expect(one('Pagar escola 120 reais e 50 centavos amanhã').amountCents).toBe(12050);
  });

  it('não confunde data com valor', () => {
    const r = one('Pagar boleto dia 10 de novembro');
    expect(r.amountCents).toBeUndefined();
    expect(r.date).toBe('2026-11-10');
  });

  it('repetições', () => {
    expect(one('Pagar aluguel de 1500 todo dia 31')).toMatchObject({ kind: 'bill', repeat: 'monthly', date: '2026-10-31' });
    expect(one('Tomar remédio todo dia')).toMatchObject({ kind: 'task', repeat: 'daily', date: '2026-10-03' });
    expect(one('Aula de inglês toda terça às 19h')).toMatchObject({
      kind: 'event',
      repeat: 'weekly',
      date: '2026-10-06',
      time: '19:00',
    });
  });

  it('prioridade', () => {
    expect(one('Ligar para o banco urgente amanhã').priority).toBe('high');
  });

  it('preserva o texto original', () => {
    const r = one('Ligar para a vó amanhã');
    expect(r.source).toBe('Ligar para a vó amanhã');
  });
});
