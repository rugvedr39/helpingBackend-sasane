import express,{ Request, Response } from "express";
import {
  getTransaction,
  updateTransaction,
  ReciveTransaction,
  TransactionComplete,
  getReferralTree,
  getTotalmemberById,
  getTotalmemberBylevelWise,
  gettotals
} from "../controllers/giveHelpController";
const { Op } = require("sequelize");
import { GiveHelp } from "../models/give_help";
import { sequelize } from "../config/database";
import { UserTotals } from "../models/UserTotals";
import { User } from "../models/User";
const router = express.Router();
router.get("/get-transaction/:id", getTransaction);
router.get("/recive-transaction/:id", ReciveTransaction);
router.post("/post-completed", updateTransaction);
router.get("/transaction-completed/:id", TransactionComplete);
router.get("/tree/:id/:level", getReferralTree);
router.get("/getReferralTreeSize/:id", getTotalmemberById);
router.get("/getTotalmemberBylevelWise/:id", getTotalmemberBylevelWise);
router.get("/gettotals/:id", gettotals);

router.get("/top-receivers", async (req, res) => {
  const excludedIds = [
    5, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95,124
  ];

  try {
    const topReceivers = await GiveHelp.findAll({
      where: {
        status: "Completed",
        receiver_id: {
          [Op.notIn]: excludedIds,
        },
      },
      attributes: [
        "receiver_id",
        [sequelize.fn("sum", sequelize.col("amount")), "total_received"],
      ],
      group: "receiver_id",
      order: [[sequelize.col("total_received"), "DESC"]],
      limit: 10,
      include: [
        {
          association: "Receiver",
          attributes: ["name", "username", "mobile_number"],
        },
      ],
    });

    res.json(topReceivers);
  } catch (error) {
    console.error("Failed to fetch top receivers:", error);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
