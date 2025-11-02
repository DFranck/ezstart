import { useEffect, useState } from 'react'

export function useCountdown(initialSeconds: number = 300) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          return initialSeconds // Reset to initial value
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [initialSeconds])

  const reset = () => setSecondsLeft(initialSeconds)

  return { secondsLeft, reset }
}
