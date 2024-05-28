import express from "express";
import {
  getTransaction,
  updateTransaction,
  ReciveTransaction,
  TransactionComplete,
  getReferralTree,
} from "../controllers/giveHelpController";
const { Op } = require("sequelize");
import { GiveHelp } from "../models/give_help";
import { sequelize } from "../config/database";
const router = express.Router();
router.get("/get-transaction/:id", getTransaction);
router.get("/recive-transaction/:id", ReciveTransaction);
router.post("/post-completed", updateTransaction);
router.get("/transaction-completed/:id", TransactionComplete);
router.get("/tree/:id", getReferralTree);

router.get("/top-receivers", async (req, res) => {
  try {
    const topReceivers = await GiveHelp.findAll({
      where: {
        status: "Completed",
        [Op.ne]: [
          5, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191,
          192,
        ],
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
