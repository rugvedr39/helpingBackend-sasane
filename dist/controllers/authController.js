"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.signup = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const sequelize_1 = require("sequelize");
const give_help_1 = require("../models/give_help");
const epin_model_1 = require("../models/epin.model");
const UserTotals_1 = require("../models/UserTotals");
const signup = async (req, res) => {
    const { password, mobile_number, name, bank_details, upi_number, referral_code, epin, selected_sponsor } = req.body;
    if (!referral_code) {
        return res.status(400).json({ message: "Referral code is required." });
    }
    const username = await generateUniqueUsername();
    // const uniqueMobile = await User.findOne({ where: { mobile_number: mobile_number } });
    // if (uniqueMobile) {
    //   return res.status(409).json({ message: "Mobile number already exists." });
    // }
    // const uniqueUpi = await User.findOne({ where: { upi_number: upi_number } });
    // if (uniqueUpi) {
    //   return res.status(409).json({ message: "UPI number already exists." });
    // }
    const mainRefral = await User_1.User.findOne({ where: { username: referral_code } });
    try {
        let sponsorUser;
        const hashedPassword = password;
        if (!selected_sponsor) {
            sponsorUser = mainRefral.id;
        }
        else {
            const mainRefralselected_sponsor = await User_1.User.findOne({ where: { username: selected_sponsor } });
            sponsorUser = mainRefralselected_sponsor.id;
        }
        if (!sponsorUser) {
            return res.status(400).json({
                message: "No available sponsor found for the provided referral code.",
            });
        }
        const isEpinValid = await (0, epin_model_1.checkEpinValidity)(epin);
        if (!isEpinValid) {
            return res.status(402).json({ message: "Invalid epin or epin cannot be used." });
        }
        const newUser = await User_1.User.create({
            username: username,
            name,
            password: hashedPassword,
            mobile_number: mobile_number,
            bank_details,
            upi_number,
            referral_code: username,
            referred_by: sponsorUser,
            main_referred_by: mainRefral.id
        });
        await (0, epin_model_1.useEpin)(epin, newUser.id);
        if (newUser.referred_by == newUser.main_referred_by) {
            await processReferralPayments(newUser, referral_code);
        }
        else {
            await createGiveHelpEntry(newUser.id, newUser.main_referred_by, 300, mainRefral.upi_number, false, 0);
            await createGiveHelpEntry(newUser.id, newUser.main_referred_by, 300, mainRefral.upi_number, false, 0);
        }
        res.status(200).json(newUser);
    }
    catch (error) {
        if (error instanceof sequelize_1.UniqueConstraintError) {
            const duplicatedField = error.errors[0].path;
            res.status(409).json({ message: `${duplicatedField} is already in use.` });
        }
        else {
            console.error("Error signing up:", error);
            res.status(500).json({ message: "Error signing up" });
        }
    }
};
exports.signup = signup;
const login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User_1.User.findOne({ where: { username } });
        if (!user) {
            return res.status(200).json({ message: "User not found" });
        }
        if (password != user.password) {
            return res.status(200).json({ message: "Invalid credentials" });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, "your_secret_key");
        res.status(200).json({ token, user });
    }
    catch (error) {
        console.error("Error logging in:", error);
        res.status(500).json({ message: "Error logging in" });
    }
};
exports.login = login;
const generateUniqueUsername = async () => {
    let isUsernameUnique = false;
    let username = "";
    while (!isUsernameUnique) {
        const randomNumber = Math.floor(Math.random() * 90000000) + 10000000;
        username = `sf${randomNumber}`;
        const existingUser = await User_1.User.findOne({ where: { username } });
        if (!existingUser) {
            isUsernameUnique = true;
        }
    }
    return username;
};
async function processReferralPayments(newUser, sponser) {
    const new_sponser = await User_1.User.findOne({ where: { username: sponser } });
    const newUserforSponser = await User_1.User.findOne({ where: { id: newUser.referred_by } });
    if (new_sponser) {
        await createGiveHelpEntry(newUser.id, new_sponser.id, 300, new_sponser.upi_number, false, null);
        await processUplinePayments(newUserforSponser, newUser.id, 300);
    }
}
async function processUplinePayments(user, senderId, amount, priority = 0) {
    const defaultUser = await User_1.User.findOne({ where: { id: 5 } });
    let currentUser = user;
    const uplineUser = await User_1.User.findOne({
        where: { id: currentUser.referred_by },
    });
    if (!uplineUser) {
        await createGiveHelpEntry(senderId, defaultUser.id, amount, defaultUser.upi_number, false, priority);
        console.log("Upline user not found. Skipping payment processing.");
        return '';
    }
    const uplineUserTotals = await UserTotals_1.UserTotals.findOne({ where: { user_id: uplineUser.id } });
    const totalEarned = uplineUserTotals ? parseFloat(uplineUserTotals.total_received.toString()) : 0;
    const isLevelIncreased = await give_help_1.GiveHelp.findAll({ where: { sender_id: uplineUser.id, status: "Completed", amount: 600 } });
    const isLevelIncreasedUser = await User_1.User.findOne({ where: { id: uplineUser.id } });
    if (totalEarned <= 900) {
        console.log("Checked: user is a small earner of money.");
        if (priority > 0) {
            await splitAmountBetweenUsers(senderId, uplineUser, defaultUser, amount, priority);
        }
        else {
            await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, false, priority);
        }
    }
    else {
        console.log("what is the level of the user: ", isLevelIncreasedUser.level);
        console.log("is he paid the moeny", isLevelIncreased.length);
        if (isLevelIncreased.length > 0 || isLevelIncreasedUser.level > 1) {
            await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, false, priority);
        }
        else {
            await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, true, priority);
            processUplinePayments(uplineUser, senderId, amount, priority + 1);
        }
    }
}
const splitAmountBetweenUsers = async (senderId, uplineUser, defaultUser, amount, priority) => {
    console.log(`Splitting amount: ${amount} between uplineUser: ${uplineUser.id} and defaultUser: ${defaultUser.id}`);
    await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, false, priority);
};
async function createGiveHelpEntry(senderId, receiverId, amount, upi, alertt, priority) {
    await give_help_1.GiveHelp.create({
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
    if (alertt !== true) {
        let user = await UserTotals_1.UserTotals.findOne({ where: { user_id: senderId } });
        if (user) {
            user.initiated_transactions = parseInt(user.initiated_transactions) + amount;
            await user.save();
        }
        else {
            await UserTotals_1.UserTotals.create({
                user_id: senderId,
                initiated_transactions: amount,
            });
        }
        const update_user = await UserTotals_1.UserTotals.findOne({ where: { user_id: receiverId } });
        if (update_user) {
            update_user.initiated_take = parseFloat(update_user.initiated_take.toString()) + amount;
            await update_user.save();
        }
        else {
            await UserTotals_1.UserTotals.create({
                user_id: receiverId,
                initiated_take: amount,
            });
        }
    }
}
