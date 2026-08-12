import { io } from 'socket.io-client'
import { SOCKET_URL } from '../config/api'

let socket = null

export function getSocket() {
  if (!socket) {
    const adminSessionId = typeof window !== 'undefined' ? localStorage.getItem('lily_admin_session_id') : null

    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
      auth: {
        adminSessionId: adminSessionId || undefined,
      },
    })

    socket.on('connect', () => {
      if (import.meta.env.DEV) {
        console.log(`[SOCKET] Admin connected to real-time server (ID: ${socket.id})`)
      }
      // Request join admin room
      const currentSessionId = localStorage.getItem('lily_admin_session_id')
      if (currentSessionId) {
        socket.emit('join_admin', { adminSessionId: currentSessionId })
      }
    })

    socket.on('disconnect', (reason) => {
      if (import.meta.env.DEV) {
        console.log(`[SOCKET] Admin disconnected from server: ${reason}`)
      }
    })

    socket.on('connect_error', (error) => {
      if (import.meta.env.DEV) {
        console.warn(`[SOCKET] Admin connection error:`, error.message || error)
      }
    })

    socket.on('reconnect', (attemptNumber) => {
      if (import.meta.env.DEV) {
        console.log(`[SOCKET] Admin reconnected after ${attemptNumber} attempts`)
      }
      const currentSessionId = localStorage.getItem('lily_admin_session_id')
      if (currentSessionId) {
        socket.emit('join_admin', { adminSessionId: currentSessionId })
      }
    })
  }

  return socket
}

export function updateAdminSocketAuth(sessionId) {
  const s = getSocket()
  if (s) {
    s.auth = { adminSessionId: sessionId || undefined }
    if (sessionId) {
      s.emit('join_admin', { adminSessionId: sessionId })
    }
  }
}

export function subscribeToEvent(eventName, callback) {
  const s = getSocket()
  s.on(eventName, callback)
  return () => {
    s.off(eventName, callback)
  }
}

export default getSocket
