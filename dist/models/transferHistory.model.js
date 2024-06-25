"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferHistory = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const User_1 = require("./User");
class TransferHistory extends sequelize_1.Model {
}
exports.TransferHistory = TransferHistory;
TransferHistory.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    ePinId: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    transferredById: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
            model: User_1.User,
            key: "id",
        }
    },
    transferredToId: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
            model: User_1.User,
            key: "id",
        }
    },
    transferredAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
}, {
    sequelize: database_1.sequelize,
    modelName: "TransferHistory",
    tableName: "transfer_histories",
});
TransferHistory.belongsTo(User_1.User, { as: "TransferredByUser", foreignKey: "transferredById" });
TransferHistory.belongsTo(User_1.User, { as: "TransferredToUser", foreignKey: "transferredToId" });
