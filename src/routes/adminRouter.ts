import express from "express";
import { AdminController } from "../controllers/AdminController";

const router = express.Router();
const adminController = new AdminController();
router.get("/users", adminController.listUsers);

export default router;
