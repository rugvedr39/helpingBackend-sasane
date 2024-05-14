import express from "express";
import {
  createBulkEPins,
  transferEPin,
  getTransferredEPinReport,
  getUnusedEPinReport,
  getUsedEPinReportByUser,
} from "../controllers/epin.controller";

const router = express.Router();
router.post("/createEpin", createBulkEPins);
router.post("/TransferEpin", transferEPin);
router.post("/TransferEpinReport", getTransferredEPinReport);
router.get("/getUnusedEPinReport/:id", getUnusedEPinReport);
router.get("/getUsedEPinReportByUser/:id", getUsedEPinReportByUser);

export default router;
