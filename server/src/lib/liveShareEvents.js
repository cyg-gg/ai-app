const rooms = new Map()

export function subscribe(roomId, listener) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Set())
  const listeners = rooms.get(roomId)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) rooms.delete(roomId)
  }
}

export function publish(roomId, payload) {
  const listeners = rooms.get(roomId)
  if (!listeners) return
  for (const listener of listeners) listener(payload)
}
