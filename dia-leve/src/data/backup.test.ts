import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { createItem, setDone } from '../domain/mutations';
import type { Settings } from '../domain/types';
import { createBackup, parseBackup } from './backup';
import { IndexedDbRepository } from './indexedDbRepository';

const NOW = '2026-10-03T12:00:00.000Z';
const settings: Settings = {
  name: 'Ana',
  timezone: 'America/Sao_Paulo',
  onboarded: true,
  inAppAlerts: true,
  reminderMinutes: 30,
  systemNotifications: false,
  highlights: {},
};

function sample() {
  const task = createItem({ kind: 'task', title: 'Comprar pão', date: '2026-10-04', time: null, priority: 'normal', repeat: null }, NOW, 't1');
  const bill = createItem(
    { kind: 'bill', title: 'Internet', date: '2026-10-10', time: null, priority: 'normal', amountCents: 12050, repeat: 'monthly' },
    NOW,
    'b1',
  );
  return [task, setDone(bill, '2026-10-10', true, NOW, '2026-10-09')];
}

describe('backup', () => {
  it('exporta e restaura exatamente os mesmos dados', async () => {
    const repo = new IndexedDbRepository(new IDBFactory());
    await repo.saveItems(sample());
    await repo.saveSettings(settings);
    const json = JSON.stringify(createBackup(await repo.loadItems(), (await repo.loadSettings()) as Settings));

    const parsed = parseBackup(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.summary).toMatchObject({ tasks: 1, events: 0, bills: 1, name: 'Ana' });

    const other = new IndexedDbRepository(new IDBFactory());
    await other.saveItems([createItem({ kind: 'task', title: 'Antigo', date: null, time: null, priority: 'normal', repeat: null }, NOW, 'old')]);
    await other.replaceAll(parsed.backup.items, parsed.backup.settings);
    const restored = await other.loadItems();
    expect(restored.map((i) => i.id).sort()).toEqual(['b1', 't1']);
    expect(restored.find((i) => i.id === 'b1')!.amountCents).toBe(12050);
    expect(restored.find((i) => i.id === 'b1')!.overrides!['2026-10-10'].status).toBe('done');
  });

  it.each([
    ['texto qualquer', 'não-json'],
    ['outro app', JSON.stringify({ app: 'x', version: 1, items: [] })],
    ['versão futura', JSON.stringify({ app: 'dia-leve', version: 99, items: [], settings })],
    ['sem itens', JSON.stringify({ app: 'dia-leve', version: 1, settings })],
    ['valor quebrado', JSON.stringify({ app: 'dia-leve', version: 1, items: [{ ...sample()[1], amountCents: 10.5 }], settings })],
    ['data inválida', JSON.stringify({ app: 'dia-leve', version: 1, items: [{ ...sample()[0], date: '2026-02-30' }], settings })],
    ['fuso inválido', JSON.stringify({ app: 'dia-leve', version: 1, items: [], settings: { ...settings, timezone: 'Lua/Base' } })],
    ['ids repetidos', JSON.stringify({ app: 'dia-leve', version: 1, items: [sample()[0], sample()[0]], settings })],
  ])('rejeita arquivo inválido (%s)', (_label, text) => {
    const r = parseBackup(text);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.length).toBeGreaterThan(5);
  });

  it('arquivo inválido não altera os dados existentes', async () => {
    const repo = new IndexedDbRepository(new IDBFactory());
    await repo.saveItems(sample());
    const r = parseBackup('{"app":"dia-leve","version":1,"items":[{"id":1}]}');
    expect(r.ok).toBe(false);
    // Fluxo do app: só chama replaceAll quando ok === true.
    expect((await repo.loadItems()).length).toBe(2);
  });
});

describe('persistência', () => {
  it('mantém os dados ao "reabrir" (nova conexão ao mesmo banco)', async () => {
    const factory = new IDBFactory();
    const a = new IndexedDbRepository(factory, 'teste');
    await a.saveItems(sample());
    const b = new IndexedDbRepository(factory, 'teste');
    expect((await b.loadItems()).length).toBe(2);
    await b.apply([], ['t1']);
    expect((await new IndexedDbRepository(factory, 'teste').loadItems()).map((i) => i.id)).toEqual(['b1']);
  });
});
