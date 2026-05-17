import axios from 'axios';

export const api = axios.create({
  baseURL: '',
  timeout: 10000,
});

export async function getStats(params = {}) {
  const { data } = await api.get('/api/stats', { params });
  return data;
}

export async function listEvents(params = {}) {
  const { data } = await api.get('/api/events', { params });
  return data;
}

export async function listSearches(params = {}) {
  const { data } = await api.get('/api/searches', { params });
  return data;
}

export async function getVisitors(params = {}) {
  const { data } = await api.get('/api/visitors', { params });
  return data;
}

export async function listCountries(params = {}) {
  const { data } = await api.get('/api/countries', { params });
  return data;
}

export async function listUsers(params = {}) {
  const { data } = await api.get('/api/users', { params });
  return data;
}

export async function forceHlqueryRefresh() {
  const { data } = await api.post('/api/hlquery/refresh');
  return data;
}
