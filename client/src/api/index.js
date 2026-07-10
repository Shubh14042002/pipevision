import axios from "axios";

export const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5001";

const API = axios.create({ baseURL: API_BASE_URL });

export const refresh = () =>
  API.get("/api/auth/refresh", { withCredentials: true });

export { API };