// src/services/userApi.js
import api from './api';

export const getUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};

export const deletePhoto = async () => {
  const response = await api.delete('/users/photo');
  return response.data;
};

export const getAlignedSyncSummary = async (timezone = "UTC") => {
  const params = new URLSearchParams({ timezone, _t: Date.now().toString() });
  const response = await api.get(`/users/sync-summary?${params.toString()}`);
  return response.data;
};

export const loginUser = async (data) => {
  const response = await api.post('/login', data);
  return response.data;
};

export const createRelationship = async (data) => {
  const response = await api.post('/users/create', data);
  return response.data;
};

export const updateUserName = async (name) => {
  const response = await api.patch('/users/me', { name });
  return response.data;
};

export const getUserProfile = async () => {
  const response = await api.get('/users');
  return response.data;
};

export const getPartnerProfile = async () => {
  const response = await api.get('/users/partner');
  return response.data;
};

export const uploadProfilePhoto = async (imageUri) => {
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  const token = await AsyncStorage.getItem('access_token');

  const formData = new FormData();
  if (imageUri.startsWith('blob:') || imageUri.startsWith('data:')) {
    const res = await fetch(imageUri);
    const blob = await res.blob();
    formData.append('file', blob, 'profile.jpg');
  } else {
    // @ts-ignore - React Native
    formData.append('file', {
      uri: imageUri,
      name: 'profile.jpg',
      type: 'image/jpeg',
    });
  }

  const response = await fetch(`${api.defaults.baseURL}/users/photo`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true',
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Upload failed with status ${response.status}`);
  }

  return await response.json();
};

export const breakAlignment = async () => {
  const response = await api.post('/users/break-alignment');
  return response.data;
};

export const deleteAccount = async (password, target = 'all') => {
  const response = await api.post('/auth/delete-account', { password, target });
  return response.data;
};

export const alignWithPartner = async (secret_key) => {
  const response = await api.post('/users/aligned', { secret_key });
  return response.data;
};