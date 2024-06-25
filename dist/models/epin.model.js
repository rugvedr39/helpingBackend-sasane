"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useEpin = exports.checkEpinValidity = exports.EPin = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const User_1 = require("./User");
const transferHistory_model_1 = require("./transferHistory.model"); // Import TransferHistory
class EPin extends sequelize_1.Model {
}
exports.EPin = EPin;
EPin.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    code: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
        unique: true,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM("unused", "used", "transferred"),
        allowNull: false,
        defaultValue: "unused",
    },
    usedById: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
    },
    transferredById: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
    },
}, {
    sequelize: database_1.sequelize,
    modelName: "EPin",
    tableName: "epins",
});
EPin.belongsTo(User_1.User, { foreignKey: "userId" }); // Add this line
EPin.belongsTo(User_1.User, { as: "UsedBy", foreignKey: "usedById" });
EPin.belongsTo(User_1.User, { as: "TransferredBy", foreignKey: "transferredById" });
EPin.hasMany(transferHistory_model_1.TransferHistory, { foreignKey: 'ePinId', as: 'TransferHistory' });
const checkEpinValidity = async (epinCode) => {
    const epin = await EPin.findOne({ where: { code: epinCode, status: ["unused", "transferred"] } });
    return epin ? true : false;
};
exports.checkEpinValidity = checkEpinValidity;
const useEpin = async (epinCode, userId) => {
    const epin = await EPin.findOne({ where: { code: epinCode, status: ["unused", "transferred"] } });
    if (epin) {
        await epin.update({ status: "used", usedById: userId });
    }
    else {
        throw new Error("Invalid epin or epin cannot be used.");
    }
};
exports.useEpin = useEpin;
