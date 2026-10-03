import { useEffect, useState } from 'react';
import type { LocalDate } from './domain/types';
import { AddFlow } from './screens/AddFlow';
import { BillsScreen } from './screens/BillsScreen';
import { Onboarding } from './screens/Onboarding';
import { SettingsScreen } from './screens/SettingsScreen';
import { TodayScreen } from './screens/TodayScreen';
import { WeekScreen } from './screens/WeekScreen';
import { useStore } from './state/AppStore';
import { useReminders } from './state/useReminders';
import { Icon, type IconName } from './ui/Icon';
import { ItemActionsProvider } from './ui/ItemActions';

type Tab = 'hoje' | 'semana' | 'contas' | 'ajustes';
const TABS: Array<{ id: Tab; label: string; icon: IconName }> = [
  { id: 'hoje', label: 'Hoje', icon: 'sun' },
  { id: 'semana', label: 'Semana', icon: 'calendar' },
  { id: 'contas', label: 'Contas', icon: 'wallet' },
  { id: 'ajustes', label: 'Ajustes', icon: 'settings' },
];

function tabFromHash(): Tab {
  const h = location.hash.replace('#', '') as Tab;
  return TABS.some((t) => t.id === h) ? h : 'hoje';
}

interface AddState {
  open: boolean;
  date?: LocalDate | null;
  tab?: 'text' | 'form';
  kind?: 'bill';
}

export function App() {
  const store = useStore();
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [add, setAdd] = useState<AddState>({ open: false });
  const { alerts, dismiss } = useReminders();

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Ao terminar o primeiro acesso, sempre começa pela tela Hoje.
  const onboarded = store.settings.onboarded;
  useEffect(() => {
    if (!onboarded) {
      if (location.hash) history.replaceState(null, '', location.pathname + location.search);
      setTab('hoje');
    }
  }, [onboarded]);

  const go = (t: Tab) => {
    if (t !== tab) history.pushState(null, '', `#${t}`);
    setTab(t);
    window.scrollTo({ top: 0 });
    document.getElementById('conteudo')?.focus({ preventScroll: true });
  };

  if (!store.ready) {
    return (
      <div className="loading" role="status">
        Carregando…
      </div>
    );
  }

  const addFlow = (
    <AddFlow
      open={add.open}
      onClose={() => setAdd({ open: false })}
      defaultDate={add.date}
      initialTab={add.tab}
      defaultKind={add.kind}
    />
  );

  if (!store.settings.onboarded) {
    return (
      <>
        <Onboarding onFirstReminder={() => setAdd({ open: true })} />
        {addFlow}
      </>
    );
  }

  return (
    <ItemActionsProvider>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      {store.storageWarning && (
        <div className="banner banner-warn top-banner" role="alert">
          <Icon name="alert" /> <p>{store.storageWarning}</p>
        </div>
      )}
      {alerts.length > 0 && (
        <div className="alerts" role="alert">
          {alerts.map((a) => (
            <div key={a.key} className="alert-card">
              <Icon name="bell" />
              <div>
                <strong>{a.title}</strong>
                <p>{a.message}</p>
              </div>
              <button type="button" className="btn btn-small btn-ghost" onClick={() => dismiss(a.key)}>
                Ok
              </button>
            </div>
          ))}
        </div>
      )}

      <main id="conteudo" tabIndex={-1} className="main">
        {tab === 'hoje' && <TodayScreen onAdd={() => setAdd({ open: true })} />}
        {tab === 'semana' && <WeekScreen onAdd={(date) => setAdd({ open: true, date })} />}
        {tab === 'contas' && <BillsScreen onAdd={() => setAdd({ open: true, tab: 'form', kind: 'bill' })} />}
        {tab === 'ajustes' && <SettingsScreen />}
      </main>

      <div className="toasts" aria-live="polite">
        {store.toasts.map((t) => (
          <div key={t.id} className="toast">
            <span>{t.message}</span>
            {t.undo && (
              <button
                type="button"
                className="toast-btn"
                onClick={() => {
                  t.undo?.();
                  store.dismissToast(t.id);
                }}
              >
                Desfazer
              </button>
            )}
          </div>
        ))}
      </div>

      <nav className="bottom-nav" aria-label="Principal">
        {TABS.slice(0, 2).map((t) => (
          <NavButton key={t.id} {...t} active={tab === t.id} onClick={() => go(t.id)} />
        ))}
        <button type="button" className="nav-add" onClick={() => setAdd({ open: true })}>
          <span className="nav-add-circle" aria-hidden="true">
            <Icon name="plus" size={28} />
          </span>
          <span>Adicionar</span>
        </button>
        {TABS.slice(2).map((t) => (
          <NavButton key={t.id} {...t} active={tab === t.id} onClick={() => go(t.id)} />
        ))}
      </nav>
      {addFlow}
    </ItemActionsProvider>
  );
}

function NavButton({ label, icon, active, onClick }: { label: string; icon: IconName; active: boolean; onClick(): void }) {
  return (
    <button type="button" className={`nav-btn ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined} onClick={onClick}>
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}
