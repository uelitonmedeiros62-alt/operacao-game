import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';

function listFiles(dir: string): string[] {
  let out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out = out.concat(listFiles(full));
    else out.push(full);
  }
  return out;
}

/**
 * Gera o service worker no build com a lista exata de arquivos do app
 * (nomes com hash), para que o núcleo funcione sem internet após o 1º acesso.
 */
export function swPrecache(): Plugin {
  let publicDir = '';
  return {
    name: 'dia-leve-sw-precache',
    apply: 'build',
    configResolved(cfg) {
      publicDir = cfg.publicDir;
    },
    generateBundle(_opts, bundle) {
      const publicFiles = listFiles(publicDir)
        .map((f) => relative(publicDir, f).split('\\').join('/'))
        .filter((f) => f !== 'sw.js');
      const assets = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      const files = ['./', ...[...assets, ...publicFiles].map((f) => `./${f}`)];
      const version = createHash('sha256').update(files.join('|')).digest('hex').slice(0, 12);
      const template = readFileSync(new URL('./sw-template.js', import.meta.url), 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template
          .replace('__PRECACHE__', JSON.stringify(files, null, 2))
          .replace('__VERSION__', version),
      });
    },
  };
}
