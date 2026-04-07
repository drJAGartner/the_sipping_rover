import client from './client'

export const register = (email, password, displayName) =>
  client.post('/auth/register', { email, password, display_name: displayName })

export const login = (email, password) => {
  const form = new URLSearchParams()
  form.append('username', email)
  form.append('password', password)
  return client.post('/auth/token', form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
}

export const getMe = () => client.get('/users/me')
