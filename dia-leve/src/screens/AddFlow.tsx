import { useEffect, useRef, useState } from 'react';
import { formatFull, formatTime } from '../domain/dates';
import { formatBRL } from '../domain/money';
import type { ItemDraft } from '../domain/mutations';
import { FREQ_LABEL } from '../domain/recurrence';
import { KIND_LABEL, type ItemKind, type LocalDate } from '../domain/types';
import { localInterpreter } from '../parser/localInterpreter';
import type { Interpreter, ParsedDraft } from '../parser/types';
import { isVoiceSupported, startDictation, type VoiceSession } from '../services/voice';
import { useStore } from '../state/AppStore';
import { Dialog } from '../ui/Dialog';
import { draftToForm, emptyForm, validateForm, type FormErrors, type FormState } from '../ui/formModel';
import { Icon } from '../ui/Icon';
import { ItemForm } from '../ui/ItemForm';

/** Interpretador em uso. Trocar aqui (ou por configuração) quando houver um com IA. */
const interpreter: Interpreter = localInterpreter;

type Tab = 'text' | 'form';

interface ReviewCard {
  id: number;
  form: FormState;
  warnings: string[];
  source: string;
  errors: FormErrors;
  editing: boolean;
}

export interface AddFlowProps {
  open: boolean;
  onClose(): void;
  defaultDate?: LocalDate | null;
  initialTab?: Tab;
  defaultKind?: ItemKind;
}

export function AddFlow({ open, onClose, defaultDate, initialTab = 'text', defaultKind = 'task' }: AddFlowProps) {
  const store = useStore();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [text, setText] = useState('');
  const [cards, setCards] = useState<ReviewCard[] | null>(null);
  const [failMsg, setFailMsg] = useState('');
  const [form, setForm] = useState<FormState>(() => emptyForm(defaultKind, defaultDate ?? store.today));
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const nextId = useRef(1);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setText('');
      setCards(null);
      setFailMsg('');
      setForm(emptyForm(defaultKind, defaultDate ?? store.today));
      setFormErrors({});
    }
  }, [open]);

  const interpret = async () => {
    setFailMsg('');
    const value = text.trim();
    if (!value) {
      setFailMsg('Escreva o que você precisa lembrar.');
      return;
    }
    const { drafts } = await interpreter.interpret(value, { today: store.today, now: store.now });
    if (!drafts.length) {
      setFailMsg('Não consegui entender. Seu texto foi mantido: ajuste-o ou use o formulário.');
      return;
    }
    setCards(drafts.map((d) => toCard(d, defaultDate)));
  };

  const toCard = (d: ParsedDraft, fallbackDate?: LocalDate | null): ReviewCard => {
    const draft: ItemDraft = !d.date && fallbackDate && d.kind === 'task' ? { ...d, date: fallbackDate } : d;
    const card: ReviewCard = {
      id: nextId.current++,
      form: draftToForm(draft),
      warnings: draft.date !== d.date ? d.warnings.filter((w) => !w.startsWith('Sem data')) : d.warnings,
      source: d.source,
      errors: {},
      editing: false,
    };
    const v = validateForm(card.form);
    if ('errors' in v) {
      card.errors = v.errors;
      card.editing = true;
    }
    return card;
  };

  const updateCard = (id: number, patch: Partial<ReviewCard>) =>
    setCards((cs) => cs?.map((c) => (c.id === id ? { ...c, ...patch } : c)) ?? null);

  const saveAll = async () => {
    if (!cards) return;
    const drafts: ItemDraft[] = [];
    let hasError = false;
    const checked = cards.map((c) => {
      const v = validateForm(c.form);
      if ('errors' in v) {
        hasError = true;
        return { ...c, errors: v.errors, editing: true };
      }
      drafts.push(v.draft);
      return { ...c, errors: {} };
    });
    setCards(checked);
    if (hasError || !drafts.length) return;
    await store.addItems(drafts);
    onClose();
  };

  const saveForm = async () => {
    const v = validateForm(form);
    if ('errors' in v) {
      setFormErrors(v.errors);
      return;
    }
    await store.addItems([v.draft]);
    onClose();
  };

  const reviewing = tab === 'text' && cards !== null;

  const footer = reviewing ? (
    <>
      <button type="button" className="btn btn-ghost" onClick={() => setCards(null)}>
        Voltar ao texto
      </button>
      <button type="button" className="btn btn-primary" onClick={saveAll} disabled={!cards?.length}>
        {cards && cards.length > 1 ? `Salvar ${cards.length} itens` : 'Salvar'}
      </button>
    </>
  ) : tab === 'text' ? (
    <>
      <button type="button" className="btn btn-ghost" onClick={onClose}>
        Cancelar
      </button>
      <button type="button" className="btn btn-primary" onClick={interpret}>
        Continuar
      </button>
    </>
  ) : (
    <>
      <button type="button" className="btn btn-ghost" onClick={onClose}>
        Cancelar
      </button>
      <button type="button" className="btn btn-primary" onClick={saveForm}>
        Salvar
      </button>
    </>
  );

  return (
    <Dialog open={open} onClose={onClose} title={reviewing ? 'Confira antes de salvar' : 'Adicionar'} variant="full" footer={footer}>
      {!reviewing && (
        <div className="tabs" role="tablist" aria-label="Como adicionar">
          <button type="button" role="tab" aria-selected={tab === 'text'} className="tab" onClick={() => setTab('text')}>
            <Icon name="text" size={18} /> Escrever ou falar
          </button>
          <button type="button" role="tab" aria-selected={tab === 'form'} className="tab" onClick={() => setTab('form')}>
            <Icon name="edit" size={18} /> Formulário
          </button>
        </div>
      )}

      {tab === 'text' && !reviewing && (
        <TextEntry text={text} setText={setText} failMsg={failMsg} onSubmit={interpret} />
      )}

      {reviewing && cards && (
        <div className="review">
          <p className="muted">
            Entendi {cards.length === 1 ? 'isto' : `${cards.length} itens`}. Confira e corrija se precisar.
          </p>
          {cards.length === 0 && <p>Nenhum item para salvar. Volte ao texto para tentar de novo.</p>}
          {cards.map((c) => (
            <section key={c.id} className={`review-card kind-${c.form.kind}`} aria-label={`${KIND_LABEL[c.form.kind]}: ${c.form.title}`}>
              <p className="review-source">“{c.source}”</p>
              {c.editing ? (
                <ItemForm
                  value={c.form}
                  onChange={(f) => updateCard(c.id, { form: f })}
                  errors={c.errors}
                  today={store.today}
                />
              ) : (
                <Summary form={c.form} />
              )}
              {c.warnings.length > 0 && (
                <ul className="warnings">
                  {c.warnings.map((w) => (
                    <li key={w}>
                      <Icon name="info" size={16} /> {w}
                    </li>
                  ))}
                </ul>
              )}
              <div className="review-actions">
                {!c.editing && (
                  <button type="button" className="btn btn-small btn-ghost" onClick={() => updateCard(c.id, { editing: true })}>
                    <Icon name="edit" size={18} /> Editar
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-small btn-ghost"
                  onClick={() => setCards((cs) => cs?.filter((x) => x.id !== c.id) ?? null)}
                >
                  <Icon name="trash" size={18} /> Remover
                </button>
              </div>
            </section>
          ))}
        </div>
      )}

      {tab === 'form' && (
        <ItemForm value={form} onChange={setForm} errors={formErrors} today={store.today} />
      )}
    </Dialog>
  );
}

function Summary({ form }: { form: FormState }) {
  const v = validateForm(form);
  const d = 'draft' in v ? v.draft : null;
  return (
    <dl className="summary">
      <div>
        <dt>Tipo</dt>
        <dd>
          <span className={`kind-tag kind-${form.kind}`}>{KIND_LABEL[form.kind]}</span>
        </dd>
      </div>
      <div>
        <dt>Nome</dt>
        <dd>{form.title}</dd>
      </div>
      {form.kind === 'bill' && (
        <div>
          <dt>Valor</dt>
          <dd>{d?.amountCents != null ? formatBRL(d.amountCents) : '—'}</dd>
        </div>
      )}
      <div>
        <dt>{form.kind === 'bill' ? 'Vencimento' : 'Data'}</dt>
        <dd>{d?.date ? formatFull(d.date) : 'Sem data'}</dd>
      </div>
      {form.kind !== 'bill' && (
        <div>
          <dt>Horário</dt>
          <dd>{d?.time ? formatTime(d.time) : form.kind === 'event' ? 'Dia inteiro' : 'Sem horário'}</dd>
        </div>
      )}
      {d?.repeat && (
        <div>
          <dt>Repetir</dt>
          <dd>{FREQ_LABEL[d.repeat]}</dd>
        </div>
      )}
      {d?.priority === 'high' && (
        <div>
          <dt>Prioridade</dt>
          <dd>Alta</dd>
        </div>
      )}
    </dl>
  );
}

type VoiceState = 'idle' | 'listening' | 'error';

function TextEntry({
  text,
  setText,
  failMsg,
  onSubmit,
}: {
  text: string;
  setText(v: string): void;
  failMsg: string;
  onSubmit(): void;
}) {
  const supported = isVoiceSupported();
  const [voice, setVoice] = useState<VoiceState>('idle');
  const [voiceMsg, setVoiceMsg] = useState('');
  const session = useRef<VoiceSession | null>(null);
  const before = useRef('');

  useEffect(() => () => session.current?.cancel(), []);

  const start = () => {
    setVoiceMsg('');
    before.current = text ? `${text.trim()} ` : '';
    const s = startDictation({
      onText: (t) => setText(before.current + t),
      onEnd: () => {
        session.current = null;
        setVoice((v) => (v === 'listening' ? 'idle' : v));
      },
      onError: (msg) => {
        setVoiceMsg(msg);
        setVoice('error');
      },
    });
    if (s) {
      session.current = s;
      setVoice('listening');
    }
  };

  const stop = () => {
    session.current?.stop();
    setVoice('idle');
  };

  const cancel = () => {
    session.current?.cancel();
    session.current = null;
    setText(before.current.trim());
    setVoice('idle');
  };

  return (
    <div className="text-entry">
      <label className="label" htmlFor="nl-text">
        O que você precisa lembrar?
      </label>
      <textarea
        id="nl-text"
        className="input nl-input"
        rows={4}
        value={text}
        placeholder="Ex.: Pagar internet de 120 reais dia 10 e levar minha filha ao dentista na sexta às 15h"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSubmit();
        }}
        aria-describedby="nl-help"
      />
      <p id="nl-help" className="hint">
        Escreva do seu jeito. Você confere tudo antes de salvar. O reconhecimento é simples e feito no próprio aparelho:
        entende datas como “hoje”, “amanhã”, “dia 10”, “sexta às 15h” e valores como “120 reais”.
      </p>
      {failMsg && (
        <p className="field-error" role="alert">
          {failMsg}
        </p>
      )}

      <div className="voice">
        {supported ? (
          voice === 'listening' ? (
            <div className="listening" role="status" aria-live="polite">
              <span className="pulse" aria-hidden="true" />
              <strong>Ouvindo… fale agora.</strong>
              <div className="quick-row">
                <button type="button" className="btn btn-primary btn-small" onClick={stop}>
                  <Icon name="stop" size={18} /> Encerrar
                </button>
                <button type="button" className="btn btn-ghost btn-small" onClick={cancel}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" onClick={start}>
                <Icon name="mic" /> Falar
              </button>
              <p className="hint">
                Ao tocar, o navegador pede permissão para usar o microfone. O texto aparece aqui para você revisar. Neste
                navegador, a voz pode ser convertida em texto por um serviço externo e precisar de internet. Nada é
                gravado.
              </p>
            </>
          )
        ) : (
          <p className="hint notice">
            <Icon name="info" size={16} /> Este navegador não oferece ditado por voz. Digite o texto acima — ou use o
            microfone do próprio teclado do celular, se houver.
          </p>
        )}
        {voiceMsg && (
          <p className="field-error" role="alert">
            {voiceMsg}
          </p>
        )}
      </div>
    </div>
  );
}
