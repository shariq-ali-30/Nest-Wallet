import { useEffect, useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, Copy, Eye, EyeOff, Info, Loader2, X } from 'lucide-react';

export const cx = (...parts) => parts.filter(Boolean).join(' ');

export function Spinner({ className }) {
  return <Loader2 className={cx('animate-spin', className)} aria-hidden="true" />;
}

const buttonSizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

const buttonVariants = {
  primary: 'bg-brand text-white hover:bg-brand-dark',
  secondary: 'border border-line bg-white text-ink hover:bg-canvas',
  ghost: 'text-muted hover:bg-canvas hover:text-ink',
  danger: 'bg-danger text-white hover:bg-danger-dark',
  dangerOutline: 'border border-danger/40 bg-white text-danger hover:bg-danger-soft',
  light: 'bg-white text-brand hover:bg-brand-soft',
  lightOutline: 'border border-white/50 text-white hover:bg-white/10',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  children,
  className,
  disabled,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        'disabled:cursor-not-allowed disabled:opacity-50',
        buttonSizes[size],
        buttonVariants[variant],
        className
      )}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export const inputClass =
  'w-full rounded-md border border-line bg-white px-3 text-base text-ink placeholder:text-muted/70 ' +
  'focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-brand';

export function PasswordInput({ className, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={cx(inputClass, 'pr-11', className)}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        title={visible ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
      >
        {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

export function Field({ label, hint, error, htmlFor, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Card({ className, children }) {
  return <section className={cx('rounded-lg border border-line bg-white', className)}>{children}</section>;
}

export function CardHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
      <h2 className="text-base font-semibold">{title}</h2>
      {action}
    </div>
  );
}

const noticeStyles = {
  info: { box: 'bg-brand-soft text-ink', icon: 'text-brand', Icon: Info },
  warn: { box: 'bg-warn-soft text-ink', icon: 'text-warn', Icon: AlertTriangle },
  danger: { box: 'bg-danger-soft text-ink', icon: 'text-danger', Icon: AlertTriangle },
  success: { box: 'bg-ok-soft text-ink', icon: 'text-ok', Icon: CheckCircle2 },
};

export function Notice({ tone = 'info', title, children, className }) {
  const s = noticeStyles[tone];
  return (
    <div className={cx('flex gap-3 rounded-md p-4 text-sm', s.box, className)} role={tone === 'danger' ? 'alert' : undefined}>
      <s.Icon className={cx('mt-0.5 size-5 shrink-0', s.icon)} aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export function CopyButton({ text, tone = 'dark', label = 'Copy' }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={done ? 'Copied' : label}
      title={done ? 'Copied' : label}
      className={cx(
        'inline-flex size-7 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand',
        tone === 'light' ? 'text-white hover:bg-white/15' : 'text-muted hover:bg-canvas hover:text-ink'
      )}
    >
      {done ? <Check className="size-4" /> : <Copy className="size-4" />}
    </button>
  );
}

export function Modal({ open, title, onClose, children, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-canvas hover:text-ink"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-3 border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Badge({ tone = 'warn', children }) {
  const tones = {
    warn: 'bg-warn-soft text-warn',
    danger: 'bg-danger-soft text-danger',
    ok: 'bg-ok-soft text-ok',
  };
  return <span className={cx('rounded-full px-2 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>;
}

export function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-3 inline-flex size-11 items-center justify-center rounded-full bg-canvas text-muted">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="font-medium">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-muted">{children}</p>}
    </div>
  );
}
