import express from "express";
import { signup, login } from "../controllers/authController";
import { User } from "../models/User";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

const canAcceptNewReferrals = async (userId: number): Promise<boolean> => {
  const count = await User.count({
    where: { referred_by: userId },
  });
  return count < 3;
};

const findAvailableSponsorsAtLevel = async (userId: number): Promise<any[]> => {
  const queue = [userId];
  const availableSponsors: any[] = [];
  const processedUsers = new Set<number>();

  while (queue.length > 0) {
    const levelSize = queue.length;
    let foundSponsorAtThisLevel = false;

    for (let i = 0; i < levelSize; i++) {
      const currentUserId = queue.shift();
      if (currentUserId === undefined || processedUsers.has(currentUserId)) continue;
      processedUsers.add(currentUserId);

      if (await canAcceptNewReferrals(currentUserId)) {
        const user = await User.findByPk(currentUserId);
        if (user) {
          availableSponsors.push(user);
          foundSponsorAtThisLevel = true;
        }
      }

      const children: any = await User.findAll({
        where: { referred_by: currentUserId },
        attributes: ["id"],
      });

      for (const child of children) {
        queue.push(child.id);
      }
    }

    if (foundSponsorAtThisLevel) {
      break; // Stop searching deeper levels if we found sponsors at this level
    }
  }

  return availableSponsors;
};

const findAvailableSponsors = async (referralCode: string): Promise<any[]> => {
  const sponsor: any = await User.findOne({
    where: { username: referralCode },
  });

  if (!sponsor) return [];

  return findAvailableSponsorsAtLevel(sponsor.id);
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

      if (!canAcceptNew) {
        availableSponsors = await findAvailableSponsors(referral_code);
      }

      res.status(200).json({
        name: user.name,
        id: user.id,
        canAcceptNewReferrals: canAcceptNew,
        sponsorUsers: availableSponsors.map(sponsor => ({ id: sponsor.id, name: sponsor.name })),
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