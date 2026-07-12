// src/context/AuthContext.js

import { createContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import React from "react";
import { API } from "../api";

const AuthContext = createContext();

export default AuthContext;

// Handles auth state for the application.
export const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(() =>
    localStorage.getItem("authToken") ? localStorage.getItem("authToken") : null
  );

  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("authToken");

    if (!token) return null;

    try {
      return jwtDecode(token);
    } catch (error) {
      localStorage.removeItem("authToken");
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  const logoutUser = async () => {
    // Clear frontend state immediately so the UI logs out even if backend logout fails.
    localStorage.removeItem("authToken");
    setAuthToken(null);
    setUser(null);

    try {
      // Important:
      // Third argument is Axios config.
      // This is required so the refresh-token cookie is sent and can be cleared by the backend.
      await API.post("/api/auth/logout", {}, { withCredentials: true });
    } catch (error) {
      // Do not block logout if backend cookie clearing fails.
      console.error("Logout API failed:", error.response?.data || error.message);
    }
  };

  useEffect(() => {
    if (authToken) {
      try {
        setUser(jwtDecode(authToken));
      } catch (error) {
        localStorage.removeItem("authToken");
        setAuthToken(null);
        setUser(null);
      }
    } else {
      setUser(null);
    }

    setLoading(false);
  }, [authToken]);

  const contextData = {
    user,
    authToken,

    // Keep this old name too in case other files use authTokens.
    authTokens: authToken,

    setAuthToken,
    setUser,
    logoutUser,
  };

  return (
    <AuthContext.Provider value={contextData}>
      {loading ? null : children}
    </AuthContext.Provider>
  );
};