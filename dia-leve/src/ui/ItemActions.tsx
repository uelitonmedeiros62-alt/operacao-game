import { createContext, useContext, useState, type ReactNode } from 'react';
import { addDays, formatFull, formatTime, isLocalDate, isLocalTime } from '../domain/dates';
import { formatBRL } from '../domain/money';
import { findOccurrence } from '../domain/occurrences';
import { describeRecurrence } from '../domain/recurrence';
import type { ItemDraft, Scope } from '../domain/mutations';
import { KIND_LABEL, type Occurrence } from '../domain/types';
import { buildIcs } from '../services/ics';
import { downloadText } from '../services/download';
import { useStore } from '../state/AppStore';
import { Dialog } from './Dialog';
import { occurrenceToForm, validateForm, type FormErrors, type FormState } from './formModel';
import { Icon } from './Icon';
import { ItemForm } from './ItemForm';

type Mode = 'menu' | 'edit' | 'postpone' | 'scope-edit' | 'scope-delete';

interface Ctx {
  open(occ: Occurrence): void;
}

const ActionsCtx = createContext<Ctx>({ open: () => {} });
export const useItemActions = () => useContext(ActionsCtx);

/** Concentra as ações sobre um item: concluir, editar, adiar, destacar, excluir. */
export function ItemActionsProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const [key, setKey] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('menu');
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [pendingDraft, setPendingDraft] = useState<ItemDraft | null>(null);

  // Sempre lê a versão atual (reflete mudanças feitas enquanto a janela está aberta).
  const occ = key ? findOccurrence(store.items, key) : null;
  const close = () => {
    setKey(null);
    setMode('menu');
    setForm(null);
    setErrors({});
    setPendingDraft(null);
  };

  const open = (o: Occurrence) => {
    setKey(o.key);
    setMode('menu');
  };

  const highlighted = occ ? (store.settings.highlights[store.today] ?? []).includes(occ.key) : false;

  const run = async (fn: () => Promise<void>) => {
    close();
    await fn();
  };

  const startEdit = () => {
    if (!occ) return;
    setForm(occurrenceToForm(occ));
    setErrors({});
    setMode('edit');
  };

  const saveEdit = async () => {
    if (!occ || !form) return;
    const r = validateForm(form);
    if ('errors' in r) {
      setErrors(r.errors);
      return;
    }
    if (occ.isRecurring) {
      setPendingDraft(r.draft);
      setMode('scope-edit');
      return;
    }
    await run(() => store.edit(occ, r.draft, 'this'));
  };

  const applyScope = async (scope: Scope) => {
    if (!occ) return;
    if (mode === 'scope-edit' && pendingDraft) {
      const draft = scope === 'this' ? { ...pendingDraft, repeat: occ.recurrence?.freq ?? null } : pendingDraft;
      await run(() => store.edit(occ, draft, scope));
    } else if (mode === 'scope-delete') {
      await run(() => store.remove(occ, scope));
    }
  };

  const askDelete = async () => {
    if (!occ) return;
    if (occ.isRecurring) setMode('scope-delete');
    else await run(() => store.remove(occ, 'this'));
  };

  let dialog: ReactNode = null;
  if (occ) {
    const done = occ.status === 'done';
    const isBill = occ.kind === 'bill';
    if (mode === 'menu') {
      dialog = (
        <Dialog open onClose={close} title={occ.title}>
          <p className="muted detail-line">
            {KIND_LABEL[occ.kind]}
            {occ.date ? ` · ${formatFull(occ.date)}` : ' · Sem data'}
            {occ.time ? ` · ${formatTime(occ.time)}` : ''}
            {isBill && occ.amountCents != null ? ` · ${formatBRL(occ.amountCents)}` : ''}
          </p>
          {occ.isRecurring && occ.recurrence && occ.date && (
            <p className="muted detail-line">
              <Icon name="repeat" size={16} /> {describeRecurrence(occ.recurrence, occ.originalDate ?? occ.date)}
            </p>
          )}
          {occ.notes && <p className="notes">{occ.notes}</p>}
          <div className="action-list">
            <button type="button" className="action" onClick={() => run(() => store.setDone(occ, !done))}>
              <Icon name={done ? 'undo' : 'check'} />
              {isBill ? (done ? 'Desfazer pagamento' : 'Marcar como pago') : done ? 'Reabrir' : 'Concluir'}
            </button>
            <button type="button" className="action" onClick={startEdit}>
              <Icon name="edit" /> Editar
            </button>
            {!done && (
              <button type="button" className="action" onClick={() => setMode('postpone')}>
                <Icon name="later" /> Adiar
              </button>
            )}
            {occ.kind === 'task' && !done && (
              <button type="button" className="action" onClick={() => run(() => store.toggleHighlight(occ))}>
                <Icon name="star" /> {highlighted ? 'Tirar do destaque de hoje' : 'Destacar hoje'}
              </button>
            )}
            {occ.kind === 'event' && occ.date && (
              <button
                type="button"
                className="action"
                onClick={() => {
                  downloadText(`${occ.title.slice(0, 40) || 'compromisso'}.ics`, buildIcs([occ]), 'text/calendar');
                  close();
                }}
              >
                <Icon name="calendar" /> Adicionar ao calendário do celular
              </button>
            )}
            <button type="button" className="action action-danger" onClick={askDelete}>
              <Icon name="trash" /> Excluir
            </button>
          </div>
        </Dialog>
      );
    } else if (mode === 'edit' && form) {
      dialog = (
        <Dialog
          open
          onClose={close}
          variant="full"
          title={`Editar ${KIND_LABEL[occ.kind].toLowerCase()}`}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={close}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={saveEdit}>
                Salvar
              </button>
            </>
          }
        >
          <ItemForm value={form} onChange={setForm} errors={errors} today={store.today} lockKind />
        </Dialog>
      );
    } else if (mode === 'postpone') {
      dialog = <PostponeDialog occ={occ} onClose={close} onDone={(d, t) => run(() => store.postpone(occ, d, t))} />;
    } else if (mode === 'scope-edit' || mode === 'scope-delete') {
      dialog = (
        <Dialog open onClose={close} title={mode === 'scope-edit' ? 'Aplicar alterações em…' : 'Excluir…'}>
          <p className="muted">Este item se repete. O que você quer {mode === 'scope-edit' ? 'alterar' : 'excluir'}?</p>
          <div className="action-list">
            <button type="button" className="action" onClick={() => applyScope('this')}>
              Somente esta ocorrência
            </button>
            <button
              type="button"
              className={`action ${mode === 'scope-delete' ? 'action-danger' : ''}`}
              onClick={() => applyScope('following')}
            >
              Esta e as próximas
            </button>
          </div>
          {mode === 'scope-edit' && (
            <p className="hint">Mudanças na repetição só valem para “Esta e as próximas”.</p>
          )}
        </Dialog>
      );
    }
  }

  return (
    <ActionsCtx.Provider value={{ open }}>
      {children}
      {dialog}
    </ActionsCtx.Provider>
  );
}

function PostponeDialog({
  occ,
  onClose,
  onDone,
}: {
  occ: Occurrence;
  onClose(): void;
  onDone(date: string, time?: string | null): void;
}) {
  const { today } = useStore();
  const base = occ.date && occ.date > today ? occ.date : today;
  const [date, setDate] = useState(occ.kind === 'event' ? '' : addDays(base, 1));
  const [time, setTime] = useState(occ.kind === 'event' ? '' : occ.time ?? '');
  const [error, setError] = useState('');
  const isEvent = occ.kind === 'event';

  const confirm = () => {
    if (!isLocalDate(date)) return setError('Escolha a nova data.');
    if (isEvent && !isLocalTime(time)) return setError('Escolha o novo horário.');
    if (time && !isLocalTime(time)) return setError('Horário inválido.');
    onDone(date, occ.kind === 'bill' ? undefined : time || null);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Adiar"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={confirm}>
            Salvar nova data
          </button>
        </>
      }
    >
      {isEvent ? (
        <p className="muted">Escolha a nova data e o novo horário do compromisso.</p>
      ) : (
        <div className="quick-row">
          <button type="button" className="chip" onClick={() => onDone(addDays(today, 1), undefined)}>
            Amanhã
          </button>
          <button type="button" className="chip" onClick={() => onDone(addDays(base, 7), undefined)}>
            Daqui a 1 semana
          </button>
        </div>
      )}
      {occ.isRecurring && <p className="hint">Só esta ocorrência será adiada. As próximas continuam iguais.</p>}
      <div className="row-2">
        <div className="field">
          <label className="label" htmlFor="pp-date">
            Nova data
          </label>
          <input id="pp-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {occ.kind !== 'bill' && (
          <div className="field">
            <label className="label" htmlFor="pp-time">
              Novo horário {!isEvent && <span className="optional">(opcional)</span>}
            </label>
            <input id="pp-time" type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        )}
      </div>
      {isLocalDate(date) && <p className="hint">{formatFull(date)}</p>}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  );
}
