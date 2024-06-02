import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";
import { User } from "./User";
import { EPin } from "./epin.model";

class TransferHistory extends Model{}

TransferHistory.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    ePinId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    transferredById: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      }
    },
    transferredToId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      }
    },
    transferredAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "TransferHistory",
    tableName: "transfer_histories",

  }
);

TransferHistory.belongsTo(User, { as: "TransferredByUser", foreignKey: "transferredById" });
TransferHistory.belongsTo(User, { as: "TransferredToUser", foreignKey: "transferredToId" });

export { TransferHistory };