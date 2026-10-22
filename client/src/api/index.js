import axios from "axios";

export const LOCAL_API_BASE_URL = "http://localhost:5001";

export const API_BASE_URL =
  process.env.REACT_APP_API_URL || LOCAL_API_BASE_URL;

const API = axios.create({
  baseURL: API_BASE_URL,
});

let pendingRefresh;
export const refresh = () => {
  if (!pendingRefresh) pendingRefresh = API.get("/api/auth/refresh", { withCredentials: true })
    .finally(() => { pendingRefresh = null; });
  return pendingRefresh;
};

export { API };