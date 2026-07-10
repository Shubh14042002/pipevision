// src/layouts/header/AccountPopover.js
import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Box, Divider, Stack, MenuItem, IconButton, Popover } from '@mui/material';
import AuthContext from '../../context/AuthContext';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

export default function AccountPopover() {
  const [open, setOpen] = useState(null);
  const { logoutUser, user } = useContext(AuthContext);

  const handleOpen = (event) => {
    setOpen(event.currentTarget);
  };

  const handleClose = () => {
    setOpen(null);
  };

  const handleLogout = () => {
    setOpen(null);
    logoutUser();
    window.location.href = "/";
  };

  return (
    <>
      <IconButton onClick={handleOpen} sx={{ p: 0 }}>
        <AccountCircleIcon fontSize="large" />
      </IconButton>

      <Popover
        open={Boolean(open)}
        anchorEl={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            p: 1,
            mt: 1,
            ml: 0.75,
            width: 180,  // Increased width for a larger popover
            borderRadius: 1, // Slightly rounder corners
            '& .MuiMenuItem-root': {
              typography: 'body1', // Use a slightly larger font
              py: 1, // Increase vertical padding on menu items
              borderRadius: 1,
            },
          },
        }}
      >
        <Stack sx={{ p: 1 }}>
          <MenuItem onClick={handleClose} component={Link} to="/youraccount">
            Account
          </MenuItem>
          <Divider sx={{ my: 0.5, borderStyle: 'dashed' }} />
          <MenuItem onClick={handleLogout}>
            Logout
          </MenuItem>
        </Stack>
      </Popover>
    </>
  );
}
