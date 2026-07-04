import api from './api';

export const pokePartner = async () => {
  const response = await api.post('/interactions/poke');
  return response.data;
};

export const getInteractions = async (timezone = "UTC") => {
  const response = await api.get(`/interactions?timezone=${timezone}`);
  return response.data;
};
