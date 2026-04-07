import client from './client'

export const searchCafes = (q) => client.get('/cafes/search', { params: { q } })
export const createCafe = (data) => client.post('/cafes', data)
export const fetchCafeLogo = (id) => client.post(`/cafes/${id}/fetch-logo`)
export const getNearbyCafes = (lat, lng, radius_m) => client.get('/cafes/nearby', { params: { lat, lng, radius_m } })
export const getCafe = (id) => client.get(`/cafes/${id}`)
