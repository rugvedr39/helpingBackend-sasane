import { Sequelize } from "sequelize";
import * as fs from "fs";
import * as path from "path";


const sequelize = new Sequelize({
  database: "sasane-Helping",
  username: "avnadmin",
  password: "AVNS_MxiCAok9qWwo32w6PTI",
  host: "mysql-13248809-rugvedr39-2562.l.aivencloud.com",
  port: 19638,
  dialect: "mysql",
  logging: false,
  dialectOptions: {
    ssl: {
      ca: fs.readFileSync(path.resolve(__dirname, "./ca.pem")).toString(),
    },
  },
});

// const sequelize = new Sequelize({
//   database: "sasane-Helping",
//   username: "root",
//   password: "8600988002",
//   host: "127.0.0.1",
//   port: 3306,
//   dialect: "mysql",
//   logging: false,
// });

// Test the database connection
async function testDatabaseConnection(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log(
      "Connection to the database has been established successfully.",
    );
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
}

export { sequelize, testDatabaseConnection };
