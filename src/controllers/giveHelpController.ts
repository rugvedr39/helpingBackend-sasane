import { Model, Sequelize } from "sequelize";
import { GiveHelp } from "../models/give_help";
import { User } from "../models/User";
import { EPin } from "../models/epin";
const { Op } = require("sequelize");

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
      return res.status(404).json({ status: "Transaction not found" });
    }
    transaction.utrNumber = utrNumber;
      transaction.status = "Pending";
      await transaction.save();
    res.status(200).json({ message: "Transaction Updated" });
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

export const TransactionComplete = async (req, res) => {
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

    // Filter and limit transactions of 300 to only count the first two
    const transactions300: any = completedTransactions
      .filter((t: any) => parseFloat(t.amount) === 300)
      .slice(0, 2);
    const amount300: any = transactions300.reduce(
      (sum, t) => sum + parseFloat(t.amount),
      0,
    );

    // Calculate the total amount including a maximum of two 300 transactions
    const totalAmount: any =
      completedTransactions.reduce(
        (sum, t: any) =>
          sum + (parseFloat(t.amount) !== 300 ? parseFloat(t.amount) : 0),
        0,
      ) + amount300;

    let level = 0;
    if (totalAmount >= 19700) level = 9;
    else if (totalAmount >= 18700) level = 8;
    else if (totalAmount >= 16700) level = 7;
    else if (totalAmount >= 13700) level = 6;
    else if (totalAmount >= 9700) level = 5;
    else if (totalAmount >= 5700) level = 4;
    else if (totalAmount >= 2700) level = 3;
    else if (totalAmount >= 1200) level = 2;
    else if (totalAmount >= 600) level = 1;

    let user: any = await User.findOne({
      where: { id: transaction.sender_id },
    });
    user.level = level;
    if (totalAmount >= 600) {
      user.status = "Active";
    }
    await user.save();
    if (level === 1) {
      console.log("user level is", level);
      const rs300: any = await GiveHelp.findOne({
        where: {
          sender_id: transaction.sender_id,
          amount: 300.0,
          status: "Completed",
          receiver_id: {
            [Op.ne]: 5, // Exclude receiver_id 5
          },
        },
      });

      if (rs300 != null) {
        let upline: any = await User.findOne({
          where: { id: rs300.receiver_id },
        });

        upline = await User.findOne({
          where: { id: upline.referred_by },
        });

        await createGiveHelpEntryForUpline(user.id, upline, 600, 2);
      }
    } else {
      console.log("in else block of alertEntries");
      
      const alertEntries:any = await GiveHelp.findAll({
        where: {
          receiver_id: transaction.sender_id,
          status: 'initiate',
          alert: true,
          amount:transaction.amount
        }
      });
  
      for (let entry of alertEntries) {
        entry.alert = false;
        entry.priority = null;
        await entry.save();
        const uplineEntries = await GiveHelp.findAll({
          where: {
            id:{
              [Op.ne]: entry.id,
            },
            sender_id: entry.sender_id,
            status: 'initiate',
            amount:transaction.amount,
            priorty:!null
          }
        });
        for (const entry of uplineEntries) {
          await entry.destroy();
        }
      }
      let upline: any = await User.findOne({
        where: { id: transaction.receiver_id },
      });

      if (user.level > 1 && user.level < 9) {
        await createGiveHelpEntryForUpline(
          transaction.sender_id,
          upline,
          level === 2
            ? 1500
            : level === 3
              ? 3000
              : level === 4
                ? 4000
                : level === 5
                  ? 4000
                  : level === 6
                    ? 3000
                    : level === 7
                      ? 2000
                      : level === 8
                        ? 1000
                        : 0,
          level,
        );
      }
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

async function getBinaryTreeLevels(userId, maxLevel = 10) {
  let result = [];
  let queue = [{ userId: userId, level: 0 }];

  while (queue.length > 0) {
    let current = queue.shift();
    if (current.level > maxLevel) {
      break;
    }

    let user: any = await User.findByPk(current.userId);
    if (!user) continue;

    if (!result[current.level]) {
      result[current.level] = { level: current.level, count: 0, users: [] };
    }
    result[current.level].count++;

    // Fetch additional details about the person who referred this user
    let referrer = null;
    if (user.referred_by) {
      referrer = await User.findByPk(user.referred_by, {
        attributes: ["id", "name", "username"],
      });
    }

    result[current.level].users.push({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      mobile_number: user.mobile_number,
      status: user.status,
      referred_by: user.referred_by,
      referrer_name: referrer ? referrer.name : null,
      referrer_username: referrer ? referrer.username : null,
    });

    if (current.level < maxLevel) {
      let children = await User.findAll({
        where: { referred_by: user.id },
      });

      children.forEach((child: any) => {
        queue.push({ userId: child.id, level: current.level + 1 });
      });
    }
  }
  return result.filter((level) => level.count > 0);
}

// create createGiveHelpEntry
async function createGiveHelpEntry(
  senderId: any,
  receiverId: any,
  amount: any,
  upi: any,
  alert:boolean,
  priority:number
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
    alert: alert,
    priority: priority
  });
}

const createGiveHelpEntryForUpline = async (
  senderId: number,
  upline: any,
  amount: number,
  level: number,
  priority=0
) => {
  try {
    if (upline && upline.referred_by) {
      const uplineUser: any | null = await User.findOne({ where: { id: upline.referred_by } });
      if (!uplineUser) {
        throw new Error(`Upline user with ID ${upline.referred_by} not found`);
      }
        if (uplineUser.level > level) {
          await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, false, priority);
        } else {
          console.log("called the else block");
          await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, true, priority);
          await createGiveHelpEntryForUpline(senderId, uplineUser, amount, level, priority + 1);
        }
    } else {
      const defaultUplineUser: any | null = await User.findOne({ where: { id: 5 } });
      if (!defaultUplineUser) {
        throw new Error(`Default upline user with ID 5 not found`);
      }
      await createGiveHelpEntry(senderId, defaultUplineUser.id, amount, "7558395974@ybl", false,1);
    }
  } catch (error) {
    console.error("Error in createGiveHelpEntryForUpline:", error);
  }
};