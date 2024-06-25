"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamSize = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database"); // Adjust this path according to your setup
class TeamSize extends sequelize_1.Model {
}
exports.TeamSize = TeamSize;
TeamSize.init({
    user_id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
    },
    team_size: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        defaultValue: 0,
    },
    level1: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        defaultValue: 0,
    },
    level2: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        defaultValue: 0,
    },
    level3: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        defaultValue: 0,
    },
    level4: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        defaultValue: 0,
    },
    level5: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        defaultValue: 0,
    },
    level6: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        defaultValue: 0,
    },
    level7: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        defaultValue: 0,
    },
    level8: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        defaultValue: 0,
    },
    level9: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        defaultValue: 0,
    },
    level10: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        defaultValue: 0,
    }
}, {
    sequelize: database_1.sequelize,
    modelName: "TeamSize", // Use "TeamSize" for model name
    tableName: "teamSizes",
    timestamps: false, // No timestamps needed for this table
});
