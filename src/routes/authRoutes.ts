import express from "express";
import { signup, login } from "../controllers/authController";
import { User } from "../models/User";
import { GiveHelp } from "../models/give_help";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

const canAcceptNewReferrals = async (userId: number): Promise<boolean> => {
  const count = await User.count({
    where: { referred_by: userId },
  });
  return count < 3;
};

router.get("/user/:referral_code", async (req, res) => {
  const { referral_code } = req.params;
  try {
    const user: any = await User.findOne({
      where: { username: referral_code, status: "Active" },
    });

    if (user) {
      const canAcceptNew = await canAcceptNewReferrals(user.id);
      let availableSponsors: any[] = [];
      let alert:string=null

      if (!canAcceptNew) {
        let paid = await GiveHelp.findOne({where: {sender_id: user.id , amount:600,status:"Completed"}})
        if (paid) {
          alert=null
        }else{
          alert = "User Has Not Upgraded The level"
        }
      }

      res.status(200).json({
        name: user.name,
        id: user.id,
        canAcceptNewReferrals: canAcceptNew,
        alert
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Error fetching user" });
  }
});

export default router;