import ErrorResponse from "../utils/errorResponse.js";
import User from "../models/User.js"

import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler"

import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url';
import path from 'path'; // Import the path module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({
  path: path.join(__dirname ,'..', '.env') 
});





export const login = async (req, res, next) => {
  const { email, password } = req.body;

  // Check if email and password is provided
  if (!email || !password) {
    return next(new ErrorResponse("Please provide an email and password", 400));
  }

  try {
    // Check that user exists by email
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    // Check that password match
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    const accessToken = jwt.sign(
      { "id": user._id, }, process.env.JWT_SECRET, { expiresIn: '30m' }                                             //OVER HERE
    )

    const refreshToken = jwt.sign(
      { "id": user._id }, process.env.REFRESH_TOKEN_SECRET,{ expiresIn: '90d' }
    ) 
    
    res.cookie('jwt', refreshToken, {
      httpOnly: true, //accessible only by web server 
      secure: true, //https
      sameSite: 'None', //cross-site cookie 
      maxAge: 90 * 24 * 60 * 60 * 1000 //cookie expiry: set to match rT                          this is to remove the cookie when the token expires,
      
    })

    // Send accessToken containing username and roles 
    res.json({ accessToken })

  } catch (err) {
    next(err);
  }
};



export const register = async (req, res, next) => {
  const {name, role, email, password } = req.body;

  try {
    const user = await User.create({
      name,
      role,
      email,
      password

    });


    //creating refresh, and access token
    const accessToken = jwt.sign(
      { "id": user._id }, process.env.JWT_SECRET, { expiresIn: '30m' }                                                                    
    )

    const refreshToken = jwt.sign(
        { "id": user._id }, process.env.REFRESH_TOKEN_SECRET,{ expiresIn: '90d' }
    )

    //sending refresh cookie
    res.cookie('jwt', refreshToken, {
      httpOnly: true, //accessible only by web server 
      secure: true, //https
      sameSite: 'None', //cross-site cookie 
      maxAge: 90 * 24 * 60 * 60 * 1000 //cookie expiry: set to match refreshToken. Make sure. this kills it. 
    })

    // Send accessToken containing username and roles 
    res.json({ accessToken })

  } catch (err) {
    next(err);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find(); // Fetch all users from the database

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    next(new ErrorResponse("Error fetching users", 500));
  }
};


export const changeUserRole=  async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};




//this is to get a logged in user information
export const getInfo = async (req, res, next) => {                      
  

  // Compare token in URL params to hashed token (basically checks if user has a signed in cookie)
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new ErrorResponse("Not authorized to access this route", 401));
  }



  //verify user and get user information
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new ErrorResponse("Invalid Token", 400));
    }

   //console.log(user)

    res
    .status(200)
    .json({
      user: user,
    })




    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return next(new ErrorResponse("Token expired", 401));
      } else if (err.name === "JsonWebTokenError") {
        return next(new ErrorResponse("Malformed JWT token", 500));
      } else {
        return next(
          new ErrorResponse("Not authorized to access this router", err, 401)
        );
      }
    }
};




//REFRESH TOKEN (tries to refresh if expired)
export const refresh = (req, res) => {
  const cookies = req.cookies
  if (!cookies?.jwt) return res.status(401).json({ message: 'Unauthorized' })             //checking if refresh cookie exist, the cookie will delete on its own when it expires

  const refreshToken = cookies.jwt

  jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      asyncHandler(async (err) => {
          if (err){
            return res.status(403).json({ message: 'Forbidden' })                                                                               
          } 
          const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);                       // OVER HERE
          const user = await User.findById(decoded.id);

          if (!user) return res.status(401).json({ message: 'Unauthorized' })

          const accessToken = jwt.sign(
            { "id": user._id }, process.env.JWT_SECRET, { expiresIn: '30m' }
          )
          console.log('refreshed!')
          res.json({ accessToken })
    })
  )
}

if (!cookies?.jwt) return res.sendStatus(204)



