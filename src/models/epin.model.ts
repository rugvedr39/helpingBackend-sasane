import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";
import { User } from "./User";
import { TransferHistory } from "./transferHistory.model"; // Import TransferHistory

class EPin extends Model{}

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
  }
);

EPin.belongsTo(User, { foreignKey: "userId" }); // Add this line
EPin.belongsTo(User, { as: "UsedBy", foreignKey: "usedById" });
EPin.belongsTo(User, { as: "TransferredBy", foreignKey: "transferredById" });

EPin.hasMany(TransferHistory, { foreignKey: 'ePinId', as: 'TransferHistory' });



const checkEpinValidity = async (epinCode: string): Promise<boolean> => {
  const epin = await EPin.findOne({ where: { code: epinCode, status: ["unused", "transferred"] } });
  return epin ? true : false;
};

const useEpin = async (epinCode: string, userId: number): Promise<void> => {
  const epin = await EPin.findOne({ where: { code: epinCode, status: ["unused", "transferred"] } });
  if (epin) {
    await epin.update({ status: "used", usedById: userId });
  } else {
    throw new Error("Invalid epin or epin cannot be used.");
  }
};

export { EPin, checkEpinValidity, useEpin };