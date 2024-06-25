"use strict";
// controllers/epin.controller.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEPinTransferReport = exports.getUserUsedEPins = exports.getUserUnusedEPins = exports.transferEPin = exports.createBulkEPin = void 0;
const epin_model_1 = require("../models/epin.model");
const User_1 = require("../models/User");
const transferHistory_model_1 = require("../models/transferHistory.model");
const generateRandomCode = (length) => {
    let code = '';
    for (let i = 0; i < length; i++) {
        code += Math.floor(Math.random() * 10).toString();
    }
    return code;
};
const createBulkEPin = async (req, res) => {
    const { userId, count } = req.body;
    if (!userId || !count || typeof count !== 'number' || count <= 0) {
        return res.status(400).json({ message: "Invalid input data" });
    }
    try {
        const user = await User_1.User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const epins = [];
        for (let i = 0; i < count; i++) {
            const code = generateRandomCode(10); // Generates a 10-digit numeric code
            epins.push({ userId, code, status: "unused" });
        }
        const createdEPins = await epin_model_1.EPin.bulkCreate(epins);
        return res.status(201).json({ message: "EPins created successfully", data: createdEPins });
    }
    catch (error) {
        console.error("Error creating EPins:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.createBulkEPin = createBulkEPin;
const transferEPin = async (req, res) => {
    const { userId, transferredToId, ePinCount } = req.body;
    if (!userId || !transferredToId || !ePinCount || ePinCount <= 0) {
        return res.status(400).json({ message: "Invalid input data" });
    }
    try {
        const user = await User_1.User.findByPk(userId);
        const recipient = await User_1.User.findByPk(transferredToId);
        console.log("user", user.id);
        console.log("recipient", recipient.id);
        if (!user || !recipient) {
            return res.status(404).json({ message: "User not found" });
        }
        // Get the count of unused EPins owned by the user
        const unusedEPinsCount = await epin_model_1.EPin.count({
            where: {
                userId: user.id,
                status: ["unused", "transferred"],
            },
        });
        console.log("unusedEPinsCount", unusedEPinsCount);
        // Check if the user has enough unused EPins
        if (unusedEPinsCount < ePinCount) {
            return res.status(400).json({ message: "Insufficient unused EPins available for transfer" });
        }
        const epins = await epin_model_1.EPin.findAll({
            where: {
                userId: userId,
                status: ["unused", "transferred"],
            },
            limit: +ePinCount,
        });
        console.log("epin will be updated", epins);
        // Update EPins
        await epin_model_1.EPin.update({ status: "transferred", transferredById: userId, userId: recipient.id }, { where: { id: epins.map((epin) => epin.id) } });
        // Create Transfer History
        const transferHistoryEntries = epins.map((epin) => ({
            ePinId: epin.id,
            transferredById: userId,
            transferredToId: transferredToId,
            transferredAt: new Date(),
        }));
        await transferHistory_model_1.TransferHistory.bulkCreate(transferHistoryEntries);
        return res.status(200).json({ message: "EPins transferred successfully" });
    }
    catch (error) {
        console.error("Error transferring EPins:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.transferEPin = transferEPin;
const getUserUnusedEPins = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: "User ID is required" });
    }
    try {
        const user = await User_1.User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const epins = await epin_model_1.EPin.findAll({
            where: {
                userId: id,
                usedById: null,
            },
        });
        return res.status(200).json({ data: epins });
    }
    catch (error) {
        console.error("Error fetching EPins:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.getUserUnusedEPins = getUserUnusedEPins;
const getUserUsedEPins = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: "User ID is required" });
    }
    try {
        const user = await User_1.User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const epins = await epin_model_1.EPin.findAll({
            where: {
                userId: id,
                status: "used",
            },
            include: [
                {
                    model: User_1.User,
                    as: "UsedBy",
                    attributes: ["id", "username", "name"],
                },
            ],
        });
        return res.status(200).json({ data: epins });
    }
    catch (error) {
        console.error("Error fetching EPins:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.getUserUsedEPins = getUserUsedEPins;
const getEPinTransferReport = async (req, res) => {
    const { userId } = req.params;
    if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
    }
    try {
        const user = await User_1.User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const transferHistory = await transferHistory_model_1.TransferHistory.findAll({
            where: {
                transferredById: userId,
            },
            include: [
                {
                    model: epin_model_1.EPin,
                    as: "EPin",
                    attributes: ["id", "code", "status"],
                },
                {
                    model: User_1.User,
                    as: "transferredTo",
                    attributes: ["id", "username", "name"],
                },
                {
                    model: User_1.User,
                    as: "TransferredBy",
                    attributes: ["id", "username", "name"],
                },
            ],
        });
        return res.status(200).json({ data: transferHistory });
    }
    catch (error) {
        console.error("Error fetching transfer history:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.getEPinTransferReport = getEPinTransferReport;
