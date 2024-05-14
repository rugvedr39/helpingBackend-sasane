import express from "express";
import { signup, login } from "../controllers/authController";
import { User } from "../models/User";
const router = express.Router();
router.post("/signup", signup);
router.post("/login", login);

router.get("/user/:referral_code", async (req, res) => {
  const { referral_code } = req.params;

  try {
    const user = await User.findOne({ where: { username: referral_code } });
    if (user) {
      res.status(200).json({ name: user.name, id: user.id });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Error fetching user" });
  }
});

export default router;
