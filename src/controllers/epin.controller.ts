// controllers/epin.controller.ts
import { Request, Response } from "express";
import { EPin } from "../models/epin";
import { User } from "../models/User";

export const getUsedEPinReportByUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const usedEPins = await EPin.findAll({
      where: {
        status: "used",
        userId: id,
      },
      include: [
        {
          model: User,
          as: "usedBy",
          attributes: ["name"],
        },
      ],
    });
    res.json(usedEPins);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getUnusedEPinReport = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const unusedEPins = await EPin.findAll({
      where: {
        status: "unused",
        userId: id,
      },
    });
    res.json(unusedEPins);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getTransferredEPinReport = async (req: Request, res: Response) => {
  const { transferredById } = req.body;
  try {
    const transferredEPins = await EPin.findAll({
      where: {
        transferredById: transferredById,
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["name"],
        },
      ],
    });
    res.json(transferredEPins);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const transferEPin = async (req: Request, res: Response) => {
  const { code, transferredById, transferredtoId } = req.body;

  try {
    const epin = await EPin.findOne({ where: { code } });

    if (!epin) {
      return res.status(404).json({ error: "E-Pin not found" });
    } else {
      if (epin.userId != transferredById) {
        return res.status(404).json({ error: "E-Pin not found for the User" });
      }
    }

    if (epin.status !== "unused") {
      return res
        .status(400)
        .json({ error: "E-Pin is already used or transferred" });
    }

    epin.status = "transferred";
    epin.userId = transferredtoId;
    epin.transferredById = transferredById;
    await epin.save();

    res.json({ message: "E-Pin transferred successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    console.log(error);
  }
};

export const createBulkEPins = async (req: Request, res: Response) => {
  const { count, userId } = req.body;
  try {
    const uniqueCodes = new Set<string>();
    while (uniqueCodes.size < count) {
      const code = generateUniqueCode();
      uniqueCodes.add(code);
    }
    const epinsToCreate: any[] = Array.from(uniqueCodes).map((code) => ({
      code,
      userId,
      status: "unused",
    }));

    const createdEPins = await EPin.bulkCreate(epinsToCreate);

    res.status(200).json({
      message: `${createdEPins.length} E-Pins created successfully`,
      data: createdEPins,
    });
  } catch (error) {
    console.error("Error creating E-Pins:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const generateUniqueCode = () => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};
