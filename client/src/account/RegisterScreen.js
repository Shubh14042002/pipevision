// src/account/RegisterScreen.js
import React, { useState, useEffect, useContext } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Avatar,
  Button,
  TextField,
  Grid,
  Box,
  Typography,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { ThemeProvider } from "@mui/material/styles";

import AuthContext from "../context/AuthContext";
import { API } from "../api";
import { jwtDecode } from 'jwt-decode';
 // note: corrected import to remove curly braces
import theme from "../theme";

// Example password requirements:
// 1) At least 8 characters
// 2) At least 1 uppercase letter
// 3) At least 1 digit
// 4) At least 1 special character
function validatePassword(pw) {
  const errors = [];
  if (pw.length < 8) {
    errors.push("at least 8 characters");
  }
  if (!/[A-Z]/.test(pw)) {
    errors.push("1 uppercase letter");
  }
  if (!/\d/.test(pw)) {
    errors.push("1 digit");
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) {
    errors.push("1 special character");
  }
  return errors.length ? `Password must include: ${errors.join(", ")}` : "";
}

const RegisterScreen = () => {
  const { setUser, setAuthToken } = useContext(AuthContext);
  const navigate = useNavigate();

  // If user is already logged in, redirect
  useEffect(() => {
    if (localStorage.getItem("authToken")) {
      navigate("/");
    }
  }, [navigate]);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Regular");
  const [password, setPassword] = useState("");
  const [confirmpassword, setConfirmPassword] = useState("");

  // Errors
  const [error, setError] = useState("");           // final or backend error
  const [passwordError, setPasswordError] = useState(""); 
  const [confirmError, setConfirmError] = useState("");

  // Handle real-time password validation
  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);

    // Validate password in real time
    const pwError = validatePassword(value);
    setPasswordError(pwError);

    // If confirmPassword is non-empty, also check if they match
    if (confirmpassword && value !== confirmpassword) {
      setConfirmError("Passwords do not match");
    } else {
      setConfirmError("");
    }
  };

  // Handle confirm password real-time check
  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);

    // If password is non-empty, check if they match
    if (password && value !== password) {
      setConfirmError("Passwords do not match");
    } else {
      setConfirmError("");
    }
  };

  // Final form submission
  const registerHandler = async (e) => {
    e.preventDefault();

    // Final check before submission
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (confirmError) {
      setError(confirmError);
      return;
    }

    try {
      const { data } = await API.post(
        "/api/auth/register",
        { name, role, email, password },
        { withCredentials: true }
      );
      localStorage.setItem("authToken", data.accessToken);
      setAuthToken(data.accessToken);
      setUser(jwtDecode(data.accessToken));
      window.location.href = "/";
      //navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Register error");
      setTimeout(() => setError(""), 5000);


     /* 
      //navigate("/");
    } catch (error) {
      setError(error.response.data.error);
      setTimeout(() => {
        setError("");
      }, 5000);*/

    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Container component="main" maxWidth="xs">
        <Box
          sx={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Sign up
          </Typography>
          <Box component="form" onSubmit={registerHandler} sx={{ mt: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="name"
                  label="Name"
                  name="name"
                  autoComplete="off"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="off"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Grid>

              {/* Password Field with real-time validation */}
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  id="password"
                  autoComplete="off"
                  placeholder="Enter password"
                  value={password}
                  onChange={handlePasswordChange}
                  error={!!passwordError}
                  helperText={passwordError}
                />
              </Grid>

              {/* Confirm Password Field with real-time check */}
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  name="confirmpassword"
                  label="Confirm Password"
                  type="password"
                  id="confirmpassword"
                  autoComplete="off"
                  placeholder="Confirm password"
                  value={confirmpassword}
                  onChange={handleConfirmPasswordChange}
                  error={!!confirmError}
                  helperText={confirmError}
                />
              </Grid>

              {/* Role Selection */}
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel id="role-label">Select Role</InputLabel>
                  <Select
                    labelId="role-label"
                    id="role"
                    value={role}
                    label="Select Role"
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <MenuItem value="user">Regular</MenuItem>
                    <MenuItem value="manager">Manager</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Display final error from submission (or backend) */}
            {error && (
              <Typography variant="body1" color="error" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Sign Up
            </Button>
            <Grid container justifyContent="flex-end">
              <Grid item>
                <RouterLink
                  to="/login"
                  style={{
                    textDecoration: "none",
                    color: theme.palette.primary.main,
                  }}
                >
                  Already have an account? Sign in
                </RouterLink>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default RegisterScreen;
