// services/authApi.js

import api from './api';

export const signupUser = async (email, password) => {
  const response = await api.post('/auth/signup', { email, password });
  return response.data;
};

export const verifyEmail = async (email, otp_code) => {
  const response = await api.post('/auth/verify-email', { email, otp: otp_code });
  return response.data;
};

export const resendOtp = async (email) => {
  const response = await api.post('/auth/resend-otp', { email });
  return response.data;
};

export const loginUser = async (email, password) => {
  const response = await api.post('/auth/signin', { email, password });
  return response.data;
};

export const googleSignin = async (token) => {
  const response = await api.post('/auth/google', { token });
  return response.data;
};

export const appleSignin = async (token) => {
  const response = await api.post('/auth/apple', { token });
  return response.data;
};

export const refreshToken = async (refresh_token) => {
  const response = await api.post('/auth/refresh', { refresh_token });
  return response.data;
};

export const signoutUser = async () => {
  const response = await api.post('/auth/signout');
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (email, otp_code, new_password) => {
  const response = await api.post('/auth/reset-password', { email, otp: otp_code, new_password });
  return response.data;
};

export const changePassword = async (old_password, new_password) => {
  const response = await api.post('/auth/change-password', { old_password, new_password });
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const deleteMe = async () => {
  const response = await api.delete('/auth/me');
  return response.data;
};