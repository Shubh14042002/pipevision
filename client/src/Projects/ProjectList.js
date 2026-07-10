// src/Projects/ProjectList.js
import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Container,
  Alert,
  CircularProgress,
  Chip,
  Button,
  Box,
  Grid,
  TextField,
  MenuItem
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { API } from '../api';
import { useTheme, alpha } from '@mui/material/styles';
import dayjs from 'dayjs';
import useAxios from '../api/useAxiosPrivate';

const ProjectList = () => {
  const axiosPrivate = useAxios();
  const [projectList, setProjectList] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const [role, setRole] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("Newest");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const { data } = await API.get("/api/project/getprojects");
        const sortedProjects = data.allProjects.sort(
          (a, b) => new Date(b.dateOpened) - new Date(a.dateOpened)
        );
        setProjectList(sortedProjects);
      } catch (error) {
        console.error(error);
        setError("Failed to load projects.");
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    const fetchPrivateData = async () => {
      try {
        const { data } = await axiosPrivate.get("/api/auth/info");
        setRole(data.user.role);
      } catch (error) {
        setRole('');
      }
    };
    fetchPrivateData();
  }, []);

  const getChipStyles = (status) => {
    const statusLower = status.toLowerCase();
    let bgColor, textColor;
    if (statusLower === 'open') {
      bgColor = theme.palette.success.light;
      textColor = theme.palette.success.dark;
    } else if (statusLower === 'in progress') {
      bgColor = theme.palette.info.light;
      textColor = theme.palette.info.dark;
    } else if (statusLower === 'closed') {
      bgColor = theme.palette.error.light;
      textColor = theme.palette.error.dark;
    } else {
      bgColor = theme.palette.grey[300];
      textColor = theme.palette.text.primary;
    }
    return { bgColor, textColor };
  };

  const filteredProjects = projectList
    .filter(project => {
      const statusMatch = statusFilter === "All" || project.status === statusFilter;
      const searchMatch = project.title.toLowerCase().includes(searchTerm.toLowerCase());
      return statusMatch && searchMatch;
    })
    .sort((a, b) => {
      const dateA = new Date(a.dateOpened);
      const dateB = new Date(b.dateOpened);
      return sortOrder === "Newest" ? dateB - dateA : dateA - dateB;
    });

  return (
    <Container maxWidth="lg" sx={{ mt: 6, p: 4, backgroundColor: '#f7f8fa', borderRadius: 3 }}>
      <Typography
        variant="h3"
        sx={{
          fontFamily: 'DIN Condensed, sans-serif',
          fontWeight: 800,
          letterSpacing: '0.03em',
          mb: 4,
        }}
      >
        Project Dashboard Test
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Total Projects</Typography>
            <Typography variant="h4" fontWeight={700}>{projectList.length}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Open</Typography>
            <Typography variant="h4" fontWeight={700}>{projectList.filter(p => p.status === 'Open').length}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">In Progress</Typography>
            <Typography variant="h4" fontWeight={700}>{projectList.filter(p => p.status === 'In Progress').length}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filter Controls */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <TextField
          size="small"
          label="Search Projects"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        <TextField
          select
          size="small"
          label="Filter by Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          {["All", "Open", "In Progress", "Closed"].map((status) => (
            <MenuItem key={status} value={status}>{status}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Sort By"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="Newest">Newest First</MenuItem>
          <MenuItem value="Oldest">Oldest First</MenuItem>
        </TextField>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {loading ? (
        <CircularProgress sx={{ mt: 4 }} />
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: theme.shadows[3], p: 2 }}>
          <Table aria-label="project list">
            <TableHead>
              <TableRow>
                {['Project Name', 'Status', 'Date Opened'].map(header => (
                  <TableCell
                    key={header}
                    sx={{ fontWeight: 600, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  >
                    {header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProjects.map((project, index) => {
                const { bgColor, textColor } = getChipStyles(project.status);
                return (
                  <TableRow
                    key={project._id}
                    onClick={() => navigate(`/project/${project._id}`)}
                    hover
                    sx={{
                      backgroundColor: index % 2 === 0 ? alpha(theme.palette.grey[100], 0.5) : 'inherit',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'scale(1.01)',
                        backgroundColor: alpha(theme.palette.primary.main, 0.06),
                        boxShadow: theme.shadows[2]
                      }
                    }}
                  >
                    <TableCell>
                      <Typography sx={{ fontWeight: 500, fontSize: '15px' }}>{project.title}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={project.status}
                        variant="outlined"
                        size="small"
                        sx={{
                          fontWeight: 500,
                          borderRadius: '999px',
                          px: 1.5,
                          backgroundColor: bgColor,
                          color: textColor,
                          borderColor: textColor
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '14px', color: theme.palette.text.secondary }}>
                        {dayjs(project.dateOpened).format('MMM D, YYYY h:mm A')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Button
        variant="contained"
        startIcon={<Add />}
        onClick={() => navigate('/createproject')}
        sx={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          borderRadius: '999px',
          px: 3,
          py: 1.5,
          fontSize: '16px',
          zIndex: 999,
          fontWeight: 600
        }}
      >
        New Project
      </Button>
    </Container>
  );
};

export default ProjectList;
