import { formatRelative, formatShort, formatTime } from '../domain/dates';
import { formatBRL } from '../domain/money';
import type { LocalDate, Occurrence } from '../domain/types';
import { useStore } from '../state/AppStore';
import { Icon } from './Icon';
import { useItemActions } from './ItemActions';

interface Props {
  occ: Occurrence;
  /** Mostra a data (em listas que misturam dias). */
  showDate?: boolean;
  highlighted?: boolean;
  /** Observação extra, ex.: "+3 anteriores pendentes". */
  note?: string;
}

export function isLate(o: Occurrence, today: LocalDate): boolean {
  return o.status === 'pending' && o.kind !== 'event' && !!o.date && o.date < today;
}

export function ItemRow({ occ, showDate, highlighted, note }: Props) {
  const { today, setDone } = useStore();
  const { open } = useItemActions();
  const done = occ.status === 'done';
  const late = isLate(occ, today);
  const isBill = occ.kind === 'bill';

  const meta: string[] = [];
  if (showDate && occ.date) meta.push(formatRelative(occ.date, today));
  if (occ.time) meta.push(formatTime(occ.time));
  if (isBill && occ.amountCents != null) meta.push(formatBRL(occ.amountCents));
  if (isBill && occ.category) meta.push(occ.category);

  return (
    <li className={`item kind-${occ.kind} ${done ? 'is-done' : ''} ${late ? 'is-late' : ''}`}>
      {!isBill && (
        <button
          type="button"
          className={`check ${done ? 'is-checked' : ''}`}
          aria-pressed={done}
          aria-label={done ? `Reabrir: ${occ.title}` : `Concluir: ${occ.title}`}
          onClick={() => setDone(occ, !done)}
        >
          <Icon name="check" size={20} />
        </button>
      )}
      <button type="button" className="item-main" onClick={() => open(occ)} aria-label={`${occ.title}. Abrir opções`}>
        <span className="item-title">{occ.title}</span>
        <span className="item-meta">
          {meta.length > 0 && <span>{meta.join(' · ')}</span>}
          {late && (
            <span className="badge badge-late">
              <Icon name="alert" size={14} /> {isBill ? 'Vencida' : 'Atrasada'}
              {!showDate && occ.date ? ` · ${formatShort(occ.date)}` : ''}
            </span>
          )}
          {done && (
            <span className="badge badge-done">
              <Icon name="check" size={14} />{' '}
              {isBill ? `Paga${occ.paidOn ? ` em ${formatShort(occ.paidOn)}` : ''}` : 'Concluída'}
            </span>
          )}
          {highlighted && (
            <span className="badge badge-star">
              <Icon name="star" size={14} /> Destaque
            </span>
          )}
          {!highlighted && occ.priority === 'high' && !done && (
            <span className="badge badge-high">Prioridade alta</span>
          )}
          {occ.isRecurring && (
            <span className="badge badge-soft">
              <Icon name="repeat" size={14} /> Repete
            </span>
          )}
          {occ.isExample && <span className="badge badge-soft">Exemplo</span>}
          {note && <span className="badge badge-late">{note}</span>}
        </span>
      </button>
      {isBill && (
        <button
          type="button"
          className={`btn btn-small ${done ? 'btn-ghost' : 'btn-primary'}`}
          onClick={() => setDone(occ, !done)}
          aria-label={done ? `Desfazer pagamento: ${occ.title}` : `Marcar como pago: ${occ.title}`}
        >
          {done ? 'Desfazer' : 'Marcar como pago'}
        </button>
      )}
      <button type="button" className="icon-btn" aria-label={`Mais opções: ${occ.title}`} onClick={() => open(occ)}>
        <Icon name="more" />
      </button>
    </li>
  );
}

export function ItemList({ items, showDate, highlightKeys }: { items: Occurrence[]; showDate?: boolean; highlightKeys?: Set<string> }) {
  return (
    <ul className="item-list">
      {items.map((o) => (
        <ItemRow key={o.key} occ={o} showDate={showDate} highlighted={highlightKeys?.has(o.key)} />
      ))}
    </ul>
  );
}
