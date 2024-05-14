import { Model, Sequelize } from "sequelize";
import { GiveHelp } from "../models/give_help";
import { User } from "../models/User";
import { EPin } from "../models/epin";

export const getTransaction = async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const transaction = await GiveHelp.findAll({
      where: { sender_id: id },
      include: [
        {
          model: User,
          as: "Sender",
          attributes: ["name", "mobile_number"],
        },
        {
          model: User,
          as: "Receiver",
          attributes: ["name", "mobile_number"],
        },
      ],
    });
    res.status(200).json(transaction);
  } catch (error) {
    console.log(error);
  }
};

export const updateTransaction = async (req: any, res: any) => {
  const { transactionId, utrNumber } = req.body;
  try {
    const transaction: any = await GiveHelp.findByPk(transactionId);
    if (!transaction) {
      return res.status(404).send("Transaction not found");
    }
    transaction.utrNumber = utrNumber;
    const epin = await EPin.findOne({
      where: { code: utrNumber, status: "unused" },
    });
    if (transaction.amount == 100.0) {
      if (!epin) {
        transaction.status = "Pending";
        await transaction.save();
      } else {
        transaction.status = "Completed";
        await transaction.save();
        epin.status = "used";
        epin.usedById = transaction.sender_id;
        epin.save();
      }
    } else {
      transaction.status = "Pending";
      await transaction.save();
    }
    res.status(200).send("UTR Number updated successfully");
  } catch (error) {
    console.error("Failed to update UTR Number:", error);
    res.status(500).send("Error updating UTR Number");
  }
};

export const ReciveTransaction = async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const transaction = await GiveHelp.findAll({
      where: { receiver_id: id },
      include: [
        {
          model: User,
          as: "Sender",
          attributes: ["name", "mobile_number"],
        },
        {
          model: User,
          as: "Receiver",
          attributes: ["name", "mobile_number"],
        },
      ],
    });
    res.status(200).json(transaction);
  } catch (error) {
    console.log(error);
  }
};

export const TransactionComplete = async (req: any, res: any) => {
  const { id } = req.params;

  try {
    const transaction: any = await GiveHelp.findByPk(id);

    if (!transaction) {
      return res.status(404).send("Transaction not found");
    }

    transaction.status = "Completed";
    await transaction.save();

    const completedTransactions: any = await GiveHelp.findAll({
      where: {
        sender_id: transaction.sender_id,
        status: "Completed",
      },
    });

    const totalAmount = completedTransactions.reduce(
      (sum: any, t: any) => sum + parseFloat(t.amount),
      0,
    );

    let level = 0;
    if (totalAmount >= 50000) level = 9;
    else if (totalAmount >= 80200) level = 8;
    else if (totalAmount >= 50200) level = 7;
    else if (totalAmount >= 30200) level = 6;
    else if (totalAmount >= 15200) level = 5;
    else if (totalAmount >= 7200) level = 4;
    else if (totalAmount >= 3200) level = 3;
    else if (totalAmount >= 1200) level = 2;
    else if (totalAmount >= 600) level = 1;

    let user: any = await User.findOne({
      where: { id: transaction.sender_id },
    });

    user.level = level;
    user = await user.save();

    if (level === 1) {
      const rs300: any = await GiveHelp.findOne({
        where: {
          sender_id: transaction.sender_id,
          amount: 300.0,
          status: "Completed",
        },
      });

      if (rs300) {
        let upline: any = await User.findOne({
          where: { id: rs300.receiver_id },
        });

        await createGiveHelpEntryForUpline(user.id, upline, 600, level);
      }
    } else {
      let upline: any = await User.findOne({
        where: { id: transaction.receiver_id },
      });

      await createGiveHelpEntryForUpline(
        transaction.sender_id,
        upline,
        level === 2
          ? 2000
          : level === 3
            ? 4000
            : level === 4
              ? 8000
              : level === 5
                ? 15000
                : level === 6
                  ? 20000
                  : level === 7
                    ? 30000
                    : level === 8
                      ? 50000
                      : 0,
        level,
      );
    }

    res.status(200).json("done");
  } catch (error) {
    console.error("Failed to update UTR Number:", error);
    res.status(500).send("Error updating UTR Number");
  }
};
export const getReferralTree = async (req: any, res: any) => {
  const userId = parseInt(req.params.id, 10);

  try {
    const user: any = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const tree = await getBinaryTreeLevels(user.id);
    res.json(tree);
  } catch (error) {
    console.error("Error fetching referral tree:", error);
    res.status(500).json({ message: "Failed to fetch referral tree" });
  }
};

async function getBinaryTreeLevels(userId: any, maxLevel = 10) {
  let result: any[] = [];
  let queue = [{ userId: userId, level: 0 }];

  while (queue.length > 0) {
    let current: any = queue.shift();
    if (current.level > maxLevel) {
      break;
    }

    let user: any = await User.findByPk(current.userId);
    if (!user) continue;
    if (!result[current.level]) {
      result[current.level] = { level: current.level, count: 0, users: [] };
    }
    result[current.level].count++;
    result[current.level].users.push({
      id: user.id,
      name: user.name,
      email: user.email,
      mobile_number: user.mobile_number,
      status: user.status,
    });
    if (current.level < maxLevel) {
      let children: any = await User.findAll({
        where: { referred_by: user.id },
      });

      children.forEach((child: any) => {
        queue.push({ userId: child.id, level: current.level + 1 });
      });
    }
  }
  return result.filter((level) => level.count > 0);
}

async function createGiveHelpEntry(
  senderId: any,
  receiverId: any,
  amount: any,
  upi: any,
) {
  console.log("in the createGiveHelpEntry");
  await GiveHelp.create({
    sender_id: senderId,
    receiver_id: receiverId,
    amount: amount,
    status: "initiate",
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 8),
    upiId: upi,
    utrNumber: "",
  });
}

const createGiveHelpEntryForUpline = async (
  senderId: any,
  upline: any,
  amount: any,
  level: any,
) => {
  if (upline && upline.referred_by) {
    const uplineUser: any = await User.findOne({
      where: { id: upline.referred_by },
    });

    if (uplineUser.level >= level) {
      await createGiveHelpEntry(
        senderId,
        uplineUser.id,
        amount,
        uplineUser.upi_number,
      );
    } else {
      await createGiveHelpEntryForUpline(senderId, uplineUser, amount, level);
    }
  } else {
    const defaultUplineUser: any = await User.findOne({
      where: { id: 5 },
    });
    await createGiveHelpEntry(
      senderId,
      defaultUplineUser.id,
      amount,
      "rugvedr39@okicici",
    );
  }
};
