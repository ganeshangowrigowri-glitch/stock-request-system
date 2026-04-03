import axios from 'axios';

const API_URL = 'http://192.168.110.151:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getShops = async () => {
  const response = await api.get('/shops');
  return response.data;
};

export const getCategories = async () => {
  const response = await api.get('/categories');
  return response.data;
};

export const getBrandsByCategory = async (categoryId) => {
  const response = await api.get(`/brands/category/${categoryId}`);
  return response.data;
};

export const getBrandsFromDB = async (categoryId) => {
  const response = await api.get(`/brands/category/${categoryId}`);
  return response.data;
};

export const submitRequest = async (data) => {
  const response = await api.post('/requests', data);
  return response.data;
};

export const getRequestsByShop = async (shopId) => {
  const response = await api.get(`/requests/shop/${shopId}`);
  return response.data;
};

export const getRequestById = async (requestId) => {
  const response = await api.get(`/requests/${requestId}`);
  return response.data;
};

export const markOrderReceived = async (id) => {
  const response = await api.put(`/requests/${id}/received`);
  return response.data;
};

export const getNotificationsByShop = async (shopId) => {
  const response = await api.get(`/notifications/shop/${shopId}`);
  return response.data;
};

export default api;
