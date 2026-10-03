import { useState } from 'react';
import { useStore } from '../state/AppStore';
import { Icon } from '../ui/Icon';

export function Onboarding({ onFirstReminder }: { onFirstReminder(): void }) {
  const { updateSettings, loadExample } = useStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');

  const finish = async (withExample: boolean) => {
    if (withExample) await loadExample();
    await updateSettings({ name: name.trim(), onboarded: true });
    if (!withExample) onFirstReminder();
  };

  return (
    <main className="onboarding" id="conteudo">
      <div className="onb-card">
        <div className="logo" aria-hidden="true">
          <Icon name="sun" size={36} />
        </div>
        {step === 1 && (
          <>
            <h1>Organize seu dia sem complicação.</h1>
            <p className="lead">Tire as coisas da cabeça e saiba o que fazer hoje.</p>
            <ul className="onb-list">
              <li>
                <Icon name="task" /> Tarefas do dia a dia
              </li>
              <li>
                <Icon name="clock" /> Compromissos com horário
              </li>
              <li>
                <Icon name="wallet" /> Contas a pagar
              </li>
            </ul>
            <p className="muted small">Sem cadastro. Seus dados ficam neste aparelho.</p>
            <button type="button" className="btn btn-primary btn-block" onClick={() => setStep(2)}>
              Começar
            </button>
          </>
        )}
        {step === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep(3);
            }}
          >
            <h1>Como você gosta de ser chamado(a)?</h1>
            <p className="muted">Opcional. Usamos só para dar bom dia.</p>
            <div className="field">
              <label className="label" htmlFor="onb-name">
                Seu nome ou apelido
              </label>
              <input
                id="onb-name"
                className="input"
                value={name}
                maxLength={40}
                autoComplete="given-name"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              Continuar
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={() => {
                setName('');
                setStep(3);
              }}
            >
              Pular
            </button>
          </form>
        )}
        {step === 3 && (
          <>
            <h1>{name.trim() ? `Pronto, ${name.trim()}!` : 'Tudo pronto!'}</h1>
            <p className="muted">Como você quer começar?</p>
            <button type="button" className="btn btn-primary btn-block" onClick={() => finish(false)}>
              <Icon name="plus" /> Adicionar meu primeiro lembrete
            </button>
            <button type="button" className="btn btn-secondary btn-block" onClick={() => finish(true)}>
              Explorar um exemplo
            </button>
            <p className="hint">O exemplo usa dados fictícios, identificados como “Exemplo”, e pode ser removido com um toque.</p>
          </>
        )}
      </div>
    </main>
  );
}
