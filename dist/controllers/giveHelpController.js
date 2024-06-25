"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gettotals = exports.getTotalmemberBylevelWise = exports.getTotalmemberById = exports.getReferralTree = exports.TransactionComplete = exports.ReciveTransaction = exports.updateTransaction = exports.getTransaction = void 0;
const sequelize_1 = require("sequelize");
const give_help_1 = require("../models/give_help");
const User_1 = require("../models/User");
const database_1 = require("../config/database");
const TeamSize_1 = require("../models/TeamSize");
const UserTotals_1 = require("../models/UserTotals");
const { Op } = require("sequelize");
const getTransaction = async (req, res) => {
    const { id } = req.params;
    try {
        const transaction = await give_help_1.GiveHelp.findAll({
            where: { sender_id: id },
            include: [
                {
                    model: User_1.User,
                    as: "Sender",
                    attributes: ["name", "mobile_number", "username"],
                },
                {
                    model: User_1.User,
                    as: "Receiver",
                    attributes: ["name", "mobile_number", "username"],
                },
            ],
        });
        res.status(200).json(transaction);
    }
    catch (error) {
        console.log(error);
    }
};
exports.getTransaction = getTransaction;
const updateTransaction = async (req, res) => {
    const { transactionId, utrNumber } = req.body;
    try {
        const transaction = await give_help_1.GiveHelp.findByPk(transactionId);
        if (!transaction) {
            return res.status(404).json({ status: "Transaction not found" });
        }
        transaction.utrNumber = utrNumber;
        transaction.status = "Pending";
        await transaction.save();
        let amount = parseFloat(transaction.amount);
        // Update sender's UserTotals
        let senderTotals = await UserTotals_1.UserTotals.findOne({ where: { user_id: transaction.sender_id } });
        if (senderTotals) {
            senderTotals.initiated_transactions = parseFloat(senderTotals.initiated_transactions.toString()) - amount;
            senderTotals.pending_transactions = parseFloat(senderTotals.pending_transactions.toString()) + amount;
            await senderTotals.save();
        }
        else {
            return res.status(404).json({ status: "Sender's totals not found" });
        }
        // Update receiver's UserTotals
        let receiverTotals = await UserTotals_1.UserTotals.findOne({ where: { user_id: transaction.receiver_id } });
        if (receiverTotals) {
            receiverTotals.initiated_take = parseFloat(receiverTotals.initiated_take.toString()) - amount; // Adjust field name if necessary
            receiverTotals.pending_take = parseFloat(receiverTotals.pending_take.toString()) + amount; // Adjust field name if necessary
            await receiverTotals.save();
        }
        else {
            return res.status(404).json({ status: "Receiver's totals not found" });
        }
        res.status(200).json({ message: "Transaction Updated" });
    }
    catch (error) {
        console.error("Failed to update UTR Number:", error);
        res.status(500).send("Error updating UTR Number");
    }
};
exports.updateTransaction = updateTransaction;
const ReciveTransaction = async (req, res) => {
    const { id } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50; // Default limit of 50
    const offset = (page - 1) * limit;
    try {
        const { count, rows: transactions } = await give_help_1.GiveHelp.findAndCountAll({
            where: { receiver_id: id },
            include: [
                {
                    model: User_1.User,
                    as: "Sender",
                    attributes: ["name", "mobile_number"],
                },
                {
                    model: User_1.User,
                    as: "Receiver",
                    attributes: ["name", "mobile_number"],
                },
            ],
            limit,
            offset,
            order: [['date', 'DESC']], // Sort by createdAt in descending order
        });
        const totalPages = Math.ceil(count / limit);
        res.status(200).json({
            transactions,
            currentPage: page,
            totalPages,
            totalRecords: count,
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Failed to fetch transactions" });
    }
};
exports.ReciveTransaction = ReciveTransaction;
const TransactionComplete = async (req, res) => {
    const { id } = req.params;
    try {
        const transaction = await give_help_1.GiveHelp.findByPk(id);
        if (!transaction) {
            return res.status(404).send("Transaction not found");
        }
        transaction.status = "Completed";
        await transaction.save();
        const amount = parseFloat(transaction.amount.toString());
        await UserTotals_1.UserTotals.findOne({ where: { user_id: transaction.sender_id } }).then(async (userTotals) => {
            if (userTotals) {
                userTotals.total_sent = parseFloat(userTotals.total_sent.toString()) + amount;
                userTotals.pending_transactions = parseFloat(userTotals.pending_transactions.toString()) - amount;
                await userTotals.save();
            }
        });
        await UserTotals_1.UserTotals.findOne({ where: { user_id: transaction.receiver_id } }).then(async (userTotals) => {
            if (userTotals) {
                userTotals.total_received = parseFloat(userTotals.total_received.toString()) + amount;
                userTotals.pending_take = parseFloat(userTotals.pending_take.toString()) - amount;
                await userTotals.save();
            }
        });
        const completedTransactions = await give_help_1.GiveHelp.findAll({
            where: {
                sender_id: transaction.sender_id,
                status: "Completed",
            },
        });
        // Filter and limit transactions of 300 to only count the first two
        const transactions300 = completedTransactions
            .filter((t) => parseFloat(t.amount) === 300)
            .slice(0, 2);
        const amount300 = transactions300.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        // Calculate the total amount including a maximum of two 300 transactions
        const totalAmount = completedTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) !== 300 ? parseFloat(t.amount) : 0), 0) + amount300;
        let level = 0;
        if (totalAmount >= 19700)
            level = 9;
        else if (totalAmount >= 18700)
            level = 8;
        else if (totalAmount >= 16700)
            level = 7;
        else if (totalAmount >= 13700)
            level = 6;
        else if (totalAmount >= 9700)
            level = 5;
        else if (totalAmount >= 5700)
            level = 4;
        else if (totalAmount >= 2700)
            level = 3;
        else if (totalAmount >= 1200)
            level = 2;
        else if (totalAmount >= 600)
            level = 1;
        let user = await User_1.User.findOne({
            where: { id: transaction.sender_id },
        });
        user.level = level;
        if (totalAmount >= 600) {
            user.status = "Active";
        }
        await user.save();
        const handleAlertEntries = async (amountToCheck, uplineAmount) => {
            console.log("handleAlertEntries", amountToCheck);
            const alertEntries = await give_help_1.GiveHelp.findAll({
                where: {
                    receiver_id: transaction.sender_id,
                    status: 'initiate',
                    alert: true,
                    amount: amountToCheck
                }
            });
            if (alertEntries.length > 0) {
                for (let entry of alertEntries) {
                    entry.alert = false;
                    entry.priority = null;
                    await UserTotals_1.UserTotals.findOne({ where: {
                            user_id: entry.receiver_id,
                        } })
                        .then(async (userTotals) => {
                        if (userTotals) {
                            userTotals.initiated_take = parseFloat(userTotals.initiated_take.toString()) - entry.amount;
                            await userTotals.save();
                        }
                    });
                    await entry.save();
                }
                const uplineEntries = await give_help_1.GiveHelp.findAll({
                    where: {
                        sender_id: alertEntries[0].sender_id,
                        receiver_id: {
                            [Op.ne]: transaction.sender_id,
                        },
                        status: 'initiate',
                        amount: amountToCheck,
                        priority: {
                            [Op.ne]: null,
                        }
                    }
                });
                for (const entry of uplineEntries) {
                    await UserTotals_1.UserTotals.findOne({ where: {
                            user_id: entry.receiver_id,
                        } })
                        .then(async (userTotals) => {
                        if (userTotals) {
                            userTotals.initiated_take = parseFloat(userTotals.initiated_take.toString()) - entry.amount;
                            await userTotals.save();
                        }
                    });
                    await entry.destroy();
                }
            }
            const alertEntrydestroy = await give_help_1.GiveHelp.findAll({
                where: {
                    sender_id: transaction.sender_id,
                    amount: amount,
                    alert: true,
                    status: "initiate",
                }
            });
            for (const destroyEntry of alertEntrydestroy) {
                await destroyEntry.destroy();
            }
        };
        if (amount == 600) {
            await handleAlertEntries(300, 600);
        }
        if (amount == 1500) {
            await handleAlertEntries(600, 1500);
        }
        if (amount == 3000) {
            await handleAlertEntries(1500, 3000);
        }
        if (amount == 4000) {
            await handleAlertEntries(3000, 4000);
        }
        if (amount == 2000) {
            await handleAlertEntries(3000, 2000);
        }
        if (amount == 1000) {
            await handleAlertEntries(2000, 1000);
        }
        if (level === 1) {
            console.log("user level is", level);
            const rs300 = await give_help_1.GiveHelp.findOne({
                where: {
                    sender_id: transaction.sender_id,
                    amount: 300.0,
                    status: "Completed",
                    // receiver_id: {
                    //   [Op.ne]: 5,
                    // },
                },
            });
            if (rs300 != null) {
                let upline = await User_1.User.findOne({
                    where: { id: rs300.receiver_id },
                });
                upline = await User_1.User.findOne({
                    where: { id: upline.referred_by },
                });
                await createGiveHelpEntryForUpline(user.id, upline, 600);
            }
        }
        else {
            let upline = await User_1.User.findOne({
                where: { id: transaction.receiver_id },
            });
            if (user.level > 1 && user.level < 9) {
                await createGiveHelpEntryForUpline(transaction.sender_id, upline, level === 2
                    ? 1500
                    : level === 3
                        ? 3000
                        : level === 4
                            ? 4000
                            : level === 5
                                ? 4000
                                : level === 6
                                    ? 3000
                                    : level === 7
                                        ? 2000
                                        : level === 8
                                            ? 1000
                                            : 0, level, user.level);
            }
        }
        res.status(200).json({
            status: 200,
            message: "Transaction completed successfully",
            transaction,
        });
    }
    catch (error) {
        console.error("Failed to update UTR Number:", error);
        res.status(500).send("Error updating UTR Number");
    }
};
exports.TransactionComplete = TransactionComplete;
const getReferralTree = async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const level = req.params.level ? parseInt(req.params.level, 10) : null;
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50; // Default limit of 50
    if (level !== null && (isNaN(level) || level < 1 || level > 10)) {
        return res.status(400).json({ message: "Invalid level. Level must be between 1 and 10." });
    }
    if (isNaN(page) || page < 1) {
        return res.status(400).json({ message: "Invalid page number. Page must be a positive integer." });
    }
    if (isNaN(limit) || limit < 1) {
        return res.status(400).json({ message: "Invalid limit. Limit must be a positive integer." });
    }
    try {
        const user = await User_1.User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const tree = await getReferralTreeLevels(user.id, level, page, limit);
        res.json(tree);
    }
    catch (error) {
        console.error("Error fetching referral tree:", error);
        res.status(500).json({ message: "Failed to fetch referral tree" });
    }
};
exports.getReferralTree = getReferralTree;
async function getReferralTreeLevels(userId, level = null, page, limit, maxLevel = 10) {
    const offset = (page - 1) * limit;
    const levelCondition = level !== null ? `AND cte.level = ${level}` : '';
    const maxLevelCondition = level !== null ? level : maxLevel;
    const query = `
    WITH RECURSIVE cte AS (
      SELECT 
        id,
        name,
        username,
        mobile_number,
        status,
        referred_by,
        1 AS level
      FROM Users
      WHERE referred_by = :userId
      UNION ALL
      SELECT 
        u.id,
        u.name,
        u.username,
        u.mobile_number,
        u.status,
        u.referred_by,
        cte.level + 1
      FROM Users u
      INNER JOIN cte ON cte.id = u.referred_by
      WHERE cte.level < :maxLevelCondition
    )
    SELECT 
      cte.*,
      referrer.name AS referrer_name,
      referrer.username AS referrer_username
    FROM cte
    LEFT JOIN Users referrer ON cte.referred_by = referrer.id
    WHERE cte.id != :userId ${levelCondition}
    ORDER BY cte.level, cte.id
    LIMIT :limit OFFSET :offset;
  `;
    const replacements = {
        userId,
        maxLevelCondition,
        limit,
        offset,
    };
    const referrals = await database_1.sequelize.query(query, {
        type: sequelize_1.QueryTypes.SELECT,
        replacements,
    });
    if (level !== null) {
        // If a specific level is requested, prepare pagination info for that level
        return {
            level,
            count: referrals.length,
            users: referrals,
            currentPage: page,
            totalPages: Math.ceil(referrals.length / limit)
        };
    }
    // Group by level and include pagination information
    const result = referrals.reduce((acc, ref) => {
        if (!acc[ref.level]) {
            acc[ref.level] = { level: ref.level, count: 0, users: [] };
        }
        acc[ref.level].count++;
        acc[ref.level].users.push({
            id: ref.id,
            name: ref.name,
            username: ref.username,
            mobile_number: ref.mobile_number,
            status: ref.status,
            referred_by: ref.referred_by,
            referrer_name: ref.referrer_name,
            referrer_username: ref.referrer_username,
        });
        return acc;
    }, []);
    return {
        data: result.filter((levelData) => levelData.count > 0),
        currentPage: page,
        totalPages: Math.ceil(result.length / limit)
    };
}
// create createGiveHelpEntry
async function createGiveHelpEntry(senderId, receiverId, amount, upi, alert, priority) {
    console.log("in the createGiveHelpEntry");
    await give_help_1.GiveHelp.create({
        sender_id: senderId,
        receiver_id: receiverId,
        amount: amount,
        status: "initiate",
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toTimeString().slice(0, 8),
        upiId: upi,
        utrNumber: "",
        alert: alert,
        priority: priority
    });
    console.log("SenderId", senderId);
    console.log("ReceiverId", receiverId);
    console.log("Amount", amount);
    await UserTotals_1.UserTotals.findOne({ where: { user_id: senderId } }).then(async (userTotal) => {
        if (userTotal) {
            await userTotal.update({
                initiated_transactions: parseInt(userTotal.initiated_transactions) + amount,
            });
        }
    });
    await UserTotals_1.UserTotals.findOne({ where: { user_id: receiverId } }).then(async (userTotal) => {
        if (userTotal) {
            await userTotal.update({
                initiated_take: parseInt(userTotal.initiated_take) + amount,
            });
        }
    });
}
const createGiveHelpEntryForUpline = async (senderId, upline, amount, priority = 0, level = 0) => {
    try {
        console.log(`Entering createGiveHelpEntryForUpline with senderId: ${senderId}, amount: ${amount}, priority: ${priority}`);
        const defaultUser = await User_1.User.findOne({ where: { id: 5 } });
        if (!upline || !defaultUser) {
            throw new Error(`Default upline user with ID 5 not found`);
        }
        if (upline.referred_by) {
            const uplineUser = await User_1.User.findOne({ where: { id: upline.referred_by } });
            if (!uplineUser) {
                throw new Error(`Upline user with ID ${upline.referred_by} not found`);
            }
            const uplineUserTotals = await UserTotals_1.UserTotals.findOne({ where: { user_id: uplineUser.id } });
            const totalEarned = uplineUserTotals ? parseFloat(uplineUserTotals.total_received.toString()) : 0;
            console.log(`Upline user found: ${uplineUser.id}, totalEarned: ${totalEarned}`);
            const helpGive = await give_help_1.GiveHelp.findAll({ where: { sender_id: uplineUser.id, amount: amount, status: "Completed" } });
            const helpGiveCount = helpGive.length;
            console.log(`HelpGive entries found: ${helpGiveCount}`);
            if (helpGiveCount == 1 && amount == 4000 || helpGiveCount == 2) {
                if (level == 4) {
                    if (priority > 0) {
                        await splitAmountBetweenUsers(senderId, uplineUser, defaultUser, amount, priority);
                    }
                    else {
                        await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, false, priority);
                    }
                }
                if (level == 5) {
                    if (helpGiveCount == 2) {
                        if (priority > 0) {
                            await splitAmountBetweenUsers(senderId, uplineUser, defaultUser, amount, priority);
                        }
                        else {
                            await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, false, priority);
                        }
                    }
                    else {
                        if (totalEarned < 25900) {
                            if (priority > 0) {
                                await splitAmountBetweenUsers(senderId, uplineUser, defaultUser, amount, priority);
                            }
                            else {
                                await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, false, priority);
                            }
                        }
                        else {
                            await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, true, priority);
                            await createGiveHelpEntryForUpline(senderId, uplineUser, amount, priority + 1);
                        }
                    }
                }
            }
            else {
                if (helpGiveCount == 0 && amount == 4000) {
                    if (totalEarned <= 17900 && totalEarned >= 9900) {
                        await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, false, priority);
                    }
                    else {
                        await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, true, priority);
                        await createGiveHelpEntryForUpline(senderId, uplineUser, amount, priority + 1);
                    }
                }
            }
            if (helpGiveCount == 1 && amount == 3000 || helpGiveCount == 2) {
                if (level == 3) {
                    if (priority > 0) {
                        await splitAmountBetweenUsers(senderId, uplineUser, defaultUser, amount, priority);
                    }
                    else {
                        await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, false, priority);
                    }
                }
                if (level == 6) {
                    if (helpGiveCount == 2) {
                        if (priority > 0) {
                            await splitAmountBetweenUsers(senderId, uplineUser, defaultUser, amount, priority);
                        }
                        else {
                            await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, false, priority);
                        }
                    }
                    else {
                        if (totalEarned < 31900 && totalEarned >= 25900) {
                            if (priority > 0) {
                                await splitAmountBetweenUsers(senderId, uplineUser, defaultUser, amount, priority);
                            }
                            else {
                                await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, false, priority);
                            }
                        }
                        else {
                            await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, true, priority);
                            await createGiveHelpEntryForUpline(senderId, uplineUser, amount, priority + 1);
                        }
                    }
                }
            }
            else {
                if (helpGiveCount == 0 && amount == 3000) {
                    if (totalEarned <= 9900 && totalEarned >= 3900) {
                        await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, false, priority);
                    }
                    else {
                        await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, true, priority);
                        await createGiveHelpEntryForUpline(senderId, uplineUser, amount, priority + 1);
                    }
                }
            }
            if (amount != 4000 && amount != 3000) {
                console.log(`No helpGive entries found. Processing default give help entry.`);
                await processDefaultGiveHelpEntry(senderId, uplineUser, defaultUser, amount, priority, totalEarned);
            }
        }
        else {
            console.log(`Upline user has no referred_by. Using default user.`);
            await createGiveHelpEntry(senderId, defaultUser.id, amount, defaultUser.upi_number, false, 1);
        }
    }
    catch (error) {
        console.error("Error in createGiveHelpEntryForUpline:", error);
    }
};
const processDefaultGiveHelpEntry = async (senderId, uplineUser, defaultUser, amount, priority, totalEarned) => {
    console.log(`Processing default give help entry for amount: ${amount}, totalEarned: ${totalEarned}`);
    const checkUserLevel = await User_1.User.findOne({ where: { id: uplineUser.id } });
    console.log(`checkUserLevel: ${checkUserLevel.level}`);
    console.log("totalEarned: ", totalEarned);
    console.log("amount: ", amount);
    if ((amount == 600 && totalEarned <= 900 || checkUserLevel.level > 1) ||
        (amount == 1500 && totalEarned <= 3900 && totalEarned >= 900 || checkUserLevel.level > 2) ||
        (amount == 2000 && totalEarned <= 35900 && totalEarned >= 31900 || checkUserLevel.level > 8) ||
        (amount == 1000 && totalEarned <= 37900 && totalEarned >= 35900 || checkUserLevel.level > 8)) {
        console.log(`Default conditions not met. Splitting amount if priority >= 0.`);
        if (priority > 0) {
            await splitAmountBetweenUsers(senderId, uplineUser, defaultUser, amount, priority);
        }
        else {
            await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, false, priority);
        }
    }
    else {
        console.log(`Default conditions met. Creating give help entry and proceeding up the chain.`);
        await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, true, priority);
        await createGiveHelpEntryForUpline(senderId, uplineUser, amount, priority + 1);
    }
};
const splitAmountBetweenUsers = async (senderId, uplineUser, defaultUser, amount, priority) => {
    console.log(`Splitting amount: ${amount} between uplineUser: ${uplineUser.id} and defaultUser: ${defaultUser.id}`);
    await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, false, priority);
};
const getTotalmemberById = async (req, res) => {
    const userId = parseInt(req.params.id);
    const levelwisedata = await TeamSize_1.TeamSize.findOne({
        where: {
            user_id: userId
        }
    });
    let totalmember = 0;
    totalmember += levelwisedata === null || levelwisedata === void 0 ? void 0 : levelwisedata.level1;
    totalmember += levelwisedata === null || levelwisedata === void 0 ? void 0 : levelwisedata.level2;
    totalmember += levelwisedata === null || levelwisedata === void 0 ? void 0 : levelwisedata.level3;
    totalmember += levelwisedata === null || levelwisedata === void 0 ? void 0 : levelwisedata.level4;
    totalmember += levelwisedata === null || levelwisedata === void 0 ? void 0 : levelwisedata.level5;
    totalmember += levelwisedata === null || levelwisedata === void 0 ? void 0 : levelwisedata.level6;
    totalmember += levelwisedata === null || levelwisedata === void 0 ? void 0 : levelwisedata.level7;
    totalmember += levelwisedata === null || levelwisedata === void 0 ? void 0 : levelwisedata.level8;
    totalmember += levelwisedata === null || levelwisedata === void 0 ? void 0 : levelwisedata.level9;
    totalmember += levelwisedata === null || levelwisedata === void 0 ? void 0 : levelwisedata.level10;
    res.status(200).json({ status: 200, data: totalmember });
};
exports.getTotalmemberById = getTotalmemberById;
const getTotalmemberBylevelWise = async (req, res) => {
    const userId = parseInt(req.params.id);
    const levelwisedata = await TeamSize_1.TeamSize.findOne({
        where: {
            user_id: userId
        }
    });
    res.status(200).json({ status: 200, data: levelwisedata });
};
exports.getTotalmemberBylevelWise = getTotalmemberBylevelWise;
const gettotals = async (req, res) => {
    const id = parseInt(req.params.id);
    const totals = await UserTotals_1.UserTotals.findOne({
        where: {
            user_id: id
        }
    });
    res.status(200).json({ status: 200, data: totals });
};
exports.gettotals = gettotals;
