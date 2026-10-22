import React, { useState } from "react";
import { Box, Button, List, ListItem, ListItemText, IconButton } from "@mui/material";
import ListItemSecondaryAction from "@mui/material/ListItemSecondaryAction";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import useAxios from "../../api/useAxiosPrivate";

export default function ProjectActions({ projectId, permissions, canManage, onPermissionRemoved }) {
  const axiosPrivate = useAxios();
  const navigate = useNavigate();
  const [showManagePermissions, setShowManagePermissions] = useState(false);
  const handleManagePermissionsClick = () => setShowManagePermissions(value => !value);
  const handleRemovePermission = async (email) => {
    const config = { headers: { "Content-Type": "application/json" } };
    try {
      const response = await axiosPrivate.post("/api/project/deletePerm", { projectId, email }, config);
      console.log("User permission removed:", response.data);
      onPermissionRemoved(email);
    } catch (error) {
      console.error("Error removing permission:", error);
    }
  };

  const deleteProject = async () => {
    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;
    try {
      await axiosPrivate.post("/api/project/deleteproject", { projectId });
      navigate("/");
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 2, mb: 4 }}>
      <Button
        onClick={deleteProject}
        variant="contained"
        color="error"
        size="large"
        disabled={!canManage}
      >
        Delete Project
      </Button>

      <Button
        variant="contained"
        onClick={handleManagePermissionsClick}
        disabled={!canManage}
      >
        {showManagePermissions ? "Hide Permissions" : "Manage Permissions"}
      </Button>
      {showManagePermissions && (
        <List sx={{ mt: 2, mx: "auto", maxWidth: 500 }}>
          {permissions?.map((permission) => (
            <ListItem key={permission._id}>
              <ListItemText
                primary={permission.name}
                secondary={
                  permission.hasPermission ? "Has Permission" : "No Permission"
                }
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  aria-label="remove"
                  onClick={() => handleRemovePermission(permission.email)}
                  disabled={!canManage}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
