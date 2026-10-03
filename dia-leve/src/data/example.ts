import { addDays, parts } from '../domain/dates';
import { createItem, newId, type ItemDraft } from '../domain/mutations';
import type { Item, LocalDate } from '../domain/types';

/**
 * Dados fictícios do "Explorar um exemplo". Todos ficam marcados com
 * `isExample` para serem identificados na tela e removidos de uma vez.
 */
export function buildExample(today: LocalDate, now: string): Item[] {
  const d = (n: number) => addDays(today, n);
  const day = parts(today).d;
  const drafts: Array<Partial<ItemDraft> & Pick<ItemDraft, 'kind' | 'title'>> = [
    { kind: 'task', title: 'Comprar pão e leite', date: today, priority: 'high' },
    { kind: 'task', title: 'Responder mensagem da escola', date: today },
    { kind: 'task', title: 'Separar roupas para lavar', date: today },
    { kind: 'task', title: 'Regar as plantas', date: today, repeat: 'weekly' },
    { kind: 'task', title: 'Marcar revisão do carro', date: d(-1) },
    { kind: 'task', title: 'Trocar lâmpada da cozinha', date: null },
    { kind: 'event', title: 'Reunião do trabalho', date: today, time: '14:00' },
    { kind: 'event', title: 'Buscar as crianças', date: today, time: '17:00' },
    { kind: 'event', title: 'Levar filha ao dentista', date: d(2), time: '15:00' },
    { kind: 'event', title: 'Aula de natação', date: d(1), time: '19:00', repeat: 'weekly' },
    { kind: 'bill', title: 'Internet', date: today, amountCents: 12000, category: 'Internet e telefone', repeat: 'monthly' },
    { kind: 'bill', title: 'Luz', date: d(5), amountCents: 18750, category: 'Água, luz e gás' },
    { kind: 'bill', title: 'Aluguel', date: d(day > 25 ? 3 : 7), amountCents: 150000, category: 'Moradia', repeat: 'monthly' },
    { kind: 'bill', title: 'Farmácia', date: d(-2), amountCents: 4590, category: 'Saúde' },
  ];
  return drafts.map((p) => ({
    ...createItem(
      {
        date: null,
        time: null,
        priority: 'normal',
        repeat: null,
        ...p,
      } as ItemDraft,
      now,
      newId(),
    ),
    isExample: true,
  }));
}
