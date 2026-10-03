import { useId } from 'react';
import { formatFull } from '../domain/dates';
import { ALLOWED_FREQ, FREQ_LABEL } from '../domain/recurrence';
import { BILL_CATEGORIES, KIND_LABEL, type ItemKind, type LocalDate } from '../domain/types';
import { changeKind, type FormErrors, type FormState } from './formModel';

interface Props {
  value: FormState;
  onChange(next: FormState): void;
  errors?: FormErrors;
  today: LocalDate;
  /** Esconde a troca de tipo (ex.: ao editar uma ocorrência). */
  lockKind?: boolean;
  /** Esconde o campo de repetição (ex.: ao editar só esta ocorrência). */
  hideRepeat?: boolean;
  compact?: boolean;
}

const TITLE_LABEL: Record<ItemKind, string> = {
  task: 'O que precisa fazer?',
  event: 'Qual é o compromisso?',
  bill: 'Qual é a conta?',
};

export function ItemForm({ value: f, onChange, errors = {}, today, lockKind, hideRepeat }: Props) {
  const id = useId();
  const set = (patch: Partial<FormState>) => onChange({ ...f, ...patch });
  const field = (name: string) => `${id}-${name}`;
  const err = (name: keyof FormErrors) =>
    errors[name] ? (
      <p className="field-error" id={field(`${name}-err`)} role="alert">
        {errors[name]}
      </p>
    ) : null;
  const described = (name: keyof FormErrors) => (errors[name] ? field(`${name}-err`) : undefined);

  return (
    <div className="form">
      {!lockKind && (
        <fieldset className="segmented">
          <legend className="label">Tipo</legend>
          {(['task', 'event', 'bill'] as ItemKind[]).map((k) => (
            <label key={k} className={`seg kind-${k} ${f.kind === k ? 'is-on' : ''}`}>
              <input
                type="radio"
                name={field('kind')}
                checked={f.kind === k}
                onChange={() => onChange(changeKind(f, k, today))}
              />
              {KIND_LABEL[k]}
            </label>
          ))}
        </fieldset>
      )}

      <div className="field">
        <label className="label" htmlFor={field('title')}>
          {TITLE_LABEL[f.kind]}
        </label>
        <input
          id={field('title')}
          className="input"
          value={f.title}
          maxLength={200}
          autoComplete="off"
          aria-invalid={!!errors.title}
          aria-describedby={described('title')}
          onChange={(e) => set({ title: e.target.value })}
        />
        {err('title')}
      </div>

      {f.kind === 'bill' && (
        <div className="field">
          <label className="label" htmlFor={field('amount')}>
            Valor
          </label>
          <div className="input-prefix">
            <span aria-hidden="true">R$</span>
            <input
              id={field('amount')}
              className="input"
              inputMode="decimal"
              placeholder="0,00"
              value={f.amount}
              aria-invalid={!!errors.amount}
              aria-describedby={described('amount')}
              onChange={(e) => set({ amount: e.target.value.replace(/[^\d.,]/g, '') })}
            />
          </div>
          {err('amount')}
        </div>
      )}

      <div className="row-2">
        <div className="field">
          <label className="label" htmlFor={field('date')}>
            {f.kind === 'bill' ? 'Vencimento' : 'Data'}
          </label>
          <input
            id={field('date')}
            type="date"
            className="input"
            value={f.noDate ? '' : f.date}
            disabled={f.kind === 'task' && f.noDate}
            aria-invalid={!!errors.date}
            aria-describedby={described('date')}
            onChange={(e) => set({ date: e.target.value })}
          />
          {err('date')}
        </div>
        {f.kind !== 'bill' && (
          <div className="field">
            <label className="label" htmlFor={field('time')}>
              Horário <span className="optional">(opcional)</span>
            </label>
            <input
              id={field('time')}
              type="time"
              className="input"
              value={f.time}
              disabled={f.kind === 'task' && f.noDate}
              aria-invalid={!!errors.time}
              aria-describedby={described('time')}
              onChange={(e) => set({ time: e.target.value })}
            />
            {err('time')}
          </div>
        )}
      </div>
      {!f.noDate && f.date && <p className="hint">{formatFull(f.date)}</p>}

      {f.kind === 'task' && (
        <label className="check-line">
          <input type="checkbox" checked={f.noDate} onChange={(e) => set({ noDate: e.target.checked, repeat: '' })} />
          Sem data (vai para a lista “Sem data”)
        </label>
      )}

      {f.kind === 'task' && (
        <label className="check-line">
          <input type="checkbox" checked={f.important} onChange={(e) => set({ important: e.target.checked })} />
          Prioridade alta
        </label>
      )}

      {!hideRepeat && !(f.kind === 'task' && f.noDate) && (
        <div className="field">
          <label className="label" htmlFor={field('repeat')}>
            Repetir
          </label>
          <select
            id={field('repeat')}
            className="input"
            value={f.repeat}
            onChange={(e) => set({ repeat: e.target.value as FormState['repeat'] })}
          >
            <option value="">Não repete</option>
            {ALLOWED_FREQ[f.kind].map((fr) => (
              <option key={fr} value={fr}>
                {FREQ_LABEL[fr]}
              </option>
            ))}
          </select>
          {f.kind === 'bill' && f.repeat === 'monthly' && Number(f.date.slice(8)) > 28 && (
            <p className="hint">Nos meses sem dia {Number(f.date.slice(8))}, a conta vence no último dia do mês.</p>
          )}
        </div>
      )}

      {f.kind === 'bill' && (
        <div className="field">
          <label className="label" htmlFor={field('category')}>
            Categoria <span className="optional">(opcional)</span>
          </label>
          <select
            id={field('category')}
            className="input"
            value={f.category}
            onChange={(e) => set({ category: e.target.value })}
          >
            <option value="">Sem categoria</option>
            {BILL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            {f.category && !BILL_CATEGORIES.includes(f.category) && <option value={f.category}>{f.category}</option>}
          </select>
        </div>
      )}

      <div className="field">
        <label className="label" htmlFor={field('notes')}>
          Observação <span className="optional">(opcional)</span>
        </label>
        <textarea
          id={field('notes')}
          className="input"
          rows={2}
          value={f.notes}
          maxLength={1000}
          onChange={(e) => set({ notes: e.target.value })}
        />
      </div>
    </div>
  );
}
