import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import transaction from "./routes/transactionRoutes";
import { testDatabaseConnection } from "./config/database";
const morgan = require('morgan');
import adminRouter from "./routes/adminRouter";
import epin from "./routes/epinRoutes";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(morgan('combined'));

testDatabaseConnection();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/transaction", transaction);
app.use("/api/epin", epin);
app.use("/api/admin", adminRouter);

export default app;
