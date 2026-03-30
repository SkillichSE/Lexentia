import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'

type NotificationType = 'info' | 'success' | 'error'

type Notification = {
  message: string
  type: NotificationType
}

type NotificationContextProps = {
  showNotification: (message: string, type?: NotificationType, durationMs?: number) => void
}

const NotificationContext = createContext<NotificationContextProps | null>(null)

export function useNotification() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return ctx
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<Notification | null>(null)
  const [visible, setVisible] = useState(false)
  const [durationMs, setDurationMs] = useState(6000)

  useEffect(() => {
    if (!notification) return
    setVisible(true)

    const timer = window.setTimeout(() => {
      setVisible(false)
      window.setTimeout(() => setNotification(null), 300)
    }, durationMs)

    return () => window.clearTimeout(timer)
  }, [notification, durationMs])

  const showNotification = (message: string, type: NotificationType = 'info', duration = 6000) => {
    setNotification({ message, type })
    setDurationMs(duration)
    setVisible(true)
  }

  const value = useMemo(() => ({ showNotification }), [])

  const closeNotification = () => {
    setVisible(false)
    window.setTimeout(() => setNotification(null), 300)
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {notification && (
        <div className={`lex-toast-container ${visible ? 'lex-toast-visible' : ''}`}>
          <div className={`lex-toast lex-toast--${notification.type}`}>
            <span>{notification.message}</span>
            <button
              onClick={closeNotification}
              style={{
                marginLeft: 12,
                border: 'none',
                background: 'transparent',
                color: 'inherit',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: 12,
              }}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  )
}
