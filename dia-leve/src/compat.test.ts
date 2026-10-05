import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// O Safari só aceita "lookbehind" em expressões regulares a partir do iOS 16.4.
// Um único uso derruba o carregamento do app em iPhones mais antigos.
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(n) && !n.endsWith('.test.ts') ? [p] : [];
  });
}

describe('compatibilidade com Safari antigo', () => {
  it('não usa lookbehind em expressões regulares', () => {
    const offenders = files(new URL('.', import.meta.url).pathname).filter((f) => /\(\?<[!=]/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
