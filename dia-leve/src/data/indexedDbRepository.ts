import type { Item, Settings } from '../domain/types';
import type { DataRepository } from './repository';

const DB_NAME = 'dia-leve';
const DB_VERSION = 1;
const ITEMS = 'items';
const META = 'meta';
const SETTINGS_KEY = 'settings';

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transação cancelada'));
  });
}

export function openDatabase(factory: IDBFactory = indexedDB, name = DB_NAME): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = factory.open(name, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ITEMS)) db.createObjectStore(ITEMS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Banco de dados bloqueado por outra aba.'));
  });
}

export class IndexedDbRepository implements DataRepository {
  private dbPromise: Promise<IDBDatabase>;

  constructor(factory?: IDBFactory, name?: string) {
    this.dbPromise = openDatabase(factory, name);
  }

  private async tx(stores: string[], mode: IDBTransactionMode) {
    const db = await this.dbPromise;
    return db.transaction(stores, mode);
  }

  async loadItems(): Promise<Item[]> {
    const tx = await this.tx([ITEMS], 'readonly');
    return promisify(tx.objectStore(ITEMS).getAll() as IDBRequest<Item[]>);
  }

  async saveItems(items: Item[]): Promise<void> {
    return this.apply(items, []);
  }

  async deleteItems(ids: string[]): Promise<void> {
    return this.apply([], ids);
  }

  async apply(save: Item[], remove: string[]): Promise<void> {
    const tx = await this.tx([ITEMS], 'readwrite');
    const store = tx.objectStore(ITEMS);
    for (const id of remove) store.delete(id);
    for (const it of save) store.put(it);
    return done(tx);
  }

  async loadSettings(): Promise<Partial<Settings> | null> {
    const tx = await this.tx([META], 'readonly');
    const v = await promisify(tx.objectStore(META).get(SETTINGS_KEY));
    return (v as Partial<Settings>) ?? null;
  }

  async saveSettings(settings: Settings): Promise<void> {
    const tx = await this.tx([META], 'readwrite');
    tx.objectStore(META).put(settings, SETTINGS_KEY);
    return done(tx);
  }

  async replaceAll(items: Item[], settings: Settings): Promise<void> {
    const tx = await this.tx([ITEMS, META], 'readwrite');
    const store = tx.objectStore(ITEMS);
    store.clear();
    for (const it of items) store.put(it);
    tx.objectStore(META).put(settings, SETTINGS_KEY);
    return done(tx);
  }

  async clearAll(): Promise<void> {
    const tx = await this.tx([ITEMS, META], 'readwrite');
    tx.objectStore(ITEMS).clear();
    tx.objectStore(META).clear();
    return done(tx);
  }
}

/** Alternativa em memória (testes ou navegadores sem IndexedDB, ex.: alguns modos privados). */
export class MemoryRepository implements DataRepository {
  items = new Map<string, Item>();
  settings: Settings | null = null;
  async loadItems() {
    return [...this.items.values()].map((i) => structuredClone(i));
  }
  async saveItems(items: Item[]) {
    return this.apply(items, []);
  }
  async deleteItems(ids: string[]) {
    return this.apply([], ids);
  }
  async apply(save: Item[], remove: string[]) {
    for (const id of remove) this.items.delete(id);
    for (const it of save) this.items.set(it.id, structuredClone(it));
  }
  async loadSettings() {
    return this.settings ? structuredClone(this.settings) : null;
  }
  async saveSettings(s: Settings) {
    this.settings = structuredClone(s);
  }
  async replaceAll(items: Item[], s: Settings) {
    this.items.clear();
    await this.apply(items, []);
    this.settings = structuredClone(s);
  }
  async clearAll() {
    this.items.clear();
    this.settings = null;
  }
}
