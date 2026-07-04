import api from './api';
import * as FileSystem from 'expo-file-system';

export const uploadSecret = async (uri, isVideo = false) => {
  const formData = new FormData();
  formData.append("file", {
    uri,
    name: isVideo ? "secret.mp4" : "secret.jpg",
    type: isVideo ? "video/mp4" : "image/jpeg",
  });
  
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
