import { Model, DataTypes } from 'sequelize';
import {sequelize} from '../config/database';
import { GiveHelp } from './give_help';

class User extends Model {
    public id!: number;
    public username!: string;
    public name!:string
    public email!: string;
    public password!: string;
    public referral_code!: string;
    public referred_by!: number;
    public mobile_number!: string;
    public bank_details!: string;
    public upi_number!: string;
    public status!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

User.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        username: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
        },
        name:{
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        level:{
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 0
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        referral_code: {
            type: DataTypes.STRING(10),
            unique: true,
        },
        referred_by: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
        },
        mobile_number: {
            type: DataTypes.STRING(15),
            allowNull: false,
            unique: true,
        },
        bank_details: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        upi_number: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true,
        },
        status: {
            type: DataTypes.STRING(20), // Adjust the length based on your status values
            allowNull: false,
            defaultValue: 'notActive', // Default status is active
        },
    },
    {
        sequelize,
        tableName: 'Users',
        modelName: 'User',
        timestamps: true,
    }
);


export { User };
