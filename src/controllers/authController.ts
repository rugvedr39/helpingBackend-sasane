import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { UniqueConstraintError } from "sequelize";
import { GiveHelp } from "../models/give_help";

const findAvailableSponsor = async (
  referralCode: string,
): Promise<User | null> => {
  const sponsor: any = await User.findOne({
    where: { username: referralCode },
  });

  if (!sponsor) return null;

  return findNextAvailableSponsor(sponsor.id);
};

// Check if the current user can accept new referrals
const canAcceptNewReferrals = async (userId: number): Promise<boolean> => {
  const count = await User.count({
    where: { referred_by: userId },
  });
  return count < 2;
};

// Breadth-first search to find the next available sponsor
const findNextAvailableSponsor = async (
  userId: number,
): Promise<User | null> => {
  const queue = [userId];

  while (queue.length > 0) {
    const currentUserId: any = queue.shift();

    if (await canAcceptNewReferrals(currentUserId)) {
      return User.findByPk(currentUserId);
    }

    const children: any = await User.findAll({
      where: { referred_by: currentUserId },
      attributes: ["id"],
    });

    for (const child of children) {
      queue.push(child.id);
    }
  }

  return null;
};

export const signup = async (req: Request, res: Response) => {
  const {
    email,
    password,
    mobile_number,
    name,
    bank_details,
    upi_number,
    referral_code,
  } = req.body;

  if (!referral_code) {
    return res.status(400).json({ message: "Referral code is required." });
  }

  let username = "";
  let isUsernameUnique = false;
  while (!isUsernameUnique) {
    username = generateUsername();
    const existingUser = await User.findOne({ where: { username } });
    if (!existingUser) {
      isUsernameUnique = true;
    }
  }

  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const time = new Date().toTimeString().slice(0, 8); // HH:MM:SS

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sponsorUser: any = await findAvailableSponsor(referral_code);

    if (!sponsorUser) {
      return res.status(400).json({
        message: "No available sponsor found for the provided referral code.",
      });
    }

    const newUser: any = await User.create({
      username,
      name,
      password: hashedPassword,
      mobile_number: mobile_number,
      bank_details,
      upi_number,
      referral_code: username,
      referred_by: sponsorUser ? sponsorUser.id : null,
    });
    await processReferralPayments(newUser, referral_code);
    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error signing up:", error);
    if (error instanceof UniqueConstraintError) {
      const duplicatedField = error.errors[0].path;
      res
        .status(409)
        .json({ message: `${duplicatedField} is already in use.` });
    } else {
      res.status(500).json({ message: "Error signing up" });
    }
  }
};

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    const user: any = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(200).json({ message: "User not found" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(200).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign({ userId: user.id }, "your_secret_key");

    const nthReferrerId = await findNthReferrer(user.id, user.level);
    let nthReferrer: User | null = null;
    if (nthReferrerId) {
      nthReferrer = await User.findByPk(nthReferrerId, {
        attributes: [
          "level",
          "name",
          "referred_by",
          "mobile_number",
          "bank_details",
          "upi_number",
        ],
      });
    } else {
      nthReferrer = await User.findByPk(5, {
        attributes: [
          "level",
          "name",
          "referred_by",
          "mobile_number",
          "bank_details",
          "upi_number",
        ],
      });
    }
    res.status(200).json({ token, user, nthReferrer });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Error logging in" });
  }
};

const generateUsername = () => {
  const randomNumber = Math.floor(1000000 + Math.random() * 9000000);
  return `romd${randomNumber}`;
};

async function findNthReferrer(userId: any, n: number) {
  n = n + 1;
  let currentUserId: any = userId;
  for (let i = 0; i < n; i++) {
    const user: any = await User.findByPk(currentUserId);
    if (!user || !user.referred_by) {
      return null;
    }
    currentUserId = user.referred_by;
  }
  return currentUserId;
}

async function processReferralPayments(newUser: any, sponser: any) {
  await createGiveHelpEntry(newUser.id, 5, 600, "7499277181@axl");
  const new_sponser: any = await User.findOne({ where: { username: sponser } });

  if (new_sponser) {
    await createGiveHelpEntry(
      newUser.id,
      new_sponser.id,
      600,
      new_sponser.upi_number,
    );
    await processUplinePayments(sponser, newUser.id, 300);
  }
}

async function processUplinePayments(user: any, senderId: any, amount: any) {
  let currentUser = user;
  while (currentUser.referred_by) {
    const uplineUser: any = await User.findOne({
      where: { id: currentUser.referred_by },
    });
    if (!uplineUser) {
      await createGiveHelpEntry(senderId, 5, 300, "7499277181@axl");
      break;
    }

    if (uplineUser.level > 0) {
      await createGiveHelpEntry(
        senderId,
        uplineUser.id,
        amount,
        uplineUser.upi_number,
      );
      break;
    }
    currentUser = uplineUser; // Move up the referral chain
  }
}

async function createGiveHelpEntry(
  senderId: any,
  receiverId: any,
  amount: any,
  upi: any,
) {
  await GiveHelp.create({
    sender_id: senderId,
    receiver_id: receiverId,
    amount: amount,
    status: "initiate",
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 8),
    upiId: upi, // Assuming receiverId has an upi_number field
    utrNumber: "", // Assume necessary details or modifications
  });
}
