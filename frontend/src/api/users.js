import client from './client'

export const getUserProfile = (userId) => client.get(`/users/${userId}`)
export const getUserVisits = (userId) => client.get(`/visits/user/${userId}`)
export const followUser = (userId) => client.post(`/users/${userId}/follow`)
export const unfollowUser = (userId) => client.delete(`/users/${userId}/follow`)
export const getFeed = () => client.get('/visits/feed')
