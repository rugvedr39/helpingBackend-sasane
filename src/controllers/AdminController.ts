import { Request, Response } from "express";
import { User } from "../models/User";
import { Op } from "sequelize";
import { EPin } from "../models/epin.model";
import { TransferHistory } from "../models/transferHistory.model";
import sequelize from "sequelize";

export class AdminController {
  public async listUsers(req: Request, res: Response) {
    const page: number = parseInt(req.query.page as string) || 1;
    const limit: number = parseInt(req.query.limit as string) || 10;
    const search: string = (req.query.search as string) || "";

    try {
      const users = await User.findAndCountAll({
        where: {
          username: {
            [Op.like]: `%${search}%`,
          },
        },
        include: [
          {
            model: User,
            as: "Referrer",
            attributes: ["username", "name"],
          },
        ],
        order: [["createdAt", "ASC"]],
        offset: (page - 1) * limit,
        limit: limit,
      });

      return res.status(200).json({
        total: users.count,
        totalPages: Math.ceil(users.count / limit),
        currentPage: page,
        users: users.rows,
      });
    } catch (error: any) {
      return res.status(500).json({
        message: "Error retrieving users",
        error: error.message,
      });
    }
  }

  public async UsersCount(req: Request, res: Response) {
    try {
      const totalUsers = await User.count();
      const totalActiveUsers = await User.count({
        where: { status: "active" },
      });
      const totalNotActiveUsers = await User.count({
        where: { status: "notActive" },
      });
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      const totalUserjoinedToday = await User.count({
        where: {
          createdAt: {
            [Op.between]: [startOfToday, endOfToday],
          },
        },
      });
      res.status(200).json({
        totalUsers: totalUsers,
        totalActiveUsers: totalActiveUsers,
        totalNotActiveUsers: totalNotActiveUsers,
        totalUserjoinedToday: totalUserjoinedToday,
      });
    } catch (error) {
      console.error("Error fetching user counts:", error);
      throw error;
    }
  }

  public updateUserDetails = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, mobile_number, upi_number,password } = req.body;

      // Find the user by ID
      const user: any = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update user details
      user.name = name || user.name;
      user.mobile_number = mobile_number || user.mobile_number;
      user.upi_number = upi_number || user.upi_number;
      user.password = password || user.password;

      // Save the updated user
      await user.save();

      res.json({ message: "User updated successfully", user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  };

  public getEPinHistoryWithPagination = async (req: Request, res: Response) => {
    const { page = 1, pageSize = 10, search = "" } = req.query;

    const offset =
      (parseInt(page as string) - 1) * parseInt(pageSize as string);

    try {
      let whereClause = {};
      let includeClause: any = [
        { model: User, as: "UsedBy" },
        { model: User, as: "TransferredBy" },
        {
          model: TransferHistory,
          as: "TransferHistory",
          include: [
            { model: User, as: "TransferredByUser" },
            { model: User, as: "TransferredToUser" },
          ],
        },
      ];

      if (typeof search === "string" && search.length > 0) {
        if (search.startsWith("sf")) {
          includeClause.unshift({
            model: User,
            as: "User",
            where: {
              username: {
                [Op.like]: `%${search.substring(2)}%`,
              },
            },
          });
        } else {
          whereClause = {
            code: {
              [Op.like]: `%${search}%`,
            },
          };
          includeClause.unshift({ model: User, as: "User" });
        }
      } else {
        includeClause.unshift({ model: User, as: "User" });
      }      

      const epins: any = await EPin.findAndCountAll({
        where: whereClause,
        offset,
        limit: parseInt(pageSize as string),
        order: [["createdAt", "DESC"]], // Add sorting here
        include: includeClause,
      });

      const epinHistory = epins.rows.map((epin) => {
        const createdBy = epin.User ? epin.User.get() : null;
        const usedBy = epin.UsedBy ? epin.UsedBy.get() : null;
        const transferredBy = epin.TransferredBy
          ? epin.TransferredBy.get()
          : null;
        const transferHistory = epin.TransferHistory.map((history) => ({
          transferredBy: history.TransferredByUser
            ? history.TransferredByUser.get()
            : null,
          transferredTo: history.TransferredToUser
            ? history.TransferredToUser.get()
            : null,
          transferredAt: history.transferredAt,
        }));

        let creator;
        if (transferHistory.length > 0) {
          creator = transferHistory[0].transferredBy;
        } else {
          creator = createdBy;
        }

        return {
          ePinCode: epin.code,
          createdAt: epin.createdAt,
          creator,
          usedBy,
          transferredBy,
          transferHistory,
        };
      });

      const totalPages = Math.ceil(epins.count / parseInt(pageSize as string));

      res.json({
        data: epinHistory,
        currentPage: parseInt(page as string),
        totalPages,
        totalItems: epins.count,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  public getEPinCounts = async (req: Request, res: Response) => {
    try {
      const { date } = req.query;
  
      let whereClause = {};
      if (date && typeof date === 'string') {
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
          whereClause = {
            createdAt: {
              [Op.gte]: new Date(parsedDate.setHours(0, 0, 0, 0)),
              [Op.lt]: new Date(parsedDate.setHours(23, 59, 59, 999))
            }
          };
        } else {
          return res.status(400).json({ error: 'Invalid date format' });
        }
      }
  
      const totalEPins = await EPin.count();
      const usedEPins = await EPin.count({ where: { status: "used" } });
  
      let dateFilteredCounts = [];
      if (Object.keys(whereClause).length > 0) {
        dateFilteredCounts = await EPin.findAll({
          where: whereClause,
          attributes: [
            [sequelize.fn("COUNT", sequelize.col("id")), "count"],
          ],
        });
      }
  
      const createdEPinsByDate = await EPin.findAll({
        where: whereClause,
        attributes: [
          [sequelize.fn("DATE", sequelize.col("createdAt")), "date"],
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        group: ["date"],
        order: [["date", "DESC"]],
      });
  
      res.json({
        totalEPins,
        usedEPins,
        createdEPinsByDate,
        dateFilteredCounts: dateFilteredCounts.length > 0 ? dateFilteredCounts[0].dataValues.count : 0,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
