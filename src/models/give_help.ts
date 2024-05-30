import { Model, DataTypes } from 'sequelize';
import {sequelize} from '../config/database';
import { User } from './User';

class GiveHelp extends Model {}

GiveHelp.init({
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  receiver_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  upiId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  utrNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  alert: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  priority: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  }
}, {
  sequelize,
  modelName: 'GiveHelp',
  tableName: 'give_help',
  timestamps:false
});

User.hasMany(GiveHelp, { foreignKey: 'sender_id' });
GiveHelp.belongsTo(User, { as: 'Sender', foreignKey: 'sender_id' });
GiveHelp.belongsTo(User, { as: 'Receiver', foreignKey: 'receiver_id' });

export { GiveHelp };
