"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const User_1 = require("../models/User");
const give_help_1 = require("../models/give_help");
const router = express_1.default.Router();
router.post("/signup", authController_1.signup);
router.post("/login", authController_1.login);
const canAcceptNewReferrals = async (userId) => {
    const count = await User_1.User.count({
        where: { referred_by: userId },
    });
    return count < 3;
};
router.get("/user/:referral_code", async (req, res) => {
    const { referral_code } = req.params;
    try {
        const user = await User_1.User.findOne({
            where: { username: referral_code, status: "Active" },
        });
        if (user) {
            const canAcceptNew = await canAcceptNewReferrals(user.id);
            let availableSponsors = [];
            let alert = null;
            if (!canAcceptNew) {
                let paid = await give_help_1.GiveHelp.findOne({ where: { sender_id: user.id, amount: 600, status: "Completed" } });
                if (paid) {
                    alert = null;
                }
                else {
                    alert = "User Has Not Upgraded The level";
                }
            }
            res.status(200).json({
                name: user.name,
                id: user.id,
                canAcceptNewReferrals: canAcceptNew,
                alert
            });
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
