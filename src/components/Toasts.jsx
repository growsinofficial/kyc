import { useCallback, useState } from 'react'
import { ToastContext } from './toastContext'

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const toast = useCallback((text, kind) => {
    const id = Math.random().toString(36).slice(2)
    setItems((list) => [...list, { id, text, kind }])
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 3200)
  }, [])
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast${t.kind === 'warn' ? ' warn' : ''}`}>{t.text}</div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
