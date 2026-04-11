import client from './client'

export const getMyVisits = () => client.get('/visits/me')
export const createVisit = (data) => client.post('/visits', data)
export const updateVisit = (id, data) => client.patch(`/visits/${id}`, data)
export const deleteVisit = (id) => client.delete(`/visits/${id}`)
export const getPublicVisitsForCafe = (cafeId) => client.get(`/visits/cafe/${cafeId}/public`)
export const getMyVisitForCafe = (cafeId) => client.get(`/visits/cafe/${cafeId}/mine`)
export const getUserVisits = (userId) => client.get(`/visits/user/${userId}`)
export const getFeed = () => client.get('/visits/feed')
