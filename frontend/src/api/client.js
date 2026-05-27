import axios from 'axios'

// In production: VITE_API_URL=https://db.tanish.cloud
// In development: empty string (Vite proxy routes /auth,/chat,/calendar → localhost:8000)
const baseURL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL,
  withCredentials: true, // Always send the httpOnly JWT cookie
  headers: { 'Content-Type': 'application/json' },
})

export default api

