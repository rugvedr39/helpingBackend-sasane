import { Model, QueryTypes, Sequelize } from "sequelize";
import { GiveHelp } from "../models/give_help";
import { User } from "../models/User";
import { sequelize } from "../config/database";
import { TeamSize } from "../models/TeamSize";
import { UserTotals } from "../models/UserTotals";
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

    let amount = parseFloat(transaction.amount);

    // Update sender's UserTotals
    let senderTotals:any = await UserTotals.findOne({ where: { user_id: transaction.sender_id } });
    if (senderTotals) {
      senderTotals.initiated_transactions = parseFloat(senderTotals.initiated_transactions.toString()) - amount;
      senderTotals.pending_transactions = parseFloat(senderTotals.pending_transactions.toString()) + amount;
      await senderTotals.save();
    } else {
      return res.status(404).json({ status: "Sender's totals not found" });
    }

    // Update receiver's UserTotals
    let receiverTotals:any = await UserTotals.findOne({ where: { user_id: transaction.receiver_id } });
    if (receiverTotals) {
      receiverTotals.initiated_take = parseFloat(receiverTotals.initiated_take.toString()) - amount;  // Adjust field name if necessary
      receiverTotals.pending_take = parseFloat(receiverTotals.pending_take.toString()) + amount;  // Adjust field name if necessary
      await receiverTotals.save();
    } else {
      return res.status(404).json({ status: "Receiver's totals not found" });
    }

    res.status(200).json({ message: "Transaction Updated" });
  } catch (error) {
    console.error("Failed to update UTR Number:", error);
    res.status(500).send("Error updating UTR Number");
  }
};

export const ReciveTransaction = async (req: any, res: any) => {
  const { id } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50; // Default limit of 50
  const offset = (page - 1) * limit;
  try {
    const { count, rows: transactions } = await GiveHelp.findAndCountAll({
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
      limit,
      offset,
      order: [['date', 'DESC']], // Sort by createdAt in descending order
    });

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      transactions,
      currentPage: page,
      totalPages,
      totalRecords: count,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to fetch transactions" });
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

    const amount = parseFloat(transaction.amount.toString());

await UserTotals.findOne({ where: { user_id: transaction.sender_id } }).then(async (userTotals: any) => {
  if (userTotals) {
    userTotals.total_sent = parseFloat(userTotals.total_sent.toString()) + amount;
    userTotals.pending_transactions = parseFloat(userTotals.pending_transactions.toString()) - amount;
    await userTotals.save();
  }
});

await UserTotals.findOne({ where: { user_id: transaction.receiver_id } }).then(async (userTotals: any) => {
  if (userTotals) {
    userTotals.total_received = parseFloat(userTotals.total_received.toString()) + amount;
    userTotals.pending_take = parseFloat(userTotals.pending_take.toString()) - amount;
    await userTotals.save();
  }
});

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
      const alertEntries:any = await GiveHelp.findAll({
        where: {
          receiver_id: transaction.sender_id,
          status: 'initiate',
          alert: true,
          amount:[transaction.amount,600.00,1500.00,3000.00,4000.00,4000.00,3000.00,2000.00,1000.00]
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
            amount:[transaction.amount,600.00,1500.00,3000.00,4000.00,4000.00,3000.00,2000.00,1000.00],
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
  const level = req.params.level ? parseInt(req.params.level, 10) : null;
  const page = req.query.page ? parseInt(req.query.page, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50; // Default limit of 50

  if (level !== null && (isNaN(level) || level < 1 || level > 10)) {
    return res.status(400).json({ message: "Invalid level. Level must be between 1 and 10." });
  }

  if (isNaN(page) || page < 1) {
    return res.status(400).json({ message: "Invalid page number. Page must be a positive integer." });
  }

  if (isNaN(limit) || limit < 1) {
    return res.status(400).json({ message: "Invalid limit. Limit must be a positive integer." });
  }

  try {
    const user: any = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const tree = await getReferralTreeLevels(user.id, level, page, limit);
    res.json(tree);
  } catch (error) {
    console.error("Error fetching referral tree:", error);
    res.status(500).json({ message: "Failed to fetch referral tree" });
  }
};

async function getReferralTreeLevels(userId: number, level: number | null = null, page: number, limit: number, maxLevel: number = 10) {
  const offset = (page - 1) * limit;
  const levelCondition = level !== null ? `AND cte.level = ${level}` : '';
  const maxLevelCondition = level !== null ? level : maxLevel;

  const query = `
    WITH RECURSIVE cte AS (
      SELECT 
        id,
        name,
        username,
        mobile_number,
        status,
        referred_by,
        1 AS level
      FROM Users
      WHERE referred_by = :userId
      UNION ALL
      SELECT 
        u.id,
        u.name,
        u.username,
        u.mobile_number,
        u.status,
        u.referred_by,
        cte.level + 1
      FROM Users u
      INNER JOIN cte ON cte.id = u.referred_by
      WHERE cte.level < :maxLevelCondition
    )
    SELECT 
      cte.*,
      referrer.name AS referrer_name,
      referrer.username AS referrer_username
    FROM cte
    LEFT JOIN Users referrer ON cte.referred_by = referrer.id
    WHERE cte.id != :userId ${levelCondition}
    ORDER BY cte.level, cte.id
    LIMIT :limit OFFSET :offset;
  `;

  const replacements = {
    userId,
    maxLevelCondition,
    limit,
    offset,
  };

  const referrals = await sequelize.query(query, {
    type: QueryTypes.SELECT,
    replacements,
  });

  if (level !== null) {
    // If a specific level is requested, prepare pagination info for that level
    return {
      level,
      count: referrals.length,
      users: referrals,
      currentPage: page,
      totalPages: Math.ceil(referrals.length / limit)
    };
  }

  // Group by level and include pagination information
  const result:any = referrals.reduce((acc, ref:any) => {
    if (!acc[ref.level]) {
      acc[ref.level] = { level: ref.level, count: 0, users: [] };
    }
    acc[ref.level].count++;
    acc[ref.level].users.push({
      id: ref.id,
      name: ref.name,
      username: ref.username,
      mobile_number: ref.mobile_number,
      status: ref.status,
      referred_by: ref.referred_by,
      referrer_name: ref.referrer_name,
      referrer_username: ref.referrer_username,
    });
    return acc;
  }, []);

  return {
    data: result.filter((levelData) => levelData.count > 0),
    currentPage: page,
    totalPages: Math.ceil(result.length / limit)
  };
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
  await UserTotals.findOne({ where: { user_id: senderId } }).then(async (userTotal: any) => {
    if (userTotal) {
      await userTotal.update({
        initiated_transactions:parseInt(userTotal.initiated_transactions) + amount,
      });
    }
  });
  await UserTotals.findOne({ where: { user_id: receiverId } }).then(async (userTotal: any) => {
    if (userTotal) {
      await userTotal.update({
        initiated_take: parseInt(userTotal.initiated_transactions) + amount,
      });
    }
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

export const getTotalmemberById = async (req: any, res: any) => {
  const userId = parseInt(req.params.id)
  const levelwisedata:any = await TeamSize.findOne({
    where: {
      user_id: userId
    }
  })
  let totalmember = 0
    totalmember += levelwisedata.level1
    totalmember += levelwisedata.level2
    totalmember += levelwisedata.level3
    totalmember += levelwisedata.level4
    totalmember += levelwisedata.level5
    totalmember += levelwisedata.level6
    totalmember += levelwisedata.level7
    totalmember += levelwisedata.level8
    totalmember += levelwisedata.level9
    totalmember += levelwisedata.level10
  res.status(200).json({status:200,data:totalmember})
}


export const getTotalmemberBylevelWise = async (req: any, res: any) => {
  const userId = parseInt(req.params.id)
  const levelwisedata:any = await TeamSize.findOne({
    where: {
      user_id: userId
    }
  })
  res.status(200).json({status:200,data:levelwisedata})
}


export const gettotals = async (req: any, res: any) => {
  const id = parseInt(req.params.id)
  const totals = await UserTotals.findOne({
    where: {
      user_id: id
    }
  })
  res.status(200).json({status:200,data:totals})
}