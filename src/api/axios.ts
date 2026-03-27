import axios from "axios";

// Force cache refresh
const instance = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || "https://to-do-m0we.onrender.com") + "/api",
});

instance.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("jwt-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default instance;
