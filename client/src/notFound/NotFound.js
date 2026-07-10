import React from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { Link } from 'react-router-dom';

export default function Error() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '80vh',
        overflow: 'hidden', // Hide overflow to prevent scrollbars
      }}
    >
      <Container
        maxWidth="md"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <Grid container spacing={1}>
          <Grid item xs={12}>
            <Box
              sx={{
                textAlign: 'center',
                py: 4,
              }}
            >
              <Typography variant="h1" sx={{ color: 'red' }}>
                404
              </Typography>
              <Typography variant="h6">
                The page you’re looking for doesn’t exist.
              </Typography>
              <Button variant="contained" component={Link} to={'/'} sx={{ mt: 3 }}>
                Back Home
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}