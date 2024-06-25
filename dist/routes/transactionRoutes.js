"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const giveHelpController_1 = require("../controllers/giveHelpController");
const { Op } = require("sequelize");
const give_help_1 = require("../models/give_help");
const database_1 = require("../config/database");
const router = express_1.default.Router();
router.get("/get-transaction/:id", giveHelpController_1.getTransaction);
router.get("/recive-transaction/:id", giveHelpController_1.ReciveTransaction);
router.post("/post-completed", giveHelpController_1.updateTransaction);
router.get("/transaction-completed/:id", giveHelpController_1.TransactionComplete);
router.get("/tree/:id/:level", giveHelpController_1.getReferralTree);
router.get("/getReferralTreeSize/:id", giveHelpController_1.getTotalmemberById);
router.get("/getTotalmemberBylevelWise/:id", giveHelpController_1.getTotalmemberBylevelWise);
router.get("/gettotals/:id", giveHelpController_1.gettotals);
router.get("/top-receivers", async (req, res) => {
    const excludedIds = [
        5, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 124
    ];
    try {
        const topReceivers = await give_help_1.GiveHelp.findAll({
            where: {
                status: "Completed",
                receiver_id: {
                    [Op.notIn]: excludedIds,
                },
            },
            attributes: [
                "receiver_id",
                [database_1.sequelize.fn("sum", database_1.sequelize.col("amount")), "total_received"],
            ],
            group: "receiver_id",
            order: [[database_1.sequelize.col("total_received"), "DESC"]],
            limit: 10,
            include: [
                {
                    association: "Receiver",
                    attributes: ["name", "username", "mobile_number"],
                },
            ],
        });
        res.json(topReceivers);
    }
    catch (error) {
        console.error("Failed to fetch top receivers:", error);
        res.status(500).send("Internal Server Error");
    }
});
exports.default = router;
