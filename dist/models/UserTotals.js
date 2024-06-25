"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserTotals = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const User_1 = require("./User");
class UserTotals extends sequelize_1.Model {
}
exports.UserTotals = UserTotals;
UserTotals.init({
    user_id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        references: {
            model: User_1.User,
            key: 'id'
        }
    },
    total_received: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    total_sent: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    total_transactions: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    initiated_transactions: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    pending_transactions: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    completed_transactions: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    pending_take: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    initiated_take: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    }
}, {
    sequelize: database_1.sequelize,
    modelName: 'UserTotals',
    tableName: 'UserTotals',
    timestamps: false
});
User_1.User.hasOne(UserTotals, { foreignKey: 'user_id' });
UserTotals.belongsTo(User_1.User, { foreignKey: 'user_id' });
