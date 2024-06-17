import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { UniqueConstraintError } from "sequelize";
import { GiveHelp } from "../models/give_help";
import { EPin, checkEpinValidity, useEpin } from "../models/epin.model";
import { TeamSize } from "../models/TeamSize";
import { UserTotals } from "../models/UserTotals";

const findAvailableSponsor = async (referralCode: string): Promise<User | null> => {
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
  return count < 3;
};

// Breadth-first search to find the next available sponsor
const findNextAvailableSponsor = async (userId: number): Promise<User | null> => {
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
    epin
  } = req.body;

  if (!referral_code) {
    return res.status(400).json({ message: "Referral code is required." });
  }
  const username = await generateUniqueUsername();
  const unique: any = await User.findOne({
    where: { mobile_number: mobile_number },
  });
  const uniqueMobile = await User.findOne({ where: { mobile_number: mobile_number } });
  if (uniqueMobile) {
    return res.status(409).json({ message: "Mobile number already exists." });
  }
  
  const uniqueUpi = await User.findOne({ where: { upi_number: upi_number } });
  if (uniqueUpi) {
    return res.status(409).json({ message: "UPI number already exists." });
  }
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const time = new Date().toTimeString().slice(0, 8); // HH:MM:SS
  try {
    const hashedPassword = password;
    const sponsorUser: any = await findAvailableSponsor(referral_code);
    if (!sponsorUser) {
      return res.status(400).json({
        message: "No available sponsor found for the provided referral code.",
      });
    }

    const isEpinValid = await checkEpinValidity(epin);
    if (!isEpinValid) {
      return res.status(402).json({ message: "Invalid epin or epin cannot be used." });
    }

    const newUser: any = await User.create({
      username: username,
      name,
      password: hashedPassword,
      mobile_number: mobile_number,
      bank_details,
      upi_number,
      referral_code: username,
      referred_by: sponsorUser ? sponsorUser.id : null,
    });
    // await useEpin(epin, newUser.id);
    await processReferralPayments(newUser, referral_code);
    res.status(200).json(newUser);
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      const duplicatedField = error.errors[0].path;
      res.status(409).json({ message: `${duplicatedField} is already in use.` });
    } else {
      console.error("Error signing up:", error);
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
    if (password != user.password) {
      return res.status(200).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign({ userId: user.id }, "your_secret_key");
    res.status(200).json({ token, user });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Error logging in" });
  }
};

const generateUniqueUsername = async () => {
  let isUsernameUnique = false;
  let username: string = "";

  while (!isUsernameUnique) {
    const randomNumber = Math.floor(Math.random() * 90000000) + 10000000;
    username = `sf${randomNumber}`;

    const existingUser = await User.findOne({ where: { username } });
    if (!existingUser) {
      isUsernameUnique = true;
    }
  }

  return username;
};

async function processReferralPayments(newUser: any, sponser: any) {
  const new_sponser: any = await User.findOne({ where: { username: sponser } });
  const newUserforSponser: any = await User.findOne({ where: { id: newUser.referred_by } });
  if (new_sponser) {
    await createGiveHelpEntry(
      newUser.id,
      new_sponser.id,
      300,
      new_sponser.upi_number,
      false,
      null
    );
    await processUplinePayments(newUserforSponser, newUser.id, 300);
  }
}

async function processUplinePayments(user: any, senderId: any, amount: any, priority: number = 0) {
  const defaultUser: any = await User.findOne({ where: { id: 5 } });
  let currentUser = user;
    const uplineUser: any = await User.findOne({
      where: { id: currentUser.referred_by },
    });
    if (!uplineUser) {
      await createGiveHelpEntry(
        senderId,
        defaultUser.id,
        amount,
        defaultUser.upi_number,
        false,
        priority
      );
      console.log("Upline user not found. Skipping payment processing.");
      return ''
    }

    const uplineUserTotals: any = await UserTotals.findOne({ where: { user_id: uplineUser.id } });
    const totalEarned = uplineUserTotals ? parseFloat(uplineUserTotals.total_received.toString()) : 0;
    const isLevelIncreased: any = await GiveHelp.findAll({ where: { sender_id: uplineUser.id, status: "Completed",amount:600 } });
    const isLevelIncreasedUser: any = await User.findOne({ where: { id: uplineUser.id } });

    if (totalEarned <= 900) {
      console.log("Checked: user is a small earner of money.");
      if (priority > 0) {
        await splitAmountBetweenUsers(senderId, uplineUser, defaultUser, amount, priority);
      } else {
        await createGiveHelpEntry(
          senderId,
          uplineUser.id,
          amount,
          uplineUser.upi_number,
          false,
          priority
        );
      }
    } else {
      console.log("what is the level of the user: ", isLevelIncreasedUser.level);
      console.log("is he paid the moeny", isLevelIncreased.length);

      if (isLevelIncreased.length>0 || isLevelIncreasedUser.level>1) {
        await createGiveHelpEntry(
          senderId,
          uplineUser.id,
          amount,
          uplineUser.upi_number,
          false,
          priority
        );
      } else {
        await createGiveHelpEntry(
          senderId,
          uplineUser.id,
          amount,
          uplineUser.upi_number,
          true,
          priority
        );
        processUplinePayments(uplineUser, senderId, amount, priority + 1);
      }
    }
  }

const splitAmountBetweenUsers = async (
  senderId: number,
  uplineUser: any,
  defaultUser: any,
  amount: number,
  priority: number
) => {
  console.log(`Splitting amount: ${amount} between uplineUser: ${uplineUser.id} and defaultUser: ${defaultUser.id}`);
  await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, false, priority);
};

async function createGiveHelpEntry(
  senderId: any,
  receiverId: any,
  amount: any,
  upi: any,
  alertt: boolean,
  priority: number
) {
  await GiveHelp.create({
    sender_id: senderId,
    receiver_id: receiverId,
    amount: amount,
    status: "initiate",
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 8),
    upiId: upi,
    utrNumber: "",
    alert: alertt,
    priority: priority
  });

  if (alertt!==true) {
    let user: any = await UserTotals.findOne({ where: { user_id: senderId } });
    if (user) {
      user.initiated_transactions = parseInt(user.initiated_transactions) + amount;
      await user.save();
    } else {
      await UserTotals.create({
        user_id: senderId,
        initiated_transactions: amount,
      });
    }

    const update_user: any = await UserTotals.findOne({ where: { user_id: receiverId } });
    if (update_user) {
      update_user.initiated_take = parseFloat(update_user.initiated_take.toString()) + amount;
      await update_user.save();
    } else {
      await UserTotals.create({
        user_id: receiverId,
        initiated_take: amount,
      });
    }

  }
}