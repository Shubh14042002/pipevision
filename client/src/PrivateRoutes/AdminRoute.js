import { Outlet, Navigate } from 'react-router-dom';
import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import useAxiosPrivate from '../api/useAxiosPrivate';

const AdminRoute = () => {
    const [premStatus, setPremStatus] = useState(null);  // null indicates "loading" state
    const { user } = useContext(AuthContext);
    const axiosPrivate = useAxiosPrivate();

    useEffect(() => {
        const fetchPrivateData = async () => {
            try {
                const { data } = await axiosPrivate.get("/api/auth/info");   
                console.log("Fetched role:", data.user.role);
                setPremStatus(data.user.role.trim());  // Trim spaces just in case
            } catch (error) {
                console.error("Error fetching user role", error);
                setPremStatus("");  // Ensures rerender with failure state
            }
        };
    
        fetchPrivateData();
    }, []); 

    console.log("Current premStatus:", premStatus);

    // While loading, don't navigate yet
    if (premStatus === null) {
        return <div>Loading...</div>;  // Replace with a spinner if needed
    }

    return premStatus === "admin" ? <Outlet /> : <Navigate to="/" />;
};

export default AdminRoute;
