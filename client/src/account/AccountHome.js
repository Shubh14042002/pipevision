// src/account/AccountHome.js
import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Paper,
  Box,
  Divider,
  Avatar,
  Stack,
} from "@mui/material";
import useAxios from "../api/useAxiosPrivate";
import useMediaQuery from "@mui/material/useMediaQuery";
import { ThemeProvider } from "@mui/material/styles";
import theme from "../theme";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import dayjs from "dayjs";

const AccountHome = () => {
  const isSmallScreen = useMediaQuery("(max-width:800px)");
  const axiosPrivate = useAxios();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPrivateData = async () => {
      try {
        const { data } = await axiosPrivate.get("/api/auth/info", {
          headers: { "Content-Type": "application/json" },
        });
        setEmail(data.user.email);
        setName(data.user.name);
        setRole(data.user.role);
      } catch (err) {
        setError("Error fetching user info: " + err.message);
      }
    };
    fetchPrivateData();
  }, [axiosPrivate]);

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Main Title */}
        <Typography
          variant="h4"
          align="center"
          sx={{
            fontFamily: '"DIN Condensed", sans-serif',
            letterSpacing: "0.05em",
            mb: 3,
          }}
        >
          YOUR ACCOUNT
        </Typography>

        {/* Error Message */}
        {error && (
          <Typography
            variant="body1"
            color="error"
            align="center"
            sx={{ mb: 2, fontFamily: '"Montserrat", sans-serif' }}
          >
            {error}
          </Typography>
        )}

        {/* Profile Card */}
        <Paper
          elevation={3}
          sx={{
            maxWidth: 500,
            mx: "auto",
            p: 4,
            borderRadius: 2,
            textAlign: "center",
          }}
        >
          {/* Optional Avatar Icon */}
          <Avatar
            sx={{
              bgcolor: "secondary.main",
              width: 70,
              height: 70,
              mx: "auto",
              mb: 2,
            }}
          >
            <AccountCircleIcon sx={{ fontSize: 50 }} />
          </Avatar>

          <Typography
            variant="h5"
            sx={{
              fontFamily: '"DIN Condensed", sans-serif',
              letterSpacing: "0.05em",
              mb: 1,
            }}
          >
            PROFILE
          </Typography>

          <Divider sx={{ mb: 3 }} />

          {/* Name */}
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: '"DIN Condensed", sans-serif',
                letterSpacing: "0.05em",
              }}
            >
              NAME
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontFamily: '"Montserrat", sans-serif',
                fontSize: isSmallScreen ? "14px" : "16px",
              }}
            >
              {name}
            </Typography>
          </Stack>

          {/* Email */}
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: '"DIN Condensed", sans-serif',
                letterSpacing: "0.05em",
              }}
            >
              EMAIL
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontFamily: '"Montserrat", sans-serif',
                fontSize: isSmallScreen ? "14px" : "16px",
              }}
            >
              {email}
            </Typography>
          </Stack>

          {/* Role */}
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: '"DIN Condensed", sans-serif',
                letterSpacing: "0.05em",
              }}
            >
              ROLE
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontFamily: '"Montserrat", sans-serif',
                fontSize: isSmallScreen ? "14px" : "16px",
              }}
            >
              {role}
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </ThemeProvider>
  );
};

export default AccountHome;
