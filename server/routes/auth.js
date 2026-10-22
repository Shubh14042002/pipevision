import express from 'express';

const router = express.Router();
import { authenticate, roles } from "../middleware/auth.js";


import {login, register, getInfo, refresh, logout, getAllUsers, changeUserRole} from "../controllers/auth.js"



router.route('/refresh').get(refresh)

router.route('/logout').post(logout)

router.route("/info").get(authenticate, getInfo);

router.route("/register").post(register);

router.route("/login").post(login);

router.route("/getusers").get(authenticate, roles("admin", "manager"), getAllUsers);

router.route("/changerole/:id").put(authenticate, roles("admin"), changeUserRole);


export default router;