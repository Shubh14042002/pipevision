import React, { createContext, useState, useEffect, useCallback } from "react";
import { API, refresh } from "../api";
const AuthContext = createContext();
export default AuthContext;
export const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("authToken"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const logoutUser = useCallback(async () => {
    localStorage.removeItem("authToken"); setAuthToken(null); setUser(null);
    try { await API.post("/api/auth/logout", {}, { withCredentials: true }); }
    catch { /* Local logout remains effective when the server is unavailable. */ }
  }, []);
  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        let token = authToken;
        if (!token) { if (active) setUser(null); return; }
        let response;
        try { response = await API.get("/api/auth/info", { headers: { Authorization: `Bearer ${token}` } }); }
        catch (err) {
          if (err.response?.status !== 401) throw err;
          token = (await refresh()).data.accessToken;
          response = await API.get("/api/auth/info", { headers: { Authorization: `Bearer ${token}` } });
        }
        if (active) { localStorage.setItem("authToken", token); setAuthToken(token); setUser(response.data.user); }
      } catch { if (active) { localStorage.removeItem("authToken"); setAuthToken(null); setUser(null); } }
      finally { if (active) setLoading(false); }
    };
    initialize();
    return () => { active = false; };
  }, [authToken]);
  return <AuthContext.Provider value={{ user, authToken, authTokens: authToken, setAuthToken, setUser, logoutUser }}>
    {loading ? null : children}
  </AuthContext.Provider>;
};
