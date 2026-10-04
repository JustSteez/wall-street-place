import type { Toast } from '../hooks/useTx'

export function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          <span>{t.message}</span>
          {t.link && (
            <a href={t.link} target="_blank" rel="noreferrer" className="mono small">
              view tx
            </a>
          )}
          <button aria-label="Dismiss" onClick={() => onDismiss(t.id)}>×</button>
        </div>
      ))}
    </div>
  )
}
