import { Request, Response } from "express";
import { User } from "../models/User";
import { Op } from "sequelize";

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
}
