import api from './api';

export const proposeVibeDate = async (payload) => {
  const response = await api.post('/vibedates', payload);
  return response.data;
};

export const listVibeDates = async (page = 1, size = 20, timezone = 'UTC') => {
  const params = new URLSearchParams({ page, size, timezone });
  const response = await api.get(`/vibedates?${params.toString()}`);
  return response.data;
};

export const getVibeDateDetails = async (dateId) => {
  const response = await api.get(`/vibedates/${dateId}`);
  return response.data;
};

export const updateVibeDate = async (dateId, payload) => {
  const response = await api.patch(`/vibedates/${dateId}`, payload);
  return response.data;
};

export const deleteVibeDate = async (dateId) => {
  const response = await api.delete(`/vibedates/${dateId}`);
  return response.data;
};

export const respondToVibeDate = async (dateId, payload) => {
  const response = await api.post(`/vibedates/${dateId}/respond`, payload);
  return response.data;
};
