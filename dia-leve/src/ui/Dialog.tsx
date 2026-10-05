import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

interface Props {
  open: boolean;
  onClose(): void;
  title: string;
  children: ReactNode;
  /** "sheet" sobe da parte de baixo no celular; "full" ocupa a tela toda no celular. */
  variant?: 'sheet' | 'full';
  footer?: ReactNode;
}

/**
 * Janela acessível baseada no elemento <dialog> nativo:
 * prende o foco, fecha com Esc e devolve o foco ao botão que a abriu.
 */
export function Dialog({ open, onClose, title, children, variant = 'sheet', footer }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  const downOnBackdrop = useRef(false);
  onCloseRef.current = onClose;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      const opener = document.activeElement as HTMLElement | null;
      if (typeof el.showModal === 'function') el.showModal();
      else el.setAttribute('open', '');
      document.body.classList.add('no-scroll');
      return () => {
        document.body.classList.remove('no-scroll');
        if (el.open) el.close?.();
        opener?.focus?.();
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      className={`dialog dialog-${variant}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onCloseRef.current();
      }}
      onPointerDown={(e) => {
        downOnBackdrop.current = e.target === ref.current;
      }}
      onClick={(e) => {
        // Fecha tocando fora apenas nas janelas menores, e só se o toque começou e
        // terminou no fundo — evita fechar sem querer ao rolar ou durante a animação.
        if (variant === 'sheet' && downOnBackdrop.current && e.target === ref.current) onCloseRef.current();
        downOnBackdrop.current = false;
      }}
    >
      <div className="dialog-inner">
        <header className="dialog-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-btn" onClick={() => onCloseRef.current()} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </header>
        <div className="dialog-body">{children}</div>
        {footer && <footer className="dialog-footer">{footer}</footer>}
      </div>
    </dialog>
  );
}
