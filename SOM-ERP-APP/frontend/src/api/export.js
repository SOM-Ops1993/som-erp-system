import { api } from '../context/context.jsx'

export const exportApi = {
  salesOrders:        (params) => `${api.defaults.baseURL}/export/sales-orders?${new URLSearchParams(params)}`,
  atRiskOrders:       ()       => `${api.defaults.baseURL}/export/at-risk-orders`,
  dispatchSummary:    (params) => `${api.defaults.baseURL}/export/dispatch-summary?${new URLSearchParams(params)}`,
  salesPerformance:   ()       => `${api.defaults.baseURL}/export/sales-performance`,
  microbialStock:     ()       => `${api.defaults.baseURL}/export/microbial-stock`,
  cfuDecay:           ()       => `${api.defaults.baseURL}/export/cfu-decay`,
  microbialTx:        ()       => `${api.defaults.baseURL}/export/microbial-transactions`,
  demandStockGap:     ()       => `${api.defaults.baseURL}/export/demand-stock-gap`,
  productionSchedule: ()       => `${api.defaults.baseURL}/export/production-schedule`,
  timeMotion:         ()       => `${api.defaults.baseURL}/export/time-motion`,
  equipUtilisation:   ()       => `${api.defaults.baseURL}/export/equipment-utilisation`,
  rmForecast:         ()       => `${api.defaults.baseURL}/export/rm-forecast`,
  managementPack:     ()       => `${api.defaults.baseURL}/export/management-pack`,
  gateInwardLog:      ()       => `${api.defaults.baseURL}/export/gate-inward-log`,
}

export function exportUrl(path) {
  const token = localStorage.getItem('erp_token')
  const sep = path.includes('?') ? '&' : '?'
  return token ? `${path}${sep}_token=${token}` : path
}
