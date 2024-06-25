"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const AdminController_1 = require("../controllers/AdminController");
const router = express_1.default.Router();
const adminController = new AdminController_1.AdminController();
router.get("/users", adminController.listUsers);
router.get("/usersCount", adminController.UsersCount);
router.put("/users/:id", adminController.updateUserDetails);
router.get("/epin-history", adminController.getEPinHistoryWithPagination);
router.get("/getEPinCounts", adminController.getEPinCounts);
exports.default = router;
