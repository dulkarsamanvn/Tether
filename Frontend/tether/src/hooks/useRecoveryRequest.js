import { useEffect, useRef, useState } from 'react'

export default function useRecoveryRequest() {
  const request = useRef(null)
  const [loading, setLoading] = useState(false)
  const [retryAt, setRetryAt] = useState(0)
  const [now, setNow] = useState(Date.now)

  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => {
    if (!retryAt) return
    const timer = setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= retryAt) setRetryAt(0)
    }, 1000)
    return () => clearInterval(timer)
  }, [retryAt])

  const cooldown = Math.max(0, Math.ceil((retryAt - now) / 1000))
  const wait = (seconds) => {
    const current = Date.now()
    setNow(current)
    setRetryAt(current + seconds * 1000)
  }
  const start = () => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setLoading(true)
    return controller
  }
  const finish = (controller) => {
    if (!controller.signal.aborted) setLoading(false)
  }

  return { loading, cooldown, start, finish, wait }
}
