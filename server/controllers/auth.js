import ErrorResponse from "../utils/errorResponse.js";
import User from "../models/User.js"

import jwt from "jsonwebtoken";

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
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return next(new ErrorResponse("Please provide an email and password", 400));
  }

  try {
    // Check that user exists by email
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password +tokenVersion");

    if (!user) {
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    // Check that password match
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    const accessToken = jwt.sign(
      { "id": user._id, version: user.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn: '30m' }                                             //OVER HERE
    )

    const refreshToken = jwt.sign(
      { "id": user._id, version: user.tokenVersion || 0 }, process.env.REFRESH_TOKEN_SECRET,{ expiresIn: '90d' }
    )

    res.cookie('jwt', refreshToken, {
      httpOnly: true, //accessible only by web server
      secure: process.env.NODE_ENV === "production", //https
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", //cross-site cookie
      maxAge: 90 * 24 * 60 * 60 * 1000 //cookie expiry: set to match rT                          this is to remove the cookie when the token expires,

    })

    // Send accessToken containing username and roles
    res.json({ accessToken })

  } catch (err) {
    next(err);
  }
};



export const register = async (req, res, next) => {
  const {name, email, password } = req.body;

  try {
    const user = await User.create({
      name,
      role: "user",
      email,
      password

    });


    //creating refresh, and access token
    const accessToken = jwt.sign(
      { "id": user._id, version: user.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn: '30m' }
    )

    const refreshToken = jwt.sign(
        { "id": user._id, version: user.tokenVersion || 0 }, process.env.REFRESH_TOKEN_SECRET,{ expiresIn: '90d' }
    )

    //sending refresh cookie
    res.cookie('jwt', refreshToken, {
      httpOnly: true, //accessible only by web server
      secure: process.env.NODE_ENV === "production", //https
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", //cross-site cookie
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
    if (!["user", "manager", "admin"].includes(role)) return res.status(400).json({ message: "Invalid role" });
    if (String(req.user._id) === req.params.id && role !== "admin") return res.status(400).json({ message: "Administrators cannot demote themselves" });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};




//this is to get a logged in user information
export const getInfo = (req, res) => {
  const user = req.user.toObject ? req.user.toObject() : { ...req.user };
  delete user.tokenVersion;
  res.json({ user });
};

//REFRESH TOKEN (tries to refresh if expired)
export const refresh = async (req, res, next) => {
  let decoded;
  try { decoded = jwt.verify(req.cookies?.jwt, process.env.REFRESH_TOKEN_SECRET, { algorithms: ["HS256"] }); }
  catch { return res.status(401).json({ message: "Unauthorized" }); }
  try {
    const user = await User.findById(decoded.id).select("+tokenVersion");
    if (!user || (decoded.version || 0) !== (user.tokenVersion || 0)) return res.status(401).json({ message: "Unauthorized" });
    const accessToken = jwt.sign({ id: user._id, version: user.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn: "30m" });
    res.json({ accessToken });
  } catch (err) { next(err); }
};

// LOGOUT CONTROLLER
// Clears the refresh-token cookie from the user's browser.
// The frontend separately removes the access token from localStorage.

export const logout = async (req, res, next) => {
  // Increment the persisted version to invalidate this user's issued JWTs.
  // Legacy tokens without a version are treated as version zero.
  let decoded;
  try { decoded = jwt.verify(req.cookies?.jwt, process.env.REFRESH_TOKEN_SECRET, { algorithms: ["HS256"] }); }
  catch { /* Missing/expired cookie still needs clearing. */ }

  res.clearCookie("jwt", {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  try {
    if (decoded?.id) await User.updateOne({ _id: decoded.id }, { $inc: { tokenVersion: 1 } });
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) { next(err); }
};


