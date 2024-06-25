"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const epin_controller_1 = require("../controllers/epin.controller");
const router = express_1.default.Router();
router.post("/createEpin", epin_controller_1.createBulkEPin);
router.post("/TransferEpin", epin_controller_1.transferEPin);
router.post("/TransferEpinReport/:userId", epin_controller_1.getEPinTransferReport);
router.get("/getUnusedEPinReport/:id", epin_controller_1.getUserUnusedEPins);
router.get("/getUsedEPinReportByUser/:id", epin_controller_1.getUserUsedEPins);
exports.default = router;
