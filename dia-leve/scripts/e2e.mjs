// Teste ponta a ponta no Chromium (Playwright) contra o build de produção.
// Uso: npm run build && npm run e2e
// Simula um celular (390×844) e confere os critérios de qualidade principais.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 4179;
const BASE = `http://localhost:${PORT}/`;
const SHOTS = process.env.SHOTS_DIR || 'e2e-screenshots';
mkdirSync(SHOTS, { recursive: true });

// E2E_TARGET=single testa a prévia em arquivo único (dist-single/).
const SINGLE = process.env.E2E_TARGET === 'single';
const server = spawn(
  'node',
  ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', ...(SINGLE ? ['--outDir', 'dist-single'] : [])],
  { stdio: 'pipe' },
);
for (const sig of ['exit', 'SIGINT', 'SIGTERM']) process.on(sig, () => { server.kill(); if (sig !== 'exit') process.exit(1); });
await new Promise((resolve, reject) => {
  server.stdout.on('data', (d) => String(d).includes(String(PORT)) && resolve());
  server.on('exit', () => reject(new Error('preview não iniciou')));
  setTimeout(() => reject(new Error('timeout preview')), 20000);
});

let failures = 0;
let lastFailed = false;
const results = [];
async function check(name, fn) {
  try {
    // Fecha janela que tenha ficado aberta por um passo anterior com falha.
    if (lastFailed) for (let i = 0; i < 3 && (await page.locator('dialog[open]').count()); i++) await page.keyboard.press('Escape');
    lastFailed = false;
    await fn();
    results.push(`✔ ${name}`);
  } catch (e) {
    failures++;
    lastFailed = true;
    await page.screenshot({ path: `${SHOTS}/falha-${failures}.png` }).catch(() => {});
    results.push(`✘ ${name}\n    ${String(e.message).split('\n').slice(0, 6).join(' | ')}`);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'pt-BR',
  timezoneId: 'America/Sao_Paulo',
  acceptDownloads: true,
});
// Segunda-feira, 5 de outubro de 2026, 9h em Brasília.
await context.clock.install({ time: new Date('2026-10-05T09:00:00-03:00') });
const page = await context.newPage();
page.setDefaultTimeout(8000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const noHScroll = async (label) => {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  assert(sw <= iw, `${label}: rolagem horizontal (${sw} > ${iw})`);
};
const nav = (name) => page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name }).click();
const dialog = () => page.locator('dialog[open]');

await page.goto(BASE);

await check('Primeiro acesso: introdução, nome opcional e escolha inicial', async () => {
  await page.getByRole('heading', { name: 'Organize seu dia sem complicação.' }).waitFor();
  await page.screenshot({ path: `${SHOTS}/01-boas-vindas.png` });
  await page.getByRole('button', { name: 'Começar' }).click();
  await page.getByLabel('Seu nome ou apelido').fill('Ana');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Explorar um exemplo' }).waitFor();
  await page.getByRole('button', { name: 'Adicionar meu primeiro lembrete' }).click();
  await dialog().waitFor();
});

await check('Texto natural vira conta + compromisso, revisados antes de salvar', async () => {
  await page.getByLabel('O que você precisa lembrar?').fill(
    'Pagar internet de 120 reais dia 10 e levar minha filha ao dentista na sexta às 15h.',
  );
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('heading', { name: 'Confira antes de salvar' }).waitFor();
  const text = await dialog().innerText();
  assert(text.includes('R$ 120,00'), 'valor da conta não aparece');
  assert(text.includes('sábado, 10 de outubro de 2026'), 'vencimento dia 10 não aparece');
  assert(text.includes('sexta-feira, 9 de outubro de 2026'), 'sexta não interpretada');
  assert(text.includes('15h'), 'horário não aparece');
  await page.screenshot({ path: `${SHOTS}/02-revisao-texto.png` });
  await page.getByRole('button', { name: 'Salvar 2 itens' }).click();
  await dialog().waitFor({ state: 'detached' });
});

await check('Tela Hoje vazia de tarefas mostra orientação; adicionar tarefa pelo formulário', async () => {
  await nav('Adicionar');
  await page.getByRole('tab', { name: 'Formulário' }).click();
  await page.getByLabel('O que precisa fazer?').fill('Comprar pão');
  await page.getByLabel('Prioridade alta').check();
  await dialog().getByRole('button', { name: 'Salvar' }).click();
  await page.getByText('Comprar pão').first().waitFor();
});

await check('Tarefa continua salva após recarregar', async () => {
  await page.reload();
  await page.getByText('Comprar pão').first().waitFor({ timeout: 5000 });
  const hdr = await page.locator('h1').innerText();
  assert(hdr.includes('Ana'), 'saudação sem o nome');
});

await check('Concluir tarefa atualiza progresso e permite desfazer/reabrir', async () => {
  await page.getByRole('button', { name: 'Concluir: Comprar pão' }).click();
  await page.getByText('1 de 1 tarefa concluída').waitFor();
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await page.getByText('0 de 1 tarefa concluída').waitFor();
  await page.getByRole('button', { name: 'Concluir: Comprar pão' }).click();
  await page.getByText('1 de 1 tarefa concluída').waitFor();
  await page.screenshot({ path: `${SHOTS}/03-hoje.png` });
});

await check('Conta de R$ 120,50 sem erro e totais corretos ao pagar', async () => {
  await nav('Contas');
  await page.getByRole('button', { name: 'Adicionar conta' }).click();
  await page.getByLabel('Qual é a conta?').fill('Escola');
  await page.getByLabel('Valor', { exact: true }).fill('120,50');
  await page.getByLabel('Vencimento', { exact: true }).fill('2026-10-20');
  await dialog().getByRole('button', { name: 'Salvar' }).click();
  await dialog().waitFor({ state: 'detached' });
  const totals = () => page.locator('.totals').innerText();
  assert((await totals()).includes('R$ 240,50'), `total pendente esperado R$ 240,50: ${await totals()}`);
  await page.getByRole('button', { name: 'Marcar como pago: Escola' }).click();
  await page.waitForTimeout(100);
  const t = await totals();
  assert(t.includes('R$ 120,00') && t.includes('R$ 120,50'), `totais após pagar: ${t}`);
  await page.screenshot({ path: `${SHOTS}/04-contas.png` });
  await noHScroll('Contas');
});

await check('Compromisso com horário aparece na semana correta (sexta 9/10)', async () => {
  await nav('Semana');
  await page.getByRole('button', { name: /sexta-feira, 9 de outubro/ }).click();
  await page.getByText('Levar minha filha ao dentista').waitFor();
  await page.getByRole('button', { name: 'Próxima semana' }).click();
  assert((await page.getByText('Levar minha filha ao dentista').count()) === 0, 'apareceu na semana errada');
  await page.getByRole('main').getByRole('button', { name: 'Hoje', exact: true }).click();
  await page.getByRole('button', { name: /sexta-feira, 9 de outubro/ }).click();
  await page.screenshot({ path: `${SHOTS}/05-semana.png` });
  await noHScroll('Semana');
});

await check('Adiar compromisso pede nova data e horário', async () => {
  await page.getByRole('button', { name: 'Mais opções: Levar minha filha ao dentista' }).click();
  await dialog().getByRole('button', { name: 'Adiar' }).click();
  await dialog().getByRole('button', { name: 'Salvar nova data' }).click();
  await dialog().getByText('Escolha a nova data.').waitFor();
  await page.getByLabel('Nova data').fill('2026-10-08');
  await dialog().getByRole('button', { name: 'Salvar nova data' }).click();
  await dialog().getByText('Escolha o novo horário.').waitFor();
  await page.getByLabel(/Novo horário/).fill('16:30');
  await dialog().getByRole('button', { name: 'Salvar nova data' }).click();
  await dialog().waitFor({ state: 'detached' });
  await page.getByRole('button', { name: /quinta-feira, 8 de outubro/ }).click();
  await page.getByText('16h30').waitFor();
});

await check('Editar e excluir com desfazer', async () => {
  await page.getByRole('button', { name: 'Mais opções: Levar minha filha ao dentista' }).click();
  await dialog().getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel('Qual é o compromisso?').fill('Dentista da filha');
  await dialog().getByRole('button', { name: 'Salvar' }).click();
  await page.getByText('Dentista da filha').waitFor();
  await page.getByRole('button', { name: 'Mais opções: Dentista da filha' }).click();
  await dialog().getByRole('button', { name: 'Excluir' }).click();
  await page.waitForTimeout(100);
  assert((await page.getByText('Dentista da filha').count()) === 0, 'não excluiu');
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await page.getByText('Dentista da filha').waitFor();
});

await check('Recorrência mensal: pagar uma ocorrência não paga a série', async () => {
  await nav('Adicionar');
  await page.getByRole('tab', { name: 'Formulário' }).click();
  await page.getByText('Conta', { exact: true }).click();
  await page.getByLabel('Qual é a conta?').fill('Aluguel');
  await page.getByLabel('Valor', { exact: true }).fill('1.500');
  await page.getByLabel('Vencimento', { exact: true }).fill('2026-10-31');
  await page.getByLabel('Repetir').selectOption('monthly');
  await dialog().getByText('Nos meses sem dia 31').waitFor();
  await dialog().getByRole('button', { name: 'Salvar' }).click();
  await nav('Contas');
  await page.getByRole('button', { name: 'Próximo mês' }).click();
  await page.getByText('30 de nov.').first().waitFor();
  await page.getByRole('button', { name: 'Marcar como pago: Aluguel' }).click();
  await page.getByRole('button', { name: 'Mês anterior' }).click();
  await page.getByRole('button', { name: 'Marcar como pago: Aluguel' }).waitFor();
  await page.reload();
  await nav('Contas');
  const count = await page.getByRole('button', { name: 'Marcar como pago: Aluguel' }).count();
  assert(count === 1, `esperava 1 ocorrência de aluguel em outubro, achei ${count}`);
});

let backupPath = '';
await check('Exportar backup', async () => {
  await nav('Ajustes');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar backup' }).click()]);
  backupPath = `${SHOTS}/backup.json`;
  await dl.saveAs(backupPath);
  const data = JSON.parse(readFileSync(backupPath, 'utf8'));
  assert(data.app === 'dia-leve' && data.items.length === 5, `backup inesperado: ${data.items?.length} itens`);
  await page.screenshot({ path: `${SHOTS}/06-ajustes.png`, fullPage: true });
  await noHScroll('Ajustes');
});

await check('Backup inválido é rejeitado sem perder dados', async () => {
  await page.locator('input[type=file]').setInputFiles({
    name: 'ruim.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"app":"dia-leve","version":1,"items":[{"id":"x"}]}'),
  });
  await dialog().getByText('Seus dados atuais não foram alterados.').waitFor();
  await dialog().getByRole('button', { name: 'Entendi' }).click();
  await nav('Contas');
  await page.getByText('Escola').first().waitFor();
});

await check('Apagar tudo e restaurar backup', async () => {
  await nav('Ajustes');
  await page.getByRole('button', { name: 'Apagar todos os dados' }).click();
  await dialog().getByRole('button', { name: 'Apagar tudo' }).click();
  await page.getByRole('heading', { name: 'Organize seu dia sem complicação.' }).waitFor();
  // Passa pelo primeiro acesso e restaura.
  await page.getByRole('button', { name: 'Começar' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await page.getByRole('button', { name: 'Explorar um exemplo' }).click();
  await nav('Ajustes');
  await page.locator('input[type=file]').setInputFiles(backupPath);
  await dialog().getByText('serão').waitFor();
  await page.screenshot({ path: `${SHOTS}/07-importar.png` });
  await dialog().getByRole('button', { name: 'Substituir meus dados' }).click();
  await nav('Contas');
  const t = await page.locator('.totals').innerText();
  assert(t.includes('R$ 1.620,00') && t.includes('R$ 120,50'), `totais após restaurar: ${t}`);
  assert((await page.getByText('Exemplo', { exact: true }).count()) === 0, 'exemplo não foi substituído');
});

await check('Exemplo aparece identificado e é removível', async () => {
  await nav('Ajustes');
  await page.getByRole('button', { name: 'Apagar todos os dados' }).click();
  await dialog().getByRole('button', { name: 'Apagar tudo' }).click();
  await page.getByRole('button', { name: 'Começar' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await page.getByRole('button', { name: 'Explorar um exemplo' }).click();
  await page.getByText('Você está vendo um exemplo com dados fictícios.').waitFor();
  await page.screenshot({ path: `${SHOTS}/08-exemplo.png`, fullPage: true });
  await page.getByRole('button', { name: 'Remover exemplo' }).click();
  await page.getByText('Nada marcado para hoje').waitFor();
});

await check('Sem rolagem horizontal em 320px em todas as telas e no adicionar', async () => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.reload();
  await noHScroll('Hoje 320');
  for (const t of ['Semana', 'Contas', 'Ajustes']) {
    await nav(t);
    await noHScroll(`${t} 320`);
  }
  await nav('Adicionar');
  await page.getByRole('tab', { name: 'Formulário' }).click();
  await page.getByText('Conta', { exact: true }).click();
  await noHScroll('Formulário 320');
  const w = await dialog().evaluate((d) => d.scrollWidth <= d.clientWidth + 1);
  assert(w, 'formulário com rolagem horizontal');
  await page.screenshot({ path: `${SHOTS}/09-formulario-320.png` });
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
});

await check('Sem suporte a voz: campo de texto funciona e explica a alternativa', async () => {
  await nav('Adicionar');
  await page.getByLabel('O que você precisa lembrar?').waitFor();
  const txt = await dialog().innerText();
  // O Chromium de testes não expõe reconhecimento de voz, então a explicação deve aparecer.
  const hasVoice = await page.evaluate(() => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  if (!hasVoice) assert(txt.includes('não oferece ditado por voz'), 'sem explicação de voz indisponível');
  else assert(txt.includes('Falar'), `botão Falar ausente: ${txt.slice(0, 200)}`);
  await page.keyboard.press('Escape');
  // Simula navegador sem reconhecimento de voz.
  await page.addInitScript(() => {
    delete window.webkitSpeechRecognition;
    delete window.SpeechRecognition;
  });
  await page.reload();
  await nav('Adicionar');
  await dialog().getByText('Este navegador não oferece ditado por voz').waitFor();
  await page.getByLabel('O que você precisa lembrar?').fill('Comprar pão amanhã');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('heading', { name: 'Confira antes de salvar' }).waitFor();
  await page.keyboard.press('Escape');
});

await check('Navegação por teclado alcança a barra principal', async () => {
  await page.reload();
  let found = false;
  for (let i = 0; i < 40 && !found; i++) {
    await page.keyboard.press('Tab');
    found = await page.evaluate(() => !!document.activeElement?.closest('nav') && document.activeElement.textContent.trim() === 'Contas');
  }
  assert(found, 'não chegou ao botão Contas com Tab');
  await page.keyboard.press('Enter');
  await page.getByRole('heading', { name: 'Contas', level: 1 }).waitFor();
});

await check('Áreas de toque com pelo menos 44px', async () => {
  await nav('Hoje');
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('button, a, input, select, textarea')]
      .filter((el) => el.offsetParent !== null && !el.classList.contains('skip-link') && el.type !== 'checkbox')
      .map((el) => ({ el: el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 30), r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && (r.height < 44 || r.width < 44))
      .map(({ el, r }) => `${el} (${Math.round(r.width)}x${Math.round(r.height)})`),
  );
  assert(small.length === 0, `alvos pequenos: ${small.join(', ')}`);
});

if (!SINGLE) await check('Funciona offline depois do primeiro acesso (service worker)', async () => {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('navigation', { name: 'Principal' }).waitFor({ timeout: 5000 });
  await context.setOffline(false);
});

await check('Pendências antigas não somem: resumo na tela Hoje e lista completa', async () => {
  // Tarefa diária iniciada há 20 dias e conta mensal iniciada há mais de 12 meses.
  await nav('Adicionar');
  await page.getByRole('tab', { name: 'Formulário' }).click();
  await page.getByLabel('O que precisa fazer?').fill('Tomar remédio');
  await page.getByLabel('Data', { exact: true }).fill('2026-09-15');
  await page.getByLabel('Repetir').selectOption('daily');
  await dialog().getByRole('button', { name: 'Salvar' }).click();
  await dialog().waitFor({ state: 'detached' });
  await nav('Adicionar');
  await page.getByRole('tab', { name: 'Formulário' }).click();
  await page.getByText('Conta', { exact: true }).click();
  await page.getByLabel('Qual é a conta?').fill('Seguro');
  await page.getByLabel('Valor', { exact: true }).fill('50');
  await page.getByLabel('Vencimento', { exact: true }).fill('2025-06-10');
  await page.getByLabel('Repetir').selectOption('monthly');
  await dialog().getByRole('button', { name: 'Salvar' }).click();
  await dialog().waitFor({ state: 'detached' });
  await nav('Hoje');
  // 20 dias de remédio (15/09 a 04/10) + 16 meses de seguro (jun/2025 a set/2026).
  await page.getByRole('heading', { name: 'Atrasados (36)' }).waitFor();
  await page.getByText('+19 anteriores').waitFor();
  await page.getByText('+15 anteriores').waitFor();
  await page.getByRole('button', { name: 'Ver todas as pendências (36)' }).click();
  await dialog().getByText('16 vencimentos não pagos').waitFor();
  await dialog().getByText('R$ 800,00').first().waitFor();
  await page.screenshot({ path: `${SHOTS}/10-pendencias.png` });
  await dialog().getByRole('button', { name: 'Ver as 16' }).click();
  await dialog().getByText('10 de jun. de 2025').waitFor();
  await dialog().getByRole('button', { name: 'Concluir as 20' }).click();
  await dialog().getByText('Tarefas atrasadas').waitFor({ state: 'detached' });
  await page.keyboard.press('Escape');
  await page.getByRole('heading', { name: 'Atrasados (16)' }).waitFor();
  await page.reload();
  await page.getByRole('heading', { name: 'Atrasados (16)' }).waitFor();
  await nav('Contas');
  await page.getByRole('heading', { name: /Vencidas e não pagas \(16\)/ }).waitFor();
});

await check('Sem erros no console', async () => {
  assert(errors.length === 0, errors.join(' | '));
});

await browser.close();
server.kill();
console.log(results.join('\n'));
console.log(failures ? `\n${failures} falha(s).` : '\nTodos os testes ponta a ponta passaram.');
process.exit(failures ? 1 : 0);
