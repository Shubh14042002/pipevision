// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Your main App component
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme'; // Import the custom theme
import {BrowserRouter as Router} from "react-router-dom";


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <Router>
    <App />
    </Router>
  </ThemeProvider>
);
