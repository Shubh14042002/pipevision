// src/App.js
import React from "react";
import { BrowserRouter, useRoutes } from "react-router-dom";
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

const App  = () =>  { 

  const routes = useRoutes([
    
    {
      path: '/',
      element: <DashboardLayout />,
      children: [
        {
          path: '' ,
          element:  <ProjectList/>
        },
        {
          path: 'project',
          element: <ProjectHome />,
          children: [
            {
              path: ':id',
              element: <ProjectHome />,
            }
          ],
        },
        {
          path: 'project/:id/detection-results',
          element: <ProjectDefectDetection />
        },
        {
          path: 'project/:id/video/:videoId',
          element: <ProjectVideo /> // This component shows video details
        },
        {
          path: 'createproject' ,
          element:  <ProjectCreation/>
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

