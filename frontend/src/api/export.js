import { erpApi as api } from '../context/context.jsx'

export const exportApi = {
  salesOrders:        (params) => `${api.defaults.baseURL}/erp/export/sales-orders?${new URLSearchParams(params)}`,
  atRiskOrders:       ()       => `${api.defaults.baseURL}/erp/export/at-risk-orders`,
  dispatchSummary:    (params) => `${api.defaults.baseURL}/erp/export/dispatch-summary?${new URLSearchParams(params)}`,
  salesPerformance:   ()       => `${api.defaults.baseURL}/erp/export/sales-performance`,
  microbialStock:     ()       => `${api.defaults.baseURL}/erp/export/microbial-stock`,
  cfuDecay:           ()       => `${api.defaults.baseURL}/erp/export/cfu-decay`,
  microbialTx:        ()       => `${api.defaults.baseURL}/erp/export/microbial-transactions`,
  demandStockGap:     ()       => `${api.defaults.baseURL}/erp/export/demand-stock-gap`,
  productionSchedule: ()       => `${api.defaults.baseURL}/erp/export/production-schedule`,
  timeMotion:         ()       => `${api.defaults.baseURL}/erp/export/time-motion`,
  equipUtilisation:   ()       => `${api.defaults.baseURL}/erp/export/equipment-utilisation`,
  rmForecast:         ()       => `${api.defaults.baseURL}/erp/export/rm-forecast`,
  managementPack:     ()       => `${api.defaults.baseURL}/erp/export/management-pack`,
  gateInwardLog:      ()       => `${api.defaults.baseURL}/erp/export/gate-inward-log`,
}

export function exportUrl(path) {
  const token = localStorage.getItem('erp_token')
  const sep = path.includes('?') ? '&' : '?'
  return token ? `${path}${sep}_token=${token}` : path
}
