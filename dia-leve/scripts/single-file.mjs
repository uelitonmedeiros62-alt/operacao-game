// Gera dist-single/index.html: o app inteiro em um único arquivo HTML
// (JS e CSS embutidos), para prévias em hospedagens que aceitam só uma página.
// Nessa versão não há modo offline nem instalação como app (sem service worker/manifest).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
let html = readFileSync(new URL('index.html', dist), 'utf8');

html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"[^>]*>/g, (_, href) => {
  const css = readFileSync(new URL(href, dist), 'utf8');
  return `<style>\n${css}\n</style>`;
});
html = html.replace(/<script type="module"[^>]*src="\.\/([^"]+)"[^>]*><\/script>/g, (_, src) => {
  const js = readFileSync(new URL(src, dist), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script type="module">\n${js}\n</script>`;
});
const svg = readFileSync(new URL('icons/icon.svg', dist), 'utf8').trim();
html = html
  .replace(/\s*<link rel="manifest"[^>]*>/, '')
  .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, '')
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(svg)}">`)
  .replace('<html lang="pt-BR">', '<html lang="pt-BR" data-variant="preview">');

if (/src="\.\/|href="\.\//.test(html)) throw new Error('Ainda há referências a arquivos externos.');
const out = new URL('../dist-single/', import.meta.url);
mkdirSync(out, { recursive: true });
writeFileSync(new URL('index.html', out), html);
console.log(`dist-single/index.html (${Math.round(html.length / 1024)} KB)`);
