import client from './client'

export const getBrewToday = () => client.get('/discovery/brew-today')
export const getFriendBlend = () => client.get('/discovery/friend-blend')
