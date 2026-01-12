// src/api/auth.ts
import axios from "./axios.ts";

export const register = async (name: string, userId: string, email: string, password: string) => {
  const response = await axios.post("/auth/register", { name, userId, email, password });
  return response.data;
};

export const login = async (userId: string, password: string) => {
  const response = await axios.post("/auth/login", { userId, password });
  sessionStorage.setItem("jwt-token", response.data.token);
  return response.data;
};
