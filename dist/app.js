"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const transactionRoutes_1 = __importDefault(require("./routes/transactionRoutes"));
const database_1 = require("./config/database");
const morgan = require('morgan');
const adminRouter_1 = __importDefault(require("./routes/adminRouter"));
const epinRoutes_1 = __importDefault(require("./routes/epinRoutes"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(morgan('combined', {
    skip: function (req, res) { return res.statusCode < 400; }
}));
(0, database_1.testDatabaseConnection)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use("/api/auth", authRoutes_1.default);
app.use("/api/user", userRoutes_1.default);
app.use("/api/transaction", transactionRoutes_1.default);
app.use("/api/epin", epinRoutes_1.default);
app.use("/api/admin", adminRouter_1.default);
exports.default = app;
