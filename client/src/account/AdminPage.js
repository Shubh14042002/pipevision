import React, { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Grid2, Container } from "@mui/material";
import useAxios from "../api/useAxiosPrivate";
import { Link } from "react-router-dom";
import useMediaQuery from '@mui/material/useMediaQuery';


const AdminPage = () => {


  const isSmallScreen = useMediaQuery('(max-width:800px)');

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState('');
  const axiosPrivate = useAxios();

  const [reviewedMovies, setReviewedMovies] = useState([]);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Movies per page
  const moviesPerPage = 4;
  const indexOfLastMovie = currentPage * moviesPerPage;
  const indexOfFirstMovie = indexOfLastMovie - moviesPerPage;
  const currentMovies = reviewedMovies.slice(
    indexOfFirstMovie,
    indexOfLastMovie
  );




  
  /**
   * Change pages with movies that have been reviewed
   */


  const [users, setUsers] = useState([]);


  const [editedRoles, setEditedRoles] = useState({});

  const handleRoleSelection = (userId, newRole) => {
    setEditedRoles((prev) => ({
      ...prev,
      [userId]: newRole, // Store changed role temporarily
    }));
  };



  /**
   * Gets account information
   */
  useEffect(() => {
    const fetchPrivateData = async () => {
      const config = {
        headers: {
          "Content-Type": "application/json",
        },
      };
      try {
        const { data } = await axiosPrivate.get("/api/auth/getusers", config, {
          withCredentials: true,
        });
        console.log(data)
        setUsers(data.users); // Assuming `users` is an array in the response
      } catch (error) {
        setError("Error fetching status:", error);
      }
    };

    fetchPrivateData();
  }, []);


  const handleRoleChange = async (userId, newRole) => {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    try {
      const { data } = await axiosPrivate.put(`/api/auth/changerole/${userId}`,{ role: newRole }, config); // Update API URL
      setUsers((prevUsers) => 
        prevUsers.map((user) => (user._id === userId ? { ...user, role: newRole } : user))
      );
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };


  const handleSaveRole = async (userId) => {
    if (!editedRoles[userId]) return;
  
    try {
      await axiosPrivate.put(
        `/api/auth/changerole/${userId}`,
        { role: editedRoles[userId] }, // Send new role in request body
        { headers: { "Content-Type": "application/json" } }
      );
  
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user._id === userId ? { ...user, role: editedRoles[userId] } : user
        )
      );
  
      // Remove saved role after update
      setEditedRoles((prev) => {
        const updatedRoles = { ...prev };
        delete updatedRoles[userId];
        return updatedRoles;
      });
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };




  return (
    <TableContainer component={Paper} sx={{ maxWidth: 800, margin: "auto", mt: 4, p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2, textAlign: "center" }}>User List</Typography>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
            <TableCell><strong>Name</strong></TableCell>
            <TableCell><strong>Email</strong></TableCell>
            <TableCell><strong>Role</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
  {users.map((user) => (
    <TableRow key={user._id}>
      <TableCell>{user.name}</TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <select
            value={editedRoles[user._id] || user.role}
            onChange={(e) => handleRoleSelection(user._id, e.target.value)}
            style={{
              padding: "6px",
              fontSize: "14px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            <option value="user">User</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>

          </select>

          {editedRoles[user._id] && (
            <button
              onClick={() => handleSaveRole(user._id)}
              style={{
                padding: "6px 10px",
                fontSize: "14px",
                borderRadius: "4px",
                backgroundColor: "#1976d2",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              Save
            </button>
          )}
        </div>
      </TableCell>
    </TableRow>
  ))}
</TableBody>
      </Table>
    </TableContainer>
  );
};

export default AdminPage;
