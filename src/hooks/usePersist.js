import { saveUserProgress } from '../utils/storage'

export const usePersist = (setState) => {
  return (next) => {
    setState((prev) => {
      const snapshot = typeof next === 'function' ? next(prev) : next
      try {
        const ident = snapshot.userData?.email || snapshot.userData?.mobile
        if (ident) {
          saveUserProgress(snapshot.userData.email, snapshot)
          saveUserProgress(snapshot.userData.mobile, snapshot)
        }
      } catch {
        // Ignore storage errors in production
      }
      return snapshot
    })
  }
}
