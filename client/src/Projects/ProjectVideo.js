import React, { useState, useEffect, useContext } from 'react';
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import {Button, Typography, Container} from '@mui/material'
import useAxios from '../api/useAxiosPrivate';
import { Link } from 'react-router-dom';
import axios from "axios"
import { API } from '../api';

const ProjectVideo = () => {
  //const axiosPrivate = useAxios();

  const [projectList, setProjectList] = useState([]);
  const [error, setError] = useState("");



      useEffect(() => {
        const fetchProjects = async () => {
          const config = {
            header: {
              "Content-Type": "application/json",
            },
          };
          try {
            const { data } = await API.get("/api/project/getprojects", config);  
            console.log(data)
            setProjectList(data.allProjects );
          } catch (error) {
            setError("You are not authorized please login");
          }
    
        };
         fetchProjects()
          
        }, []); 
 




    return (
      <>
      <br></br><br></br>
      <Container maxWidth="md" sx={{ textAlign: 'center', marginTop: '50px' }}>
      <Typography variant="h6" style={{ color: 'black', fontFamily: 'Roboto Mono', fontSize:"30px" }}>
        Video Info
      </Typography>

        </Container>
        <br></br><br></br><br></br>



       </>
    )
    
};

export default ProjectVideo

