import { useEffect, useRef, useState } from 'react';
import { backupFileName, createBackup, parseBackup, type BackupFile, type BackupSummary } from '../data/backup';
import { isValidTimezone } from '../domain/dates';
import { buildIcs, upcomingForCalendar } from '../services/ics';
import { downloadText } from '../services/download';
import {
  canPromptInstall,
  detectPlatform,
  isStandalone,
  onInstallAvailabilityChange,
  promptInstall,
} from '../services/install';
import { notificationSupport, requestNotificationPermission, type NotificationSupport } from '../services/notifications';
import { isVoiceSupported } from '../services/voice';
import { useStore } from '../state/AppStore';
import { Dialog } from '../ui/Dialog';
import { Icon } from '../ui/Icon';

const COMMON_TZ = [
  'America/Sao_Paulo',
  'America/Bahia',
  'America/Fortaleza',
  'America/Recife',
  'America/Belem',
  'America/Manaus',
  'America/Cuiaba',
  'America/Campo_Grande',
  'America/Porto_Velho',
  'America/Boa_Vista',
  'America/Rio_Branco',
  'America/Noronha',
  'Europe/Lisbon',
];

const TZ_LABEL: Record<string, string> = {
  'America/Sao_Paulo': 'Brasília / São Paulo / Rio (UTC−3)',
  'America/Bahia': 'Bahia (UTC−3)',
  'America/Fortaleza': 'Fortaleza (UTC−3)',
  'America/Recife': 'Recife (UTC−3)',
  'America/Belem': 'Belém (UTC−3)',
  'America/Manaus': 'Manaus (UTC−4)',
  'America/Cuiaba': 'Cuiabá (UTC−4)',
  'America/Campo_Grande': 'Campo Grande (UTC−4)',
  'America/Porto_Velho': 'Porto Velho (UTC−4)',
  'America/Boa_Vista': 'Boa Vista (UTC−4)',
  'America/Rio_Branco': 'Rio Branco (UTC−5)',
  'America/Noronha': 'Fernando de Noronha (UTC−2)',
  'Europe/Lisbon': 'Lisboa',
};

export function SettingsScreen() {
  const store = useStore();
  const { settings, updateSettings, items, today } = store;
  const [name, setName] = useState(settings.name);
  const [notif, setNotif] = useState<NotificationSupport>(notificationSupport());
  const [includeBills, setIncludeBills] = useState(true);
  const [importState, setImportState] = useState<
    { kind: 'error'; message: string } | { kind: 'confirm'; backup: BackupFile; summary: BackupSummary } | null
  >(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [canInstall, setCanInstall] = useState(canPromptInstall());
  useEffect(() => onInstallAvailabilityChange(() => setCanInstall(canPromptInstall())), []);
  useEffect(() => setName(settings.name), [settings.name]);

  const tzOptions = COMMON_TZ.includes(settings.timezone) ? COMMON_TZ : [settings.timezone, ...COMMON_TZ];

  const exportBackup = () => {
    const data = createBackup(items, settings);
    downloadText(backupFileName(today), JSON.stringify(data, null, 2), 'application/json');
    store.notify('Backup baixado. Guarde o arquivo em um lugar seguro.');
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setImportState({ kind: 'error', message: 'Arquivo grande demais para ser um backup do Dia Leve.' });
      return;
    }
    const text = await file.text();
    const r = parseBackup(text);
    setImportState(r.ok ? { kind: 'confirm', backup: r.backup, summary: r.summary } : { kind: 'error', message: r.error });
    if (fileRef.current) fileRef.current.value = '';
  };

  const exportIcs = () => {
    const occ = upcomingForCalendar(items, today, includeBills);
    if (!occ.length) {
      store.notify('Não há compromissos futuros para exportar.');
      return;
    }
    downloadText(`dia-leve-calendario-${today}.ics`, buildIcs(occ), 'text/calendar');
    store.notify(`${occ.length} ${occ.length === 1 ? 'item exportado' : 'itens exportados'}.`);
  };

  const platform = detectPlatform();
  const standalone = isStandalone();

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Ajustes</h1>
      </header>

      <section className="card" aria-labelledby="s-you">
        <h2 id="s-you">Você</h2>
        <div className="field">
          <label className="label" htmlFor="s-name">
            Como gosta de ser chamado(a) <span className="optional">(opcional)</span>
          </label>
          <input
            id="s-name"
            className="input"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() !== settings.name && updateSettings({ name: name.trim() })}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="s-tz">
            Fuso horário
          </label>
          <select
            id="s-tz"
            className="input"
            value={settings.timezone}
            onChange={(e) => isValidTimezone(e.target.value) && updateSettings({ timezone: e.target.value })}
          >
            {tzOptions.map((tz) => (
              <option key={tz} value={tz}>
                {TZ_LABEL[tz] ?? tz}
              </option>
            ))}
          </select>
          <p className="hint">Detectado automaticamente. Usado para saber qual é o “hoje” e os horários dos avisos.</p>
        </div>
      </section>

      <section className="card" aria-labelledby="s-rem">
        <h2 id="s-rem">Lembretes</h2>
        <label className="check-line">
          <input
            type="checkbox"
            checked={settings.inAppAlerts}
            onChange={(e) => updateSettings({ inAppAlerts: e.target.checked })}
          />
          Avisar dentro do app antes de compromissos e tarefas com horário
        </label>
        <div className="field">
          <label className="label" htmlFor="s-adv">
            Avisar com antecedência de
          </label>
          <select
            id="s-adv"
            className="input"
            value={settings.reminderMinutes}
            onChange={(e) => updateSettings({ reminderMinutes: Number(e.target.value) })}
          >
            {[0, 5, 10, 15, 30, 60, 120].map((m) => (
              <option key={m} value={m}>
                {m === 0 ? 'Na hora' : m < 60 ? `${m} minutos` : m === 60 ? '1 hora' : '2 horas'}
              </option>
            ))}
          </select>
        </div>

        <h3>Notificações do navegador</h3>
        {notif === 'unsupported' ? (
          <p className="hint notice">
            Este navegador não oferece notificações.{' '}
            {platform === 'ios' ? 'No iPhone, elas só podem funcionar com o app instalado na tela de início (iOS 16.4 ou mais novo).' : ''}
          </p>
        ) : notif === 'denied' ? (
          <p className="hint notice">
            As notificações foram bloqueadas. Para ativar, libere nas configurações do navegador para este site.
          </p>
        ) : notif === 'granted' ? (
          <label className="check-line">
            <input
              type="checkbox"
              checked={settings.systemNotifications}
              onChange={(e) => updateSettings({ systemNotifications: e.target.checked })}
            />
            Também mostrar notificação do navegador
          </label>
        ) : (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={async () => {
              const r = await requestNotificationPermission();
              setNotif(r);
              if (r === 'granted') await updateSettings({ systemNotifications: true });
            }}
          >
            <Icon name="bell" /> Permitir notificações
          </button>
        )}
        <div className="limits">
          <p>
            <strong>O que funciona hoje:</strong>
          </p>
          <ul>
            <li>
              <strong>Avisos dentro do app:</strong> aparecem enquanto o Dia Leve estiver aberto na tela.
            </li>
            <li>
              <strong>Notificações do navegador:</strong> aparecem enquanto o Dia Leve estiver aberto, mesmo em outra
              aba ou minimizado. O celular pode atrasá-las ou bloqueá-las para economizar bateria.
            </li>
            <li>
              <strong>Com o app fechado:</strong> <em>não há avisos nesta versão.</em> Para ser lembrado com o app
              fechado, exporte seus compromissos para o calendário do celular (abaixo).
            </li>
          </ul>
        </div>
      </section>

      <section className="card" aria-labelledby="s-cal">
        <h2 id="s-cal">Calendário do celular</h2>
        <p className="muted">
          Baixe um arquivo com os compromissos dos próximos 6 meses e abra no app de calendário. O calendário avisa
          mesmo com o Dia Leve fechado. Alterações feitas depois não são enviadas automaticamente: exporte de novo
          quando precisar.
        </p>
        <label className="check-line">
          <input type="checkbox" checked={includeBills} onChange={(e) => setIncludeBills(e.target.checked)} />
          Incluir vencimentos de contas
        </label>
        <button type="button" className="btn btn-secondary" onClick={exportIcs}>
          <Icon name="calendar" /> Exportar para o calendário (.ics)
        </button>
      </section>

      <section className="card" aria-labelledby="s-data">
        <h2 id="s-data">Seus dados</h2>
        <p className="muted">
          Tudo fica <strong>somente neste navegador, neste aparelho</strong>. Não há conta nem sincronização
          automática. Se os dados do navegador forem apagados (ou se você trocar de celular), as informações podem ser
          perdidas. Faça backups de vez em quando.
        </p>
        <div className="stack">
          <button type="button" className="btn btn-secondary" onClick={exportBackup}>
            <Icon name="download" /> Exportar backup
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" /> Importar backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          {items.some((i) => i.isExample) && (
            <button type="button" className="btn btn-ghost" onClick={store.removeExample}>
              Remover dados de exemplo
            </button>
          )}
          <button type="button" className="btn btn-danger" onClick={() => setConfirmClear(true)}>
            <Icon name="trash" /> Apagar todos os dados
          </button>
        </div>
      </section>

      <section className="card" aria-labelledby="s-install">
        <h2 id="s-install">Instalar no celular</h2>
        {standalone ? (
          <p className="muted">O Dia Leve já está instalado neste aparelho.</p>
        ) : (
          <>
            <p className="muted">
              Você pode colocar o Dia Leve na tela de início, como um app. Ele continua funcionando pelo navegador, sem
              loja de aplicativos. Depois de aberto uma vez, funciona sem internet.
            </p>
            {canInstall && (
              <button type="button" className="btn btn-primary" onClick={() => promptInstall()}>
                <Icon name="download" /> Instalar agora
              </button>
            )}
            <InstallSteps platform={platform} />
          </>
        )}
      </section>

      <section className="card" aria-labelledby="s-about">
        <h2 id="s-about">Privacidade e limites</h2>
        <ul className="plain-list">
          <li>Sem anúncios e sem rastreamento.</li>
          <li>Seus lembretes não são enviados para nenhum servidor do Dia Leve.</li>
          <li>
            O reconhecimento de texto é simples e feito no aparelho. Não é uma inteligência artificial: confira sempre
            antes de salvar.
          </li>
          <li>
            Ditado por voz: {isVoiceSupported() ? 'disponível neste navegador; ' : 'não disponível neste navegador; '}
            quando disponível, o navegador pode enviar o áudio a um serviço externo para transformar em texto, e
            costuma precisar de internet.
          </li>
        </ul>
        <p className="hint">Dia Leve · versão 0.1 (primeira versão)</p>
      </section>

      {importState?.kind === 'error' && (
        <Dialog open onClose={() => setImportState(null)} title="Não foi possível importar">
          <p>{importState.message}</p>
          <p className="muted">Seus dados atuais não foram alterados.</p>
          <button type="button" className="btn btn-primary btn-block" onClick={() => setImportState(null)}>
            Entendi
          </button>
        </Dialog>
      )}
      {importState?.kind === 'confirm' && (
        <Dialog
          open
          onClose={() => setImportState(null)}
          title="Restaurar backup?"
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setImportState(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  const b = importState.backup;
                  setImportState(null);
                  await store.restoreBackup(b);
                }}
              >
                Substituir meus dados
              </button>
            </>
          }
        >
          <p>Este arquivo contém:</p>
          <ul className="plain-list">
            <li>{importState.summary.tasks} tarefas</li>
            <li>{importState.summary.events} compromissos</li>
            <li>{importState.summary.bills} contas</li>
            {importState.summary.exportedAt && (
              <li>Feito em {new Date(importState.summary.exportedAt).toLocaleString('pt-BR')}</li>
            )}
          </ul>
          <p className="banner banner-warn">
            <Icon name="alert" /> Os dados atuais deste aparelho ({items.length}{' '}
            {items.length === 1 ? 'registro' : 'registros'}) serão <strong>substituídos</strong> pelos do backup. Se
            quiser, exporte um backup antes.
          </p>
        </Dialog>
      )}
      {confirmClear && (
        <Dialog
          open
          onClose={() => setConfirmClear(false)}
          title="Apagar todos os dados?"
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmClear(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={async () => {
                  setConfirmClear(false);
                  await store.clearAll();
                }}
              >
                Apagar tudo
              </button>
            </>
          }
        >
          <p>
            Todas as tarefas, compromissos, contas e ajustes deste aparelho serão apagados. <strong>Isso não pode ser
            desfeito.</strong>
          </p>
          <p className="muted">Dica: exporte um backup antes, se quiser guardar uma cópia.</p>
        </Dialog>
      )}
    </div>
  );
}

function InstallSteps({ platform }: { platform: 'ios' | 'android' | 'desktop' }) {
  if (platform === 'ios')
    return (
      <ol className="steps">
        <li>Abra este site no <strong>Safari</strong>.</li>
        <li>
          Toque no botão <strong>Compartilhar</strong> (quadrado com seta para cima).
        </li>
        <li>
          Escolha <strong>Adicionar à Tela de Início</strong> e toque em <strong>Adicionar</strong>.
        </li>
      </ol>
    );
  if (platform === 'android')
    return (
      <ol className="steps">
        <li>Abra este site no <strong>Chrome</strong>.</li>
        <li>
          Toque no menu <strong>⋮</strong> (três pontinhos) no canto superior.
        </li>
        <li>
          Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.
        </li>
      </ol>
    );
  return (
    <ol className="steps">
      <li>No Chrome ou Edge do computador, procure o ícone de instalar na barra de endereço.</li>
      <li>
        No celular: Android use o Chrome (menu ⋮ → <strong>Instalar app</strong>); iPhone use o Safari (Compartilhar →{' '}
        <strong>Adicionar à Tela de Início</strong>).
      </li>
    </ol>
  );
}
