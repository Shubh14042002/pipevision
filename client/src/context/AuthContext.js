import { createContext, useState, useEffect } from 'react'
import {jwtDecode} from 'jwt-decode';
import { useNavigate } from "react-router-dom";
import React from 'react';
import { API } from '../api';
const AuthContext = createContext()

export default AuthContext;


// THIS PAGE IS FOR HANDLING THE USERS ACCOUNT IN THE APPLICATION


export const AuthProvider = ({children}) => {


    let [authToken, setAuthToken] = useState(()=> localStorage.getItem('authToken') ? localStorage.getItem('authToken') : null)         // if you can get item, get the item, if you cant, null
    let [user, setUser] = useState(()=> localStorage.getItem('authToken') ? jwtDecode (localStorage.getItem('authToken')) : null)
    let [loading, setLoading] = useState(true)
    const navigate = useNavigate();


    let logoutUser = async () => {
        const { data } = await API.post("/api/auth/logout", { withCredentials: true });
        setAuthToken(null)
        setUser(null)
        localStorage.removeItem('authToken')
        navigate('/login')
    }


    let contextData = {
        user:user,
        authTokens:authToken,
        setAuthToken:setAuthToken,
        setUser:setUser,
        //loginUser:loginUser,
        logoutUser:logoutUser,
    }


    useEffect(()=> {
        if(authToken){
            setUser(jwtDecode(authToken)) //only problem with this is that is refreshes token too  much, but its not doing it anymore
        }
        setLoading(false)

    }, [authToken, loading])





    return(
        <AuthContext.Provider value={contextData} >
            {loading ? null : children}
        </AuthContext.Provider>
    )
}

