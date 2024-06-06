import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { User } from './User';

class UserTotals extends Model {}

UserTotals.init({
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  total_received: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  total_sent: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  total_transactions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  initiated_transactions: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  pending_transactions: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  completed_transactions: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  pending_take:{
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  initiated_take:{
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  }
}, {
  sequelize,
  modelName: 'UserTotals',
  tableName: 'UserTotals',
  timestamps: false
});

User.hasOne(UserTotals, { foreignKey: 'user_id' });
UserTotals.belongsTo(User, { foreignKey: 'user_id' });

export { UserTotals };
