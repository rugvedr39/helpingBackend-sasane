"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const User_1 = require("../models/User");
const sequelize_1 = require("sequelize");
const epin_model_1 = require("../models/epin.model");
const transferHistory_model_1 = require("../models/transferHistory.model");
const sequelize_2 = __importDefault(require("sequelize"));
class AdminController {
    constructor() {
        this.updateUserDetails = async (req, res) => {
            try {
                const { id } = req.params;
                const { name, mobile_number, upi_number, password } = req.body;
                // Find the user by ID
                const user = await User_1.User.findByPk(id);
                if (!user) {
                    return res.status(404).json({ error: "User not found" });
                }
                // Update user details
                user.name = name || user.name;
                user.mobile_number = mobile_number || user.mobile_number;
                user.upi_number = upi_number || user.upi_number;
                user.password = password || user.password;
                // Save the updated user
                await user.save();
                res.json({ message: "User updated successfully", user });
            }
            catch (error) {
                console.error(error);
                res.status(500).json({ error: "Server error" });
            }
        };
        this.getEPinHistoryWithPagination = async (req, res) => {
            const { page = 1, pageSize = 10, search = "" } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(pageSize);
            try {
                let whereClause = {};
                let includeClause = [
                    { model: User_1.User, as: "UsedBy" },
                    { model: User_1.User, as: "TransferredBy" },
                    {
                        model: transferHistory_model_1.TransferHistory,
                        as: "TransferHistory",
                        include: [
                            { model: User_1.User, as: "TransferredByUser" },
                            { model: User_1.User, as: "TransferredToUser" },
                        ],
                    },
                ];
                if (typeof search === "string" && search.length > 0) {
                    if (search.startsWith("sf")) {
                        includeClause.unshift({
                            model: User_1.User,
                            as: "User",
                            where: {
                                username: {
                                    [sequelize_1.Op.like]: `%${search.substring(2)}%`,
                                },
                            },
                        });
                    }
                    else {
                        whereClause = {
                            code: {
                                [sequelize_1.Op.like]: `%${search}%`,
                            },
                        };
                        includeClause.unshift({ model: User_1.User, as: "User" });
                    }
                }
                else {
                    includeClause.unshift({ model: User_1.User, as: "User" });
                }
                const epins = await epin_model_1.EPin.findAndCountAll({
                    where: whereClause,
                    offset,
                    limit: parseInt(pageSize),
                    order: [["createdAt", "DESC"]], // Add sorting here
                    include: includeClause,
                });
                const epinHistory = epins.rows.map((epin) => {
                    const createdBy = epin.User ? epin.User.get() : null;
                    const usedBy = epin.UsedBy ? epin.UsedBy.get() : null;
                    const transferredBy = epin.TransferredBy
                        ? epin.TransferredBy.get()
                        : null;
                    const transferHistory = epin.TransferHistory.map((history) => ({
                        transferredBy: history.TransferredByUser
                            ? history.TransferredByUser.get()
                            : null,
                        transferredTo: history.TransferredToUser
                            ? history.TransferredToUser.get()
                            : null,
                        transferredAt: history.transferredAt,
                    }));
                    let creator;
                    if (transferHistory.length > 0) {
                        creator = transferHistory[0].transferredBy;
                    }
                    else {
                        creator = createdBy;
                    }
                    return {
                        ePinCode: epin.code,
                        createdAt: epin.createdAt,
                        creator,
                        usedBy,
                        transferredBy,
                        transferHistory,
                    };
                });
                const totalPages = Math.ceil(epins.count / parseInt(pageSize));
                res.json({
                    data: epinHistory,
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: epins.count,
                });
            }
            catch (error) {
                console.error(error);
                res.status(500).json({ error: "Internal server error" });
            }
        };
        this.getEPinCounts = async (req, res) => {
            try {
                const { date } = req.query;
                let whereClause = {};
                if (date && typeof date === 'string') {
                    const parsedDate = new Date(date);
                    if (!isNaN(parsedDate.getTime())) {
                        whereClause = {
                            createdAt: {
                                [sequelize_1.Op.gte]: new Date(parsedDate.setHours(0, 0, 0, 0)),
                                [sequelize_1.Op.lt]: new Date(parsedDate.setHours(23, 59, 59, 999))
                            }
                        };
                    }
                    else {
                        return res.status(400).json({ error: 'Invalid date format' });
                    }
                }
                const totalEPins = await epin_model_1.EPin.count();
                const usedEPins = await epin_model_1.EPin.count({ where: { status: "used" } });
                let dateFilteredCounts = [];
                if (Object.keys(whereClause).length > 0) {
                    dateFilteredCounts = await epin_model_1.EPin.findAll({
                        where: whereClause,
                        attributes: [
                            [sequelize_2.default.fn("COUNT", sequelize_2.default.col("id")), "count"],
                        ],
                    });
                }
                const createdEPinsByDate = await epin_model_1.EPin.findAll({
                    where: whereClause,
                    attributes: [
                        [sequelize_2.default.fn("DATE", sequelize_2.default.col("createdAt")), "date"],
                        [sequelize_2.default.fn("COUNT", sequelize_2.default.col("id")), "count"],
                    ],
                    group: ["date"],
                    order: [["date", "DESC"]],
                });
                res.json({
                    totalEPins,
                    usedEPins,
                    createdEPinsByDate,
                    dateFilteredCounts: dateFilteredCounts.length > 0 ? dateFilteredCounts[0].dataValues.count : 0,
                });
            }
            catch (error) {
                console.error(error);
                res.status(500).json({ error: "Internal server error" });
            }
        };
    }
    async listUsers(req, res) {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        try {
            const users = await User_1.User.findAndCountAll({
                where: {
                    username: {
                        [sequelize_1.Op.like]: `%${search}%`,
                    },
                },
                include: [
                    {
                        model: User_1.User,
                        as: "Referrer",
                        attributes: ["username", "name"],
                    },
                ],
                order: [["createdAt", "ASC"]],
                offset: (page - 1) * limit,
                limit: limit,
            });
            return res.status(200).json({
                total: users.count,
                totalPages: Math.ceil(users.count / limit),
                currentPage: page,
                users: users.rows,
            });
        }
        catch (error) {
            return res.status(500).json({
                message: "Error retrieving users",
                error: error.message,
            });
        }
    }
    async UsersCount(req, res) {
        try {
            const totalUsers = await User_1.User.count();
            const totalActiveUsers = await User_1.User.count({
                where: { status: "active" },
            });
            const totalNotActiveUsers = await User_1.User.count({
                where: { status: "notActive" },
            });
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const endOfToday = new Date();
            endOfToday.setHours(23, 59, 59, 999);
            const totalUserjoinedToday = await User_1.User.count({
                where: {
                    createdAt: {
                        [sequelize_1.Op.between]: [startOfToday, endOfToday],
                    },
                },
            });
            res.status(200).json({
                totalUsers: totalUsers,
                totalActiveUsers: totalActiveUsers,
                totalNotActiveUsers: totalNotActiveUsers,
                totalUserjoinedToday: totalUserjoinedToday,
            });
        }
        catch (error) {
            console.error("Error fetching user counts:", error);
            throw error;
        }
    }
}
exports.AdminController = AdminController;
