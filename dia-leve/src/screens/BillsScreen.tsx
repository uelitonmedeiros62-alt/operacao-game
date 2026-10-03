import { useMemo, useState } from 'react';
import { formatMonth, monthKey, shiftMonthKey } from '../domain/dates';
import { formatBRL } from '../domain/money';
import { billsOfMonth, overdueBills } from '../domain/selectors';
import { useStore } from '../state/AppStore';
import { Icon } from '../ui/Icon';
import { ItemList } from '../ui/ItemRow';

export function BillsScreen({ onAdd }: { onAdd(): void }) {
  const { items, today } = useStore();
  const [month, setMonth] = useState(monthKey(today));
  const data = useMemo(() => billsOfMonth(items, month), [items, month]);
  const late = useMemo(() => overdueBills(items, today), [items, today]);
  const upcoming = data.pending.filter((o) => !o.date || o.date >= today);
  const lateInMonth = data.pending.filter((o) => o.date && o.date < today);
  const monthName = formatMonth(month);

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Contas</h1>
        <div className="week-nav">
          <button type="button" className="icon-btn" aria-label="Mês anterior" onClick={() => setMonth(shiftMonthKey(month, -1))}>
            <Icon name="left" />
          </button>
          <p className="week-range" aria-live="polite">
            {monthName}
          </p>
          <button type="button" className="icon-btn" aria-label="Próximo mês" onClick={() => setMonth(shiftMonthKey(month, 1))}>
            <Icon name="right" />
          </button>
          {month !== monthKey(today) && (
            <button type="button" className="btn btn-small btn-ghost" onClick={() => setMonth(monthKey(today))}>
              Mês atual
            </button>
          )}
        </div>
      </header>

      <div className="totals">
        <div className="total total-pending">
          <p className="total-label">A pagar</p>
          <p className="total-value">{formatBRL(data.pendingCents)}</p>
          <p className="total-sub">
            {data.pending.length} {data.pending.length === 1 ? 'conta' : 'contas'}
          </p>
        </div>
        <div className="total total-paid">
          <p className="total-label">Pago</p>
          <p className="total-value">{formatBRL(data.paidCents)}</p>
          <p className="total-sub">
            {data.paid.length} {data.paid.length === 1 ? 'conta' : 'contas'}
          </p>
        </div>
      </div>
      <p className="hint">Totais das contas com vencimento em {monthName.toLowerCase()}, mesmo se pagas em outro mês.</p>

      {late.length > 0 && (
        <section className="section section-late" aria-labelledby="b-late">
          <h2 id="b-late" className="section-title">
            <Icon name="alert" /> Vencidas e não pagas ({late.length})
          </h2>
          <p className="section-hint">De todos os meses até ontem.</p>
          <ItemList items={late} showDate />
        </section>
      )}

      <section className="section" aria-labelledby="b-next">
        <h2 id="b-next" className="section-title">
          <Icon name="calendar" /> {month === monthKey(today) ? 'Próximos vencimentos' : `A pagar em ${monthName.toLowerCase()}`}
        </h2>
        {upcoming.length ? (
          <ItemList items={upcoming} showDate />
        ) : (
          <p className="muted empty-inline">
            {lateInMonth.length ? 'As contas pendentes deste mês já venceram (veja acima).' : 'Nenhuma conta pendente neste mês.'}
          </p>
        )}
        <button type="button" className="btn btn-secondary btn-block" onClick={onAdd}>
          <Icon name="plus" /> Adicionar conta
        </button>
      </section>

      {data.paid.length > 0 && (
        <section className="section" aria-labelledby="b-paid">
          <h2 id="b-paid" className="section-title">
            <Icon name="check" /> Pagas
          </h2>
          <ItemList items={data.paid} showDate />
        </section>
      )}
    </div>
  );
}
