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
          attributes: ["name", "mobile_number","username"],
        },
        {
          model: User,
          as: "Receiver",
          attributes: ["name", "mobile_number","username"],
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

    if (transaction.amount==150.00) {
      if (transaction.priority!=null) {
        console.log("Transaction priority",transaction.priority);
        const priortyTransaction: any = await GiveHelp.findAll({
          where: {
            sender_id: transaction.sender_id,
            status:"initiate",
            priority:{
              [Op.ne]: null
            },
            amount:300
          },
        });
        if (priortyTransaction.length>0) {
          for (const entry of priortyTransaction) {
            await entry.destroy();
          }
        }
      }
    }else{
      if (transaction.priority!=null) {
        console.log("Transaction priority",transaction.priority);
        const priortyTransaction: any = await GiveHelp.findAll({
          where: {
            sender_id: transaction.sender_id,
            status:"initiate",
            priority:{
              [Op.ne]: null
            },
            alert:true,
            amount:amount
          },
        });
        if (priortyTransaction.length>0) {
          for (const entry of priortyTransaction) {
            await entry.destroy();
          }
        }
      }
    }

    const handleAlertEntries = async (amountToCheck: number, uplineAmount: number) => {
      console.log("handleAlertEntries", amountToCheck);
      
      const alertEntries: any = await GiveHelp.findAll({
        where: {
          receiver_id: transaction.sender_id,
          status: 'initiate',
          alert: true,
          amount: amountToCheck
        }
      });
    
      if (alertEntries.length > 0) {
        for (let entry of alertEntries) {
          entry.alert = false;
          entry.priority = null;
          await entry.save();
        }
    
        const uplineEntries: any = await GiveHelp.findAll({
          where: {
            sender_id: alertEntries[0].sender_id,
            receiver_id: {
              [Op.ne]: transaction.sender_id,
            },
            status: 'initiate',
            amount: amountToCheck,
            priority: {
              [Op.ne]: null,
            }
          }
        });

        console.log(amountToCheck);
        if (amountToCheck==300) {
          
          const splitAmountBetweenUsers:any = await GiveHelp.findAll({
            where:{
              sender_id: alertEntries[0].sender_id,
              status: 'initiate',
              priority: {
                [Op.ne]: null,
              },
              amount:150
            }
          })
          console.log("splitAmountBetweenUsers",splitAmountBetweenUsers.length);
          
          for(let alertEntry of splitAmountBetweenUsers){
            
            await UserTotals.findOne({where:{
              user_id: alertEntry.sender_id,
            }})
            .then(async (userTotals: any) => {
                if (userTotals) {
                  userTotals.initiated_transactions = parseFloat(userTotals.initiated_transactions.toString()) - 150;
                  await userTotals.save();
                }
              });
              await UserTotals.findOne({where:{
                user_id: alertEntry.receiver_id,
              }})
              .then(async (userTotals: any) => {
                  if (userTotals) {
                    userTotals.initiated_take = parseFloat(userTotals.initiated_take.toString()) - 150;
                    await userTotals.save();
                  }
                });
             await alertEntry.destroy();
          }

        }


        for (const entry of uplineEntries) {
          await UserTotals.findOne({where:{
            user_id: entry.receiver_id,
          }})
          .then(async (userTotals: any) => {
              if (userTotals) {
                userTotals.initiated_take = parseFloat(userTotals.initiated_take.toString()) - amountToCheck;
                await userTotals.save();
              }
            });
            await UserTotals.findOne({where:{
              user_id: entry.sender_id,
            }})
            .then(async (userTotals: any) => {
                if (userTotals) {
                  userTotals.initiated_transactions = parseFloat(userTotals.initiated_transactions.toString()) - amountToCheck;
                  await userTotals.save();
                }
              });
          await entry.destroy();
        }
      }
    };

    if (amount == 600) {
      await handleAlertEntries(300, 600);
      console.log("hello world");
      
    }
    if (amount == 1500) {
      await handleAlertEntries(600, 1500);
    }
    if (amount == 3000) {
      await handleAlertEntries(1500, 3000);
    }
    if (amount == 4000) {
      await handleAlertEntries(3000, 4000);
    }
    if (amount == 2000) {
      await handleAlertEntries(3000, 2000);
    }
    if (amount == 1000) {
      await handleAlertEntries(2000, 1000);
    }
 

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
        await createGiveHelpEntryForUpline(user.id, upline, 600);
      }
    } else {
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

    res.status(200).json({
      status:200,
      message: "Transaction completed successfully",
      transaction,
    });
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
  priority = 0
) => {
  try {
    console.log(`Entering createGiveHelpEntryForUpline with senderId: ${senderId}, amount: ${amount}, priority: ${priority}`);
    
    const defaultUser: any = await User.findOne({ where: { id: 5 } });
    if (!upline || !defaultUser) {
      throw new Error(`Default upline user with ID 5 not found`);
    }

    if (upline.referred_by) {
      const uplineUser: any = await User.findOne({ where: { id: upline.referred_by } });
      if (!uplineUser) {
        throw new Error(`Upline user with ID ${upline.referred_by} not found`);
      }

      const uplineUserTotals: any = await UserTotals.findOne({ where: { user_id: uplineUser.id } });
      const totalEarned = uplineUserTotals ? parseFloat(uplineUserTotals.total_received.toString()) : 0;

      console.log(`Upline user found: ${uplineUser.id}, totalEarned: ${totalEarned}`);

      const helpGive: any = await GiveHelp.findAll({ where: { sender_id: uplineUser.id, amount: amount, status: "Completed" } });
      const helpGiveCount = helpGive.length;

      console.log(`HelpGive entries found: ${helpGiveCount}`);

      if (helpGiveCount > 0) {
        if (amount == 4000) {
          await processGiveHelpEntry(senderId, uplineUser, defaultUser, amount, priority, totalEarned, helpGiveCount, 21900, 13900);
        } else if (amount == 3000) {
          await processGiveHelpEntry(senderId, uplineUser, defaultUser, amount, priority, totalEarned, helpGiveCount, 27900, 9900);
        } else {
          await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, false, priority);
        }
      } else {
        console.log(`No helpGive entries found. Processing default give help entry.`);
        await processDefaultGiveHelpEntry(senderId, uplineUser, defaultUser, amount, priority, totalEarned);
      }
    } else {
      console.log(`Upline user has no referred_by. Using default user.`);
      await createGiveHelpEntry(senderId, defaultUser.id, amount, defaultUser.upi_number, false, 1);
    }
  } catch (error) {
    console.error("Error in createGiveHelpEntryForUpline:", error);
  }
};

const processGiveHelpEntry = async (
  senderId: number,
  uplineUser: any,
  defaultUser: any,
  amount: number,
  priority: number,
  totalEarned: number,
  helpGiveCount: number,
  threshold1: number,
  threshold2: number
) => {
  console.log(`Processing give help entry for amount: ${amount}, helpGiveCount: ${helpGiveCount}, totalEarned: ${totalEarned}`);
  
  if ((helpGiveCount == 2 && totalEarned >= threshold1) || (helpGiveCount == 1 && totalEarned >= threshold2)) {
    console.log(`Conditions met for higher priority. Creating give help entry and proceeding up the chain.`);
    await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, true, priority);
    await createGiveHelpEntryForUpline(senderId, uplineUser, amount, priority + 1);
  } else {
    console.log(`Conditions not met. Splitting amount if priority > 0.`);
    if (priority > 0) {
      await splitAmountBetweenUsers(senderId, uplineUser, defaultUser, amount, priority);
    } else {
      await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, false, priority);
    }
  }
};

const processDefaultGiveHelpEntry = async (
  senderId: number,
  uplineUser: any,
  defaultUser: any,
  amount: number,
  priority: number,
  totalEarned: number
) => {
  console.log(`Processing default give help entry for amount: ${amount}, totalEarned: ${totalEarned}`);
  
  if ((amount == 600 && totalEarned >= 900) || 
      (amount == 1500 && totalEarned >= 3000) || 
      (amount == 2000 && totalEarned >= 31900) || 
      (amount == 1000 && totalEarned >= 33900)) {
    console.log(`Default conditions met. Creating give help entry and proceeding up the chain.`);
    await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, true, priority);
    await createGiveHelpEntryForUpline(senderId, uplineUser, amount, priority + 1);
  } else {
    console.log(`Default conditions not met. Splitting amount if priority >= 0.`);
    if (priority > 0) {
      await splitAmountBetweenUsers(senderId, uplineUser, defaultUser, amount, priority);
    } else {
      await createGiveHelpEntry(senderId, uplineUser.id, amount, uplineUser.upi_number, false, priority);
    }
  }
};

const splitAmountBetweenUsers = async (
  senderId: number,
  uplineUser: any,
  defaultUser: any,
  amount: number,
  priority: number
) => {
  console.log(`Splitting amount: ${amount} between uplineUser: ${uplineUser.id} and defaultUser: ${defaultUser.id}`);
  
  await createGiveHelpEntry(senderId, uplineUser.id, amount / 2, uplineUser.upi_number, false, priority);
  await createGiveHelpEntry(senderId, defaultUser.id, amount / 2, defaultUser.upi_number, false, priority);
};


export const getTotalmemberById = async (req: any, res: any) => {
  const userId = parseInt(req.params.id)
  const levelwisedata:any = await TeamSize.findOne({
    where: {
      user_id: userId
    }
  })
  let totalmember = 0
    totalmember += levelwisedata?.level1
    totalmember += levelwisedata?.level2
    totalmember += levelwisedata?.level3
    totalmember += levelwisedata?.level4
    totalmember += levelwisedata?.level5
    totalmember += levelwisedata?.level6
    totalmember += levelwisedata?.level7
    totalmember += levelwisedata?.level8
    totalmember += levelwisedata?.level9
    totalmember += levelwisedata?.level10
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



