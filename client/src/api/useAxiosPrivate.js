
import { useEffect, useContext } from "react";
import {refresh} from "./index"
import axios from "axios";
import AuthContext from '../context/AuthContext'



// USE THIS WHEN API REQUEST REQUIRED SOMEONE TO BE LOGGED IN

const useAxios = () => {

    let {user, setUser, authToken, setAuthToken} = useContext(AuthContext)

    const axiosInstance = axios.create({      
              
        baseURL: 'http://localhost:5001/',
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
    });


    axiosInstance.interceptors.response.use( async res => {

        return res;                                                 //this return original if there is no errors with it, and it runs on retry as well

        }, async function (error) {                                 //if there is an error

          const originalRequest = error.config;                     //get the request that was an error

          if(error.response.status === 401 && !originalRequest._retry ){          // if its 401 unauthorized, and the first time we have not retried it
            originalRequest._retry = true;
              try {                                                       
                const { data } = await refresh();                                                       //THIS IS WHERE, IF REFRESH IS REJECTED. THEN YOU NEED TO CLEAR LOCAL STORAGE
                localStorage.setItem("authToken", data.accessToken);
                originalRequest.headers.Authorization = `Bearer ${localStorage.getItem("authToken")}`  //changing the parameter of token, because originalrequest/errorconfig is going to have the same token parameter even when retried. so you have to manually change it
                return axiosInstance(originalRequest);    
              }
              catch(err) {
                localStorage.removeItem("authToken")  // localStorage.clear()   or  localStorage.removeItem("authToken");   
                setAuthToken(null)
                setUser(null)
                return Promise.reject(error);
                //return
              }                                              
          }
           
          return Promise.reject(error);     // Do something with response error
      });
    


    return axiosInstance;
}

export default useAxios;