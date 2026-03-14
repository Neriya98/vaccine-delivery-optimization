import client from './client'

export const getCentres = () => client.get('/centres')

export const getCentre = (id) => client.get(`/centres/${id}`)

export const getRecords = (centreId, days = 30) =>
  client.get(`/centres/${centreId}/records`, { params: { days } })

export const createRecord = (centreId, data) =>
  client.post(`/centres/${centreId}/records`, data)

export const getPredictions = (centreId) =>
  client.get(`/centres/${centreId}/predictions`)

export const refreshPredictions = (centreId) =>
  client.post(`/centres/${centreId}/predictions/refresh`)

export const getAlerts = (centreId) =>
  client.get(`/centres/${centreId}/alerts`)

export const markAlertsRead = (centreId) =>
  client.post(`/centres/${centreId}/alerts/read`)
