import React, { useEffect, useState } from "react";
import { Paper, Typography, Grid, Box, FormControl, InputLabel, Select, MenuItem, Button } from "@mui/material";
import useAxios from "../../api/useAxiosPrivate";

export default function ProjectOverview({ projectId, project, canManage }) {
  const axiosPrivate = useAxios();
  const [status, setStatus] = useState(project.status);
  // Preserve the existing reset when another project mutation replaces its data.
  useEffect(() => {
    if (project.status) setStatus(project.status);
  }, [project]);
  const handleUpdateStatus = async () => {
    try {
      const config = { headers: { "Content-Type": "application/json" } };
      await axiosPrivate.post("/api/project/updateStatus", { projectId, status }, config);
      alert("Status updated successfully");
    } catch (err) {
      console.error("Error updating project status:", err);
    }
  };

  return (
    <>
      {/* Project Info Card */}
      <Paper elevation={4} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          {project.title}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1">
              <strong>Description:</strong> {project.description}
            </Typography>
            <Typography variant="subtitle1">
              <strong>Date Opened:</strong> {new Date(project.dateOpened).toLocaleDateString()}
            </Typography>
            <Typography variant="subtitle1">
              <strong>Status:</strong> {project.status}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1">
              <strong>Owner:</strong> {project.projectOwner || "N/A"}
            </Typography>
            <Typography variant="subtitle1">
              <strong>Contractor:</strong> {project.contractor || "N/A"}
            </Typography>
            <Typography variant="subtitle1">
              <strong>Location:</strong> {project.location || "N/A"}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Status Control */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
          mb: 4,
        }}
      >
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="status-label">Status</InputLabel>
          <Select
            labelId="status-label"
            id="status"
            value={status}
            label="Status"
            onChange={(e) => setStatus(e.target.value)}
            disabled={!canManage}
          >
            <MenuItem value="Open">Open</MenuItem>
            <MenuItem value="In Progress">In Progress</MenuItem>
            <MenuItem value="Closed">Closed</MenuItem>
          </Select>
        </FormControl>
        <Button
          onClick={handleUpdateStatus}
          variant="contained"
          color="primary"
          disabled={!canManage || status === project.status}
        >
          Update
        </Button>
      </Box>
    </>
  );
}
