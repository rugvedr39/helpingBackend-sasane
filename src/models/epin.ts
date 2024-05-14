// models/epin.model.ts
import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";
import { User } from "./User";

interface EPinAttributes {
  id: number;
  code: string;
  status: "unused" | "used" | "transferred";
  usedById?: number | null;
  transferredById?: number | null;
  userId: number; // Add this line
  createdAt?: Date;
  updatedAt?: Date;
}

interface EPinCreationAttributes
  extends Optional<
    EPinAttributes,
    "id" | "usedById" | "transferredById" | "createdAt" | "updatedAt"
  > {}

class EPin
  extends Model<EPinAttributes, EPinCreationAttributes>
  implements EPinAttributes
{
  public id!: number;
  public code!: string;
  public status!: "unused" | "used" | "transferred";
  public usedById!: number | null;
  public transferredById!: number | null;
  public userId!: number; // Add this line
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

EPin.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM("unused", "used", "transferred"),
      allowNull: false,
      defaultValue: "unused",
    },
    usedById: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: User,
        key: "id",
      },
    },
    transferredById: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "EPin",
    tableName: "epins",
  },
);

User.hasMany(EPin, { foreignKey: "userid" });
EPin.belongsTo(User, { as: "user", foreignKey: "userid" });
User.hasMany(EPin, { foreignKey: "usedById" });
EPin.belongsTo(User, { as: "usedBy", foreignKey: "usedById" });

export { EPin };
