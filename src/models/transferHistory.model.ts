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
    },
    transferredToId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
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

User.hasMany(TransferHistory, { foreignKey: "transferredById", as: "TransfersMade" });
User.hasMany(TransferHistory, { foreignKey: "transferredToId", as: "TransfersReceived" });
EPin.hasMany(TransferHistory, { foreignKey: "ePinId" });
TransferHistory.belongsTo(User, { as: "transferredBy", foreignKey: "transferredById" });
TransferHistory.belongsTo(User, { as: "transferredTo", foreignKey: "transferredToId" });
TransferHistory.belongsTo(EPin, { foreignKey: "ePinId" });

export { TransferHistory };