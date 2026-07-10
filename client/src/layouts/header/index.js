// src/layouts/header/Header.js
import PropTypes from 'prop-types';
import React, { useContext } from 'react';
import { styled } from '@mui/material/styles';
import {
  Box,
  Stack,
  AppBar,
  Toolbar,
  Divider,
  Typography,
  Button
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Link } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import AuthContext from '../../context/AuthContext';
import AccountPopover from './AccountPopover';
import ListIcon from '@mui/icons-material/List';
export function bgBlur(theme) {
  const color = theme.palette.primary.main;
  const blur = 6;
  const opacity = 0.8;
  return {
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    backgroundColor: alpha(color, opacity),
  };
}

const NAV_WIDTH = 0;
const HEADER_MOBILE = 64;
const HEADER_DESKTOP = 92;

const StyledRoot = styled(AppBar)(({ theme }) => ({
  ...bgBlur(theme),
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  [theme.breakpoints.up('lg')]: {
    width: `calc(100% - ${NAV_WIDTH + 1}px)`,
  },
}));

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  minHeight: HEADER_MOBILE,
  [theme.breakpoints.up('lg')]: {
    minHeight: HEADER_DESKTOP,
    padding: theme.spacing(0, 5),
  },
}));

Header.propTypes = {
  onOpenNav: PropTypes.func,
};




export default function Header({ onOpenNav }) {
  const { user } = useContext(AuthContext);
  const isMiniScreen = useMediaQuery('(max-width:700px)');
  const isSmallScreen = useMediaQuery('(max-width:900px)');

  return (
    <StyledRoot>
      <StyledToolbar>
      <ListIcon         
         onClick={onOpenNav}
          sx={{
            mr: 1,
            color: 'text.primary',
            display: { lg: 'none' },
            
          }} ></ListIcon>
        <Box sx={{ flexGrow: 0.5 }} />

        

        <Box sx={{ flexGrow: 0.5 }} />

        {/* Right side: Account or Login */}
        <div>
          {user ? (
            <AccountPopover />
          ) : (
            <Button
              component={Link}
              to="/login"
              variant="contained"
              size="small"  // <-- add size here
              sx={{
                fontFamily: '"Montserrat", sans-serif',
                textTransform: "none",
                fontSize: isMiniScreen ? '10px' : '16px', // you can also adjust this
                fontWeight: "bold",
                color: '#fff',
                backgroundColor: (theme) => theme.palette.primary.dark,
                '&:hover': {
                  backgroundColor: (theme) => theme.palette.secondary.main,
                },
              }}
            >
              Log In
            </Button>
          )}
        </div>
      </StyledToolbar>
      <Divider />
    </StyledRoot>
  );
}
