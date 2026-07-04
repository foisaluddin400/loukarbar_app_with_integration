// services/vibeCheckApi.js

import api from './api';

// ─── Profile & Status ─────────────────────────────────────────

export const getVibeStreak = async () => {
  const response = await api.get(`/vibecheck/streak?_t=${Date.now()}`);
  return response.data;
};

export const checkVibeStatus = async () => {
  const response = await api.get('/vibecheck/check');
  return response.data;
};

export const getVibeProfile = async () => {
  const response = await api.get(`/vibecheck/profile?_t=${Date.now()}`);
  return response.data;
};

export const setupVibeProfile = async (name) => {
  const response = await api.post('/vibecheck/setup', { name });
  return response.data;
};

// ─── Invite System ────────────────────────────────────────────

export const generateInvite = async () => {
  const response = await api.post('/vibecheck/invite');
  return response.data;
};

export const validateInvite = async (invite_code) => {
  const response = await api.get(`/vibecheck/invite/${invite_code}`);
  return response.data;
};

export const acceptInvite = async (invite_code) => {
  const response = await api.post('/vibecheck/invite/accept', { invite_code });
  return response.data;
};

// ─── Connect ──────────────────────────────────────────────────

export const connectWithKey = async (vibe_key) => {
  const response = await api.post('/vibecheck/connect', { vibe_key });
  return response.data;
};

// ─── Connections & Requests ───────────────────────────────────

export const getConnections = async () => {
  const response = await api.get(`/vibecheck/connections?_t=${Date.now()}`);
  return response.data;
};

export const getRequests = async () => {
  const response = await api.get('/vibecheck/requests');
  return response.data;
};

export const respondToRequest = async (request_id, accept) => {
  const response = await api.post(`/vibecheck/requests/${request_id}/respond`, { accept });
  return response.data;
};

export const deleteConnection = async (partner_id) => {
  const response = await api.delete(`/vibecheck/connection/${partner_id}`);
  return response.data;
};

export const releaseConnection = async (partner_id) => {
  const response = await api.post(`/vibecheck/connections/${partner_id}/release`);
  return response.data;
};

export const restoreConnection = async (partner_id) => {
  const response = await api.post(`/vibecheck/connections/${partner_id}/restore`);
  return response.data;
};

// ─── Key Management ───────────────────────────────────────────

export const regenerateKey = async () => {
  const response = await api.post('/vibecheck/regenerate-key');
  return response.data;
};

// ─── Profile Management ───────────────────────────────────────

export const updateVibeProfile = async (name) => {
  const response = await api.patch('/vibecheck/profile', { name });
  return response.data;
};

export const uploadProfilePicture = async (imageUri) => {
  const formData = new FormData();
  if (imageUri.startsWith('blob:') || imageUri.startsWith('data:')) {
    const res = await fetch(imageUri);
    const blob = await res.blob();
    formData.append('file', blob, 'profile.jpg');
  } else {
    const filename = imageUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    // @ts-ignore - React Native
    formData.append('file', {
      uri: imageUri,
      name: filename,
      type,
    });
  }
  
  const response = await api.post('/vibecheck/profile/picture', formData);
  return response.data;
};

export const deleteProfilePicture = async () => {
  const response = await api.delete('/vibecheck/profile/picture');
  return response.data;
};

export const deleteVibeProfile = async () => {
  const response = await api.delete('/vibecheck/profile');
  return response.data;
};

// ─── QR Code Scanner ──────────────────────────────────────────

export const scanQrFromImage = async (imageUri) => {
  const formData = new FormData();
  const filename = imageUri.split('/').pop() || 'qr_image.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';
  
  formData.append('file', {
    uri: imageUri,
    name: filename,
    type,
  });
  
  const response = await api.post('/vibecheck/scan-qr', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// ─── Vibe Cards ───────────────────────────────────────────────

export const getVibeCardHistory = async (partner_id, category = "All", page = 1, size = 20) => {
  const params = new URLSearchParams({ category, page, size });
  if (partner_id) params.append("partner_id", partner_id);
  const response = await api.get(`/vibecheck/cards/history?${params.toString()}`);
  return response.data;
};

export const getDailyCards = async (partner_id, timezone = "UTC") => {
  const params = new URLSearchParams({ partner_id, timezone, _t: Date.now().toString() });
  const response = await api.get(`/vibecheck/cards/daily?${params.toString()}`);
  return response.data;
};

export const submitVibeAnswers = async (partner_id, answers, timezone = "UTC") => {
  const response = await api.post('/vibecheck/cards/answer', { partner_id, answers, timezone });
  return response.data;
};

export const getVibeResults = async (partner_id, timezone = "UTC") => {
  const params = new URLSearchParams({ timezone, t: Date.now().toString() });
  if (partner_id) params.append("partner_id", partner_id);
  const response = await api.get(`/vibecheck/cards/results?${params.toString()}`, {
    headers: { 'ngrok-skip-browser-warning': 'true' }
  });
  return response.data;
};

export const getVibeStreak = async (timezone = "UTC") => {
  const params = new URLSearchParams({ timezone });
  const response = await api.get(`/vibecheck/cards/streak?${params.toString()}`);
  return response.data;
};
