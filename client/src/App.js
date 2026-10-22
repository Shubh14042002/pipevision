// src/App.js
import React, { useContext } from "react";
import AuthContext from "./context/AuthContext";
import { Navigate, useRoutes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
//import DashboardLayout from "./dashboard/DashboardLayout";
import DashboardLayout from './layouts';
import ProjectList from "./Projects/ProjectList";
import ProjectHome from "./Projects/ProjectHome";
import ProjectVideo from "./Projects/ProjectVideo";
import ProjectCreation from "./Projects/ProjectCreation";
import AccountHome from "./account/AccountHome";
import LoginScreen from "./account/LoginScreen";
import RegisterScreen from "./account/RegisterScreen";
import LoggedRoutes from "./PrivateRoutes/LoggedRoute";
import AdminPage from './account/AdminPage';
import AdminRoute from './PrivateRoutes/AdminRoute';
import ProjectDefectDetection from './Projects/ProjectDefectDetection';

const RequireLogin = ({ children }) => useContext(AuthContext).user ? children : <Navigate to="/login" replace />;

const App  = () =>  { 

  const routes = useRoutes([
    
    {
      path: '/',
      element: <DashboardLayout />,
      children: [
        {
          path: '' ,
          element:  <RequireLogin><ProjectList /></RequireLogin>
        },
        {
          path: 'project',
          element: <RequireLogin><ProjectHome /></RequireLogin>,
          children: [
            {
              path: ':id',
              element: <RequireLogin><ProjectHome /></RequireLogin>,
            }
          ],
        },
        {
          path: 'project/:id/detection-results',
          element: <RequireLogin><ProjectDefectDetection /></RequireLogin>
        },
        {
          path: 'project/:id/video/:videoId',
          element: <RequireLogin><ProjectVideo /></RequireLogin> // This component shows video details
        },
        {
          path: 'createproject' ,
          element:  <RequireLogin><ProjectCreation /></RequireLogin>
        },
        {
          path: 'register',
          element: <RegisterScreen />
        },
        {
          element: <AdminRoute />,
          children: [
            {
              path: 'adminpage',
              element: <AdminPage />
            },

          ]
        },
        {
          path: 'login',
          element: <LoginScreen />
        },
        {
          element: <LoggedRoutes />,
          children: [
            {
              path: 'YourAccount',
              element: <AccountHome />
            },

          ]
        },
      ]
    }



  ]);


  return (
    <div>
      <AuthProvider>
        {routes}
        </AuthProvider>
    </div>
);
}

export default App;

