"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const TeamSize_1 = require("./TeamSize");
class User extends sequelize_1.Model {
}
exports.User = User;
User.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    username: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        unique: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    level: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
    },
    main_referred_by: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
    },
    email: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
    },
    password: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    referral_code: {
        type: sequelize_1.DataTypes.STRING(10),
        unique: true,
    },
    referred_by: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
    },
    mobile_number: {
        type: sequelize_1.DataTypes.STRING(15),
        allowNull: false,
    },
    bank_details: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
    },
    upi_number: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
    },
    status: {
        type: sequelize_1.DataTypes.STRING(20), // Adjust the length based on your status values
        allowNull: false,
        defaultValue: "notActive", // Default status is active
    },
}, {
    sequelize: database_1.sequelize,
    tableName: "Users",
    modelName: "User",
    timestamps: true,
});
User.belongsTo(User, { as: "Referrer", foreignKey: "referred_by" });
User.addHook('afterCreate', async (user, options) => {
    await updateTeamSizesForAncestors(user.id);
});
// Function to update team sizes for ancestors
async function updateTeamSizesForAncestors(userId) {
    let currentUserId = userId;
    for (let level = 1; level <= 10; level++) {
        // Find the current user and get their referrer
        const currentUser = await User.findByPk(currentUserId);
        if (!currentUser || !currentUser.referred_by)
            break;
        const referrerId = currentUser.referred_by;
        // Find or create the TeamSize record for the referrer
        const [teamSizeRecord, created] = await TeamSize_1.TeamSize.findOrCreate({
            where: { user_id: referrerId },
            defaults: {
                team_size: 0,
                level1: 0, level2: 0, level3: 0, level4: 0,
                level5: 0, level6: 0, level7: 0, level8: 0,
                level9: 0, level10: 0
            }
        });
        if (created) {
            // If the record was created, initialize counts
            await TeamSize_1.TeamSize.update({ team_size: 1, [`level${level}`]: 1 }, { where: { user_id: referrerId } });
        }
        else {
            // If the record exists, increment counts
            await TeamSize_1.TeamSize.increment({ team_size: 1, [`level${level}`]: 1 }, { where: { user_id: referrerId } });
        }
        // Move up the referral chain
        currentUserId = referrerId;
    }
}
