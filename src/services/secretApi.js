import api from './api';
import { Platform } from 'react-native';

export const uploadSecret = async (uri) => {
  const formData = new FormData();
  
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    formData.append("file", blob, "secret.jpg");
  } else {
    formData.append("file", {
      uri,
      name: "secret.jpg",
      type: "image/jpeg",
    });
  }
  
  const response = await api.post('/secret/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getReceivedSecrets = async () => {
  const response = await api.get('/secret/received');
  return response.data;
};

export const getSentSecrets = async () => {
  const response = await api.get('/secret/sent');
  return response.data;
};

export const patchScreenshotProtection = async (secretId) => {
  const response = await api.patch(`/secret/${secretId}/screenshot`);
  return response.data;
};

// Returns file URL for the given secret
export const getSecretViewUrl = (secretId) => {
  return `${api.defaults.baseURL}/secret/view/${secretId}`;
};

export const requestRewatchSecret = async (secretId) => {
  const response = await api.post(`/secret/${secretId}/rewatch/request`);
  return response.data;
};

export const approveRewatchSecret = async (secretId) => {
  const response = await api.post(`/secret/${secretId}/rewatch/approve`);
  return response.data;
};

export const declineRewatchSecret = async (sessionId) => {
  const response = await api.post(`/secret/${sessionId}/rewatch/decline`);
  return response.data;
};

export const revokeSecret = async (sessionId) => {
  const response = await api.delete(`/secret/${sessionId}/revoke`);
  return response.data;
};
