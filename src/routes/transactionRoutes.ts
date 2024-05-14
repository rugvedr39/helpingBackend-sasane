import express from "express";
import {
  getTransaction,
  updateTransaction,
  ReciveTransaction,
  TransactionComplete,
  getReferralTree,
} from "../controllers/giveHelpController";
const router = express.Router();
router.get("/get-transaction/:id", getTransaction);
router.get("/recive-transaction/:id", ReciveTransaction);
router.post("/post-completed", updateTransaction);
router.get("/transaction-completed/:id", TransactionComplete);
router.get("/tree/:id", getReferralTree);

export default router;
