import type { ItemDraft } from '../domain/mutations';
import type { LocalDate, LocalTime } from '../domain/types';

/** Um registro sugerido a partir do texto, sempre revisado pela pessoa antes de salvar. */
export interface ParsedDraft extends ItemDraft {
  /** Trecho do texto original que gerou esta sugestão. */
  source: string;
  /** Avisos e pedidos de confirmação, em linguagem simples. */
  warnings: string[];
}

export interface InterpretContext {
  today: LocalDate;
  now: LocalTime;
}

export interface InterpretResult {
  drafts: ParsedDraft[];
}

/**
 * Contrato para qualquer interpretador de texto.
 * Hoje usamos o interpretador local (regras simples, sem internet).
 * No futuro, um interpretador com IA pode implementar esta mesma interface
 * — por meio de um servidor próprio, nunca com chave secreta no navegador.
 */
export interface Interpreter {
  id: string;
  /** Texto exibido para a pessoa, sem exagerar a capacidade. */
  description: string;
  requiresInternet: boolean;
  interpret(text: string, ctx: InterpretContext): Promise<InterpretResult>;
}
