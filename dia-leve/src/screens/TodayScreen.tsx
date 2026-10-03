import { useMemo, useState } from 'react';
import { formatLong, greeting } from '../domain/dates';
import { buildToday } from '../domain/selectors';
import { useStore } from '../state/AppStore';
import { Icon } from '../ui/Icon';
import { ItemList } from '../ui/ItemRow';

const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase('pt-BR') + s.slice(1);

export function TodayScreen({ onAdd }: { onAdd(): void }) {
  const { items, settings, today, now, removeExample } = useStore();
  const view = useMemo(
    () => buildToday(items, today, settings.highlights[today] ?? []),
    [items, today, settings.highlights],
  );
  const [showDone, setShowDone] = useState(false);
  const [showUndated, setShowUndated] = useState(false);
  const hasExample = items.some((i) => i.isExample);
  const { done, total } = view.progress;

  return (
    <div className="screen">
      <header className="screen-header">
        <p className="eyebrow">{capitalize(formatLong(today))}</p>
        <h1>
          {greeting(now)}
          {settings.name ? `, ${settings.name}` : ''}
        </h1>
        {total > 0 && (
          <div className="progress" aria-label={`${done} de ${total} tarefas de hoje concluídas`}>
            <div className="progress-bar" aria-hidden="true">
              <span style={{ width: `${(done / total) * 100}%` }} />
            </div>
            <p className="progress-text">
              {done} de {total} {total === 1 ? 'tarefa concluída' : 'tarefas concluídas'}
            </p>
          </div>
        )}
      </header>

      {hasExample && (
        <div className="banner banner-info">
          <Icon name="info" />
          <p>Você está vendo um exemplo com dados fictícios.</p>
          <button type="button" className="btn btn-small btn-ghost" onClick={removeExample}>
            Remover exemplo
          </button>
        </div>
      )}

      {view.isEmpty && (
        <div className="empty">
          <Icon name="sun" size={40} />
          <h2>Nada marcado para hoje</h2>
          <p>Tire as coisas da cabeça: anote uma tarefa, um compromisso ou uma conta para pagar.</p>
          <button type="button" className="btn btn-primary" onClick={onAdd}>
            <Icon name="plus" /> Adicionar
          </button>
        </div>
      )}

      {view.priorities.length > 0 && (
        <section className="section" aria-labelledby="sec-prio">
          <h2 id="sec-prio" className="section-title">
            <Icon name="star" /> Prioridades de hoje
          </h2>
          <p className="section-hint">
            {view.manualKeys.size
              ? 'Seus destaques primeiro, depois sugestões.'
              : 'Sugestões: prioridade alta e vencimento mais próximo. Use “Destacar hoje” para escolher.'}
          </p>
          <ItemList items={view.priorities} highlightKeys={view.manualKeys} showDate />
        </section>
      )}

      {view.events.length > 0 && (
        <section className="section" aria-labelledby="sec-events">
          <h2 id="sec-events" className="section-title">
            <Icon name="clock" /> Compromissos
          </h2>
          <ItemList items={view.events} />
        </section>
      )}

      {view.bills.length > 0 && (
        <section className="section" aria-labelledby="sec-bills">
          <h2 id="sec-bills" className="section-title">
            <Icon name="wallet" /> Contas que vencem hoje
          </h2>
          <ItemList items={view.bills} />
        </section>
      )}

      {view.overdue.length > 0 && (
        <section className="section section-late" aria-labelledby="sec-late">
          <h2 id="sec-late" className="section-title">
            <Icon name="alert" /> Atrasados ({view.overdue.length})
          </h2>
          <ItemList items={view.overdue} showDate />
        </section>
      )}

      {view.otherTasks.length > 0 && (
        <section className="section" aria-labelledby="sec-other">
          <h2 id="sec-other" className="section-title">
            <Icon name="task" /> Outras tarefas de hoje
          </h2>
          <ItemList items={view.otherTasks} />
        </section>
      )}

      {view.doneToday.length > 0 && (
        <section className="section">
          <button type="button" className="disclosure" aria-expanded={showDone} onClick={() => setShowDone(!showDone)}>
            <Icon name="right" size={18} className={showDone ? 'rot-90' : ''} />
            Concluídas hoje ({view.doneToday.length})
          </button>
          {showDone && <ItemList items={view.doneToday} />}
        </section>
      )}

      {view.undated.length > 0 && (
        <section className="section">
          <button
            type="button"
            className="disclosure"
            aria-expanded={showUndated}
            onClick={() => setShowUndated(!showUndated)}
          >
            <Icon name="right" size={18} className={showUndated ? 'rot-90' : ''} />
            Sem data ({view.undated.length})
          </button>
          {showUndated && <ItemList items={view.undated} />}
        </section>
      )}
    </div>
  );
}
