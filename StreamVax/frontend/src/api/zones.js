import client from './client'

export const getZones = () => client.get('/zones')

export const getZoneCentres = (zoneId) =>
  client.get(`/zones/${zoneId}/centres`)

export const getDeliveries = (zoneId) =>
  client.get(`/zones/${zoneId}/deliveries`)

export const createDelivery = (zoneId, data) =>
  client.post(`/zones/${zoneId}/deliveries`, data)

export const updateDeliveryStatus = (deliveryId, statut) =>
  client.put(`/deliveries/${deliveryId}/status`, { statut })
