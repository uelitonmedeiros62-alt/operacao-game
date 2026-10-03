import { useMemo, useState } from 'react';
import { addDays, formatLong, formatShort, parts, startOfWeek, weekDates, weekdayShort } from '../domain/dates';
import { occurrencesBetween } from '../domain/occurrences';
import type { ItemKind, LocalDate } from '../domain/types';
import { useStore } from '../state/AppStore';
import { Icon } from '../ui/Icon';
import { ItemList } from '../ui/ItemRow';

const FILTERS: Array<{ id: 'all' | ItemKind; label: string }> = [
  { id: 'all', label: 'Tudo' },
  { id: 'task', label: 'Tarefas' },
  { id: 'event', label: 'Compromissos' },
  { id: 'bill', label: 'Contas' },
];

export function WeekScreen({ onAdd }: { onAdd(date: LocalDate): void }) {
  const { items, today } = useStore();
  const [selected, setSelected] = useState<LocalDate>(today);
  const [filter, setFilter] = useState<'all' | ItemKind>('all');
  const days = weekDates(selected);
  const from = days[0];
  const to = days[6];

  const occ = useMemo(
    () => occurrencesBetween(items, from, to).filter((o) => filter === 'all' || o.kind === filter),
    [items, from, to, filter],
  );
  const dayList = occ.filter((o) => o.date === selected);
  const countFor = (d: LocalDate) => occ.filter((o) => o.date === d && o.status === 'pending').length;

  const isThisWeek = startOfWeek(today) === from;

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Semana</h1>
        <div className="week-nav">
          <button type="button" className="icon-btn" aria-label="Semana anterior" onClick={() => setSelected(addDays(selected, -7))}>
            <Icon name="left" />
          </button>
          <p className="week-range" aria-live="polite">
            {formatShort(from)} – {formatShort(to)}
          </p>
          <button type="button" className="icon-btn" aria-label="Próxima semana" onClick={() => setSelected(addDays(selected, 7))}>
            <Icon name="right" />
          </button>
          {(!isThisWeek || selected !== today) && (
            <button type="button" className="btn btn-small btn-ghost" onClick={() => setSelected(today)}>
              Hoje
            </button>
          )}
        </div>
      </header>

      <div className="days" role="group" aria-label="Dias da semana">
        {days.map((d) => {
          const n = countFor(d);
          return (
            <button
              key={d}
              type="button"
              className={`day ${d === selected ? 'is-selected' : ''} ${d === today ? 'is-today' : ''}`}
              aria-pressed={d === selected}
              aria-label={`${formatLong(d)}${d === today ? ' (hoje)' : ''}: ${n} ${n === 1 ? 'pendente' : 'pendentes'}`}
              onClick={() => setSelected(d)}
            >
              <span className="day-name">{weekdayShort(d)}</span>
              <span className="day-num">{parts(d).d}</span>
              <span className="day-count" aria-hidden="true">
                {n > 0 ? n : ''}
              </span>
            </button>
          );
        })}
      </div>

      <div className="chips" role="group" aria-label="Filtrar por tipo">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`chip ${filter === f.id ? 'is-on' : ''}`}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <section className="section" aria-labelledby="day-title">
        <h2 id="day-title" className="section-title">
          {selected === today ? 'Hoje, ' : ''}
          {formatLong(selected)}
        </h2>
        {dayList.length ? (
          <ItemList items={dayList} />
        ) : (
          <p className="muted empty-inline">Nada {filter === 'all' ? '' : 'deste tipo '}marcado para este dia.</p>
        )}
        <button type="button" className="btn btn-secondary btn-block" onClick={() => onAdd(selected)}>
          <Icon name="plus" /> Adicionar neste dia
        </button>
      </section>
    </div>
  );
}
