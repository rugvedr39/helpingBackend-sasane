import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database"; // Adjust this path according to your setup
import { User } from "./User"; // Adjust this path according to your setup
class TeamSize extends Model {}

TeamSize.init(
  {
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
    },
    team_size: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    level1: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    level2: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
      level3: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    level4: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    level5: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    level6: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    level7: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    level8: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    level9: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    level10: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    }
  },
  {
    sequelize,
    modelName: "TeamSize", // Use "TeamSize" for model name
    tableName: "teamSizes",
    timestamps: false, // No timestamps needed for this table
  }
);

export { TeamSize };
