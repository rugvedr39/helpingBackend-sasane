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
}
