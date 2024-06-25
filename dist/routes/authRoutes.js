"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const User_1 = require("../models/User");
const router = express_1.default.Router();
router.post("/signup", authController_1.signup);
router.post("/login", authController_1.login);
router.get("/user/:referral_code", async (req, res) => {
    const { referral_code } = req.params;
    console.log(referral_code);
    try {
        const user = await User_1.User.findOne({
            where: { username: referral_code, status: "Active" },
        });
        console.log(user);
        if (user) {
            res.status(200).json({ name: user.name, id: user.id });
        }
        else {
            res.status(404).json({ message: "User not found" });
        }
    }
    catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Error fetching user" });
    }
});
exports.default = router;
