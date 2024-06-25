"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiveHelp = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const User_1 = require("./User");
class GiveHelp extends sequelize_1.Model {
}
exports.GiveHelp = GiveHelp;
GiveHelp.init({
    sender_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User_1.User,
            key: 'id'
        }
    },
    receiver_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User_1.User,
            key: 'id'
        }
    },
    amount: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    status: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false
    },
    time: {
        type: sequelize_1.DataTypes.TIME,
        allowNull: false
    },
    upiId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    utrNumber: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    alert: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    priority: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null
    }
}, {
    sequelize: database_1.sequelize,
    modelName: 'GiveHelp',
    tableName: 'give_help',
    timestamps: false
});
User_1.User.hasMany(GiveHelp, { foreignKey: 'sender_id' });
GiveHelp.belongsTo(User_1.User, { as: 'Sender', foreignKey: 'sender_id' });
GiveHelp.belongsTo(User_1.User, { as: 'Receiver', foreignKey: 'receiver_id' });
