import api from './api';

export const logPresence = async (data) => {
  const response = await api.post('/notifications/presence', data);
  return response.data;
};

export const getMyNotifications = async (page = 1, size = 20) => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const response = await api.get(`/notifications/?page=${page}&size=${size}&timezone=${encodeURIComponent(tz)}`);
  return response.data;
};
