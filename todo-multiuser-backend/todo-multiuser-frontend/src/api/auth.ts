// src/api/auth.ts
import axios from "./axios.ts";

export const login = async (email: string, password: string) => {
  const response = await axios.post("/auth/login", { email, password });
  sessionStorage.setItem("jwt-token", response.data.token);
  return response.data;
};
