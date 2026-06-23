import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/admin';

export const http = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

function joinUrl(base, path) {
  if (!path) return base;
  if (/^https?:\/\//i.test(path)) return path;
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

// Returns the endpoint URL for a resource.
// Uses VITE env override first, then defaultEndpoint, then resource.path.
export function getResourceUrl(resource) {
  const override = resource.envKey ? import.meta.env[resource.envKey] : undefined;
  const endpoint = override || resource.defaultEndpoint || resource.path;
  return joinUrl(baseURL, endpoint);
}

export function getRecordId(record, resource) {
  if (!record) return '';
  if (Array.isArray(resource.idField)) {
    return resource.idField.map((f) => encodeURIComponent(record[f])).join('/');
  }
  return encodeURIComponent(record[resource.idField]);
}

// Returns { data: [], total, page, limit } so callers can display accurate totals.
export async function listRecords(resource, params = {}) {
  const { data } = await axios.get(getResourceUrl(resource), { params });
  if (Array.isArray(data)) return { data, total: data.length };
  return {
    data:  data?.data    ?? data?.records ?? [],
    total: data?.total   ?? (data?.data?.length ?? 0),
    page:  data?.page,
    limit: data?.limit,
  };
}

export async function createRecord(resource, payload) {
  const { data } = await axios.post(getResourceUrl(resource), payload);
  return data;
}

export async function updateRecord(resource, record, payload) {
  const url = `${getResourceUrl(resource)}/${getRecordId(record, resource)}`;
  const { data } = await axios.put(url, payload);
  return data;
}

export async function deleteRecord(resource, record) {
  const url = `${getResourceUrl(resource)}/${getRecordId(record, resource)}`;
  const { data } = await axios.delete(url);
  return data;
}

export async function deleteAllRecords(resource) {
  const { data } = await axios.delete(getResourceUrl(resource));
  return data;
}
