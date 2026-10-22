import { useContext, useMemo } from "react";
import axios from "axios";
import { refresh, API_BASE_URL } from "./index";
import AuthContext from "../context/AuthContext";

// USE THIS WHEN API REQUEST REQUIRES SOMEONE TO BE LOGGED IN
const useAxios = () => {
  const { setUser, setAuthToken } = useContext(AuthContext);

  return useMemo(() => {
  const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
    withCredentials: true,
  });

  axiosInstance.interceptors.request.use(config => {
    const token = localStorage.getItem("authToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    else delete config.headers.Authorization;
    return config;
  });
  axiosInstance.interceptors.response.use(
    (res) => res,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const { data } = await refresh();

          localStorage.setItem("authToken", data.accessToken);
          setAuthToken(data.accessToken);

          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

          return axiosInstance(originalRequest);
        } catch (err) {
          localStorage.removeItem("authToken");
          setAuthToken(null);
          setUser(null);

          return Promise.reject(err);
        }
      }

      return Promise.reject(error);
    }
  );

  return axiosInstance;
  }, [setUser, setAuthToken]);
};

export default useAxios;