import { io } from 'socket.io-client'
import { SOCKET_URL } from '../config/api'

let socket = null

export function getSocket() {
  if (!socket) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
      auth: {
        token: token || undefined,
      },
    })

    socket.on('connect', () => {
      if (import.meta.env.DEV) {
        console.log(`[SOCKET] Connected to real-time server (ID: ${socket.id})`)
      }
    })

    socket.on('disconnect', (reason) => {
      if (import.meta.env.DEV) {
        console.log(`[SOCKET] Disconnected from server: ${reason}`)
      }
    })

    socket.on('connect_error', (error) => {
      if (import.meta.env.DEV) {
        console.warn(`[SOCKET] Connection error:`, error.message || error)
      }
    })

    socket.on('reconnect', (attemptNumber) => {
      if (import.meta.env.DEV) {
        console.log(`[SOCKET] Reconnected after ${attemptNumber} attempts`)
      }
      // Re-authenticate / re-join user room on reconnect
      const currentToken = localStorage.getItem('token')
      const currentUserStr = localStorage.getItem('user')
      if (currentToken && currentUserStr) {
        try {
          const user = JSON.parse(currentUserStr)
          if (user?._id || user?.id) {
            socket.emit('join_user', { userId: user._id || user.id, token: currentToken })
          }
        } catch {}
      }
    })
  }

  return socket
}

export function updateSocketAuth(token, userId) {
  const s = getSocket()
  if (s) {
    s.auth = { token: token || undefined }
    if (token && userId) {
      s.emit('join_user', { userId, token })
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

export function joinOrderRoom(orderId) {
  if (!orderId) return
  const s = getSocket()
  s.emit('join_order', { orderId: String(orderId) })
}

export default getSocket
