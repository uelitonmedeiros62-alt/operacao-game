import { useMemo, useState } from 'react';
import { formatBRL, sumCents } from '../domain/money';
import { groupOverdue, overdue, type OverdueGroup } from '../domain/occurrences';
import { useStore } from '../state/AppStore';
import { Dialog } from '../ui/Dialog';
import { Icon } from '../ui/Icon';
import { ItemRow } from '../ui/ItemRow';

/**
 * Lista completa de pendências atrasadas, sem limite de tempo.
 * Séries com várias ocorrências atrasadas aparecem agrupadas e podem ser abertas.
 */
export function PendingDialog({ open, onClose }: { open: boolean; onClose(): void }) {
  const { items, today } = useStore();
  const late = useMemo(() => overdue(items, today), [items, today]);
  const bills = useMemo(() => groupOverdue(late.filter((o) => o.kind === 'bill')), [late]);
  const tasks = useMemo(() => groupOverdue(late.filter((o) => o.kind === 'task')), [late]);
  const billTotal = sumCents(late.filter((o) => o.kind === 'bill').map((o) => o.amountCents));

  return (
    <Dialog open={open} onClose={onClose} title="Todas as pendências" variant="full">
      {late.length === 0 ? (
        <div className="empty">
          <Icon name="check" size={36} />
          <h2>Nenhuma pendência atrasada</h2>
          <p>Tudo em dia por aqui.</p>
        </div>
      ) : (
        <>
          <p className="muted">
            {late.length} {late.length === 1 ? 'pendência' : 'pendências'} com data anterior a hoje. Nada é apagado
            automaticamente: cada item fica aqui até ser concluído, pago, adiado ou excluído.
          </p>
          {bills.length > 0 && (
            <section className="section" aria-labelledby="pd-bills">
              <h3 id="pd-bills" className="section-title">
                <Icon name="wallet" /> Contas vencidas · {formatBRL(billTotal)}
              </h3>
              {bills.map((g) => (
                <Group key={g.latest.itemId} group={g} />
              ))}
            </section>
          )}
          {tasks.length > 0 && (
            <section className="section" aria-labelledby="pd-tasks">
              <h3 id="pd-tasks" className="section-title">
                <Icon name="task" /> Tarefas atrasadas
              </h3>
              {tasks.map((g) => (
                <Group key={g.latest.itemId} group={g} />
              ))}
            </section>
          )}
        </>
      )}
    </Dialog>
  );
}

function Group({ group }: { group: OverdueGroup }) {
  const { setDoneMany } = useStore();
  const [expanded, setExpanded] = useState(false);
  const n = group.all.length;
  if (n === 1) {
    return (
      <ul className="item-list">
        <ItemRow occ={group.latest} showDate />
      </ul>
    );
  }
  const isBill = group.latest.kind === 'bill';
  return (
    <div className="group">
      <p className="group-title">
        <strong>{group.latest.title}</strong> · {n} {isBill ? 'vencimentos não pagos' : 'ocorrências não concluídas'}
        {isBill && ` · ${formatBRL(sumCents(group.all.map((o) => o.amountCents)))}`}
      </p>
      <div className="quick-row">
        <button type="button" className="btn btn-small btn-ghost" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          <Icon name="right" size={18} className={expanded ? 'rot-90' : ''} /> {expanded ? 'Esconder' : `Ver as ${n}`}
        </button>
        <button type="button" className="btn btn-small btn-secondary" onClick={() => setDoneMany(group.all, true)}>
          <Icon name="check" size={18} /> {isBill ? `Marcar as ${n} como pagas` : `Concluir as ${n}`}
        </button>
      </div>
      <ul className="item-list">
        {(expanded ? [...group.all].reverse() : [group.latest]).map((o) => (
          <ItemRow key={o.key} occ={o} showDate />
        ))}
      </ul>
    </div>
  );
}
