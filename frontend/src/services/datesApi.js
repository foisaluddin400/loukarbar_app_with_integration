import api from './api';

export const createDate = async (data) => {
  const response = await api.post('/dates/', data);
  return response.data;
};

export const listDates = async () => {
  const response = await api.get('/dates/');
  return response.data;
};

export const getDate = async (dateId) => {
  const response = await api.get(`/dates/${dateId}`);
  return response.data;
};

export const updateDate = async (dateId, data) => {
  const response = await api.patch(`/dates/${dateId}`, data);
  return response.data;
};

export const deleteDate = async (dateId) => {
  const response = await api.delete(`/dates/${dateId}`);
  return response.data;
};

export const respondToDate = async (dateId, responseStatus) => {
  // Assuming responseStatus is accepted/declined, or similar payload structure
  const response = await api.patch(`/dates/${dateId}/respond`, { status: responseStatus });
  return response.data;
};

export const completeDate = async (dateId) => {
  const response = await api.patch(`/dates/${dateId}/complete`);
  return response.data;
};

export const addReview = async (dateId, data) => {
  const response = await api.post(`/dates/${dateId}/review`, data);
  return response.data;
};

export const getDateReviews = async (dateId) => {
  const response = await api.get(`/dates/${dateId}/reviews`);
  return response.data;
};
