import mongoose from 'mongoose';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";


const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    match: /^[a-zA-Z\s]+$/, // Only alphabets and spaces are allowed
  },
  email: {
    type: String,
    required: [true, "Please provide an email address"],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: async function (value) {

        const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (!emailRegex.test(value)) {
          throw new Error("Please provide a valid email");
        }
        
        // Check if the email is already in use
        const existingUser = await this.constructor.findOne({ email: value });
        if (existingUser) {
          throw new Error("Email is already in use");
        }
      },
      message: "Please provide a valid email",
    },
  },
  password: {
    type: String,
    required: [true, "Please add a password"],
    minlength: [8, "Password must be at least 8 characters long"],
    validate: {
      validator: function (value) {
        // At least one uppercase letter
        if (!/[A-Z]/.test(value)) {
          throw new Error("Password must contain at least one uppercase letter");
        }
        // At least one lowercase letter
        if (!/[a-z]/.test(value)) {
          throw new Error("Password must contain at least one lowercase letter");
        }
      },
    },
    select: false,
  },
  role: {
    type: String,
    trim: true,
    match: /^[a-zA-Z\s]+$/, // Only alphabets and spaces are allowed
  },
});




UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});


UserSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};



const User = mongoose.model("User", UserSchema);

export default User;
