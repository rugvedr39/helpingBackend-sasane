import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import transaction from "./routes/transactionRoutes";
import { testDatabaseConnection } from "./config/database";
import epin from "./routes/epinRoutes";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());

testDatabaseConnection();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/transaction", transaction);
app.use("/api/epin", epin);

export default app;
