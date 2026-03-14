import client from './client'

export const getNational = () => client.get('/dashboard/national')

export const getMapData = () => client.get('/dashboard/map-data')
