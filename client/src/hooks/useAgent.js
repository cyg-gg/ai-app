import { useState, useCallback } from 'react'
import { agentAPI } from '../api/chat'
import { v4 as uuid } from 'uuid'

export function useAgent() {
  const [tasks,   setTasks]   = useState([])    // 每次调用作为一个任务
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const run = useCallback(async (input) => {
    if (!input.trim() || loading) return

    const taskId  = uuid()
    const newTask = {
      id:     taskId,
      input,
      steps:  [],
      output: '',
      status: 'running',
      ts:     Date.now(),
    }

    setTasks(prev => [newTask, ...prev])
    setLoading(true)
    setError(null)

    try {
      for await (const data of agentAPI.stream(input)) {
        if (data.type === 'step') {
          setTasks(prev =>
            prev.map(t =>
              t.id === taskId
                ? { ...t, steps: [...t.steps, data] }
                : t
            )
          )
        }
        if (data.type === 'done') {
          setTasks(prev =>
            prev.map(t =>
              t.id === taskId
                ? { ...t, output: data.output, status: 'done', steps: data.steps }
                : t
            )
          )
        }
        if (data.type === 'error') throw new Error(data.message)
      }
    } catch (e) {
      setError(e.message)
      setTasks(prev =>
        prev.map(t =>
          t.id === taskId
            ? { ...t, status: 'error', output: e.message }
            : t
        )
      )
    } finally {
      setLoading(false)
    }
  }, [loading])

  const clear = useCallback(() => {
    setTasks([])
    setError(null)
  }, [])

  return { tasks, loading, error, run, clear }
}
