// //userRouter

import express from "express";

import { createUser, deleteUser, loginUser, getAllUsers, updatedUser, requestPassword, banUser, unbanUser } from "../controllers/users";
import verifyJWT from "../middlewares/verifyJWT";
import adminCheck from "../middlewares/adminCheck";

const router = express.Router();

router.get("/", getAllUsers);

// LOGIN
router.post("/login", loginUser);

// REGISTER
router.post("/", createUser);

// UPDATE USER
router.put("/:userId", verifyJWT, updatedUser);

// FORGET PASSWORD REQUEST
router.post("/password", requestPassword);

router.delete("/:userId", deleteUser);

// BAN & UNBAN USERS
router.post("/:userId/ban", verifyJWT, adminCheck, banUser);
router.post("/:userId/unban", verifyJWT, adminCheck, unbanUser);

export default router;
