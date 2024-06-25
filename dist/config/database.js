"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testDatabaseConnection = exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const sequelize = new sequelize_1.Sequelize({
    database: "sasane-Helping",
    username: "avnadmin",
    password: "AVNS_MxiCAok9qWwo32w6PTI",
    host: "mysql-13248809-rugvedr39-2562.l.aivencloud.com",
    port: 19638,
    dialect: "mysql",
    logging: false,
    dialectOptions: {
        ssl: {
            ca: fs.readFileSync(path.resolve(__dirname, "./ca.pem")).toString(),
        },
    },
});
exports.sequelize = sequelize;
// const sequelize = new Sequelize({
//   database: "sasane-Helping",
//   username: "root",
//   password: "8600988002",
//   host: "127.0.0.1",
//   port: 3306,
//   dialect: "mysql",
//   logging: false,
// });
// Test the database connection
async function testDatabaseConnection() {
    try {
        await sequelize.authenticate();
        console.log("Connection to the database has been established successfully.");
    }
    catch (error) {
        console.error("Unable to connect to the database:", error);
    }
}
exports.testDatabaseConnection = testDatabaseConnection;
