import express from "express";
import {
  createBulkEPin,
  transferEPin,
  getUserUnusedEPins,
  getUserUsedEPins,
  getEPinTransferReport
} from "../controllers/epin.controller";

const router = express.Router();
router.post("/createEpin", createBulkEPin);
router.post("/TransferEpin", transferEPin);
router.post("/TransferEpinReport", getEPinTransferReport);
router.get("/getUnusedEPinReport/:id", getUserUnusedEPins);
router.get("/getUsedEPinReportByUser/:id", getUserUsedEPins);

export default router;
