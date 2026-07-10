// src/components/Nav/index.js
import PropTypes from "prop-types";
import { useEffect } from "react";
import { useLocation, Link as RouterLink } from "react-router-dom";
import React from "react";
import { Box, Button, Drawer, Typography, Divider } from "@mui/material";
import { ListItemIcon } from "@mui/material";
import AccountBoxIcon from "@mui/icons-material/AccountBox";
import DateRangeIcon from "@mui/icons-material/DateRange";
import useMediaQuery from "@mui/material/useMediaQuery";
import useResponsive from "../../hooks/useResponsive";
// import Logo from "../../assets/logos/primary-logo-white.png"; // to be deleted v1(remove branding)
import { useTheme } from "@mui/material/styles";
import AuthContext from '../../context/AuthContext';
import { useContext } from 'react';
import useAxios from '../../api/useAxiosPrivate';
import { useState } from "react";
import { Link } from "react-router-dom";

const NAV_WIDTH = 200;

Nav.propTypes = {
  openNav: PropTypes.bool,
  onCloseNav: PropTypes.func,
};

export default function Nav({ openNav, onCloseNav }) {

  const axiosPrivate = useAxios();

  const { pathname } = useLocation();
  const isDesktop = useResponsive("up", "lg");
  const isMiniScreen = useMediaQuery("(max-width:700px)");
  const theme = useTheme();

  useEffect(() => {
    if (openNav) {
      onCloseNav();
    }
  }, [pathname]);

  
    const { logoutUser, user } = useContext(AuthContext);

  console.log(user)
  const [premStatus, setPremStatus] = useState("");


  useEffect(() => {
    const fetchPrivateData = async () => {
      const config = {
        header: {
          "Content-Type": "application/json",
        },
      };
      try {
        const { data } = await axiosPrivate.get("/api/auth/info", config);   
        console.log(data.user.role);
        setPremStatus(data.user.role);
        //console.log(data.status); // Log the updated premStatus here
      } catch (error) {
        setPremStatus('');
      }

    };
  
    fetchPrivateData();
  }, []); 
  

  
  
  
  
  
  
  
  const renderContent = (
    <>
      <Box
  sx={{
    py: 3,
    px: 2,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
  }}
>
  <Typography
    component={RouterLink}
    to="/"
    sx={{
      color: theme.palette.common.white,
      fontFamily: theme.typography.fontFamily,
      fontSize: isMiniScreen ? "18px" : "22px",
      fontWeight: 800,
      letterSpacing: "0.5px",
      textDecoration: "none",
      lineHeight: 1.1,
    }}
  >
    PipeVision
  </Typography>
</Box>
      <Divider />
      <Box sx={{ mt: 2, ml: "20%" }}>
        <Typography
          component={RouterLink}
          to=""
          sx={{
            color: theme.palette.common.white,
            fontFamily: theme.typography.fontFamily,
            display: "flex",
            textDecoration: "none",
            fontSize: "15px",
            fontWeight: "bold",
            border: "none",
            mb: 2,
          }}
        >
          <ListItemIcon sx={{ color: theme.palette.text.secondary, mr: -3 }}>
            <DateRangeIcon />
          </ListItemIcon>
          Project List
        </Typography>
        <Typography
          component={RouterLink}
          to="createproject"
          sx={{
            color: theme.palette.common.white,
            fontFamily: theme.typography.fontFamily,
            display: "flex",
            textDecoration: "none",
            fontSize: "15px",
            fontWeight: "bold",
            border: "none",
            mb: 2,
          }}
        >
          <ListItemIcon sx={{ color: theme.palette.text.secondary, mr: -3 }}>
            <DateRangeIcon />
          </ListItemIcon>
          Create Project
        </Typography>
        
        <Typography
          component={RouterLink}
          to="/youraccount"
          sx={{
            color: theme.palette.common.white,
            fontFamily: theme.typography.fontFamily,
            display: "flex",
            textDecoration: "none",
            fontSize: "15px",
            fontWeight: "bold",
            border: "none",
          }}
        >
          <ListItemIcon sx={{ color: theme.palette.text.secondary, mr: -3 }}>
            <AccountBoxIcon />
          </ListItemIcon>
          Account
        </Typography>

          <br></br><br></br>
          {premStatus === 'admin' && (
            <Typography 
            component={RouterLink} 
            to="/adminpage" 
            sx={{
              color: theme.palette.common.white,
              fontFamily: theme.typography.fontFamily,
              display: 'flex',
              textDecoration: 'none',
              fontSize: '15px',
              fontWeight: 'bold',
              mb: 2, 
            }}
  >
            <ListItemIcon sx={{ color: theme.palette.text.secondary, mr: -3 }}>
              <AccountBoxIcon />
            </ListItemIcon>
            Admin
          </Typography>
        )}



      </Box>
      <Box sx={{ flexGrow: 1 }} />
    </>
  );

  return (
    <Box
      component="nav"
      sx={{
        flexShrink: { lg: 0 },
        width: { lg: NAV_WIDTH },
      }}
    >
      {isDesktop ? (
        <Drawer
          open
          variant="permanent"
          PaperProps={{
            sx: {
              width: NAV_WIDTH,
              bgcolor: theme.palette.secondary.main,
              borderRightStyle: "dashed",
            },
          }}
        >
          {renderContent}
        </Drawer>
      ) : (
        <Drawer
          open={openNav}
          onClose={onCloseNav}
          ModalProps={{
            keepMounted: true,
          }}
          PaperProps={{
            sx: { width: NAV_WIDTH, bgcolor: theme.palette.secondary.main },
          }}
        >
          {renderContent}
        </Drawer>
      )}
    </Box>
  );
}