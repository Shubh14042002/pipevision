import express from 'express';

const router = express.Router();


import {login, register, getInfo, refresh, logout, getAllUsers, changeUserRole} from "../controllers/auth.js"



router.route('/refresh').get(refresh)

router.route('/logout').post(logout)

router.route("/info").get(getInfo);

router.route("/register").post(register);

router.route("/login").post(login);

router.route("/getusers").get(getAllUsers);

router.route("/changerole/:id").put(changeUserRole);


export default router;