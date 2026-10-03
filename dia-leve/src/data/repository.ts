import type { Item, Settings } from '../domain/types';

/**
 * Camada de acesso a dados. A interface não sabe onde os dados ficam.
 * Hoje: IndexedDB no próprio navegador.
 * Futuro: uma implementação com sincronização (conta + servidor) pode
 * cumprir este mesmo contrato sem mudar as telas.
 */
export interface DataRepository {
  loadItems(): Promise<Item[]>;
  saveItems(items: Item[]): Promise<void>;
  deleteItems(ids: string[]): Promise<void>;
  /** Grava e remove numa única transação (para não ficar pela metade). */
  apply(save: Item[], remove: string[]): Promise<void>;
  loadSettings(): Promise<Partial<Settings> | null>;
  saveSettings(settings: Settings): Promise<void>;
  /** Substitui todos os dados de uma vez (usado na restauração de backup). */
  replaceAll(items: Item[], settings: Settings): Promise<void>;
  clearAll(): Promise<void>;
}
