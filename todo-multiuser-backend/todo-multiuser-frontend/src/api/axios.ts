import axios from "axios";

const instance = axios.create({
  baseURL: "http://192.168.29.107:5000/api",
});

instance.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("jwt-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default instance;
