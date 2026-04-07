import client from './client'

export const createTierList = (data) => client.post('/tier-lists', data)
export const getTierList = (id) => client.get(`/tier-lists/${id}`)
export const updateTierList = (id, data) => client.patch(`/tier-lists/${id}`, data)
export const deleteTierList = (id) => client.delete(`/tier-lists/${id}`)
export const getUserTierLists = (userId) => client.get(`/tier-lists/user/${userId}`)
