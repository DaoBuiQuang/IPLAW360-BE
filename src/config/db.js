import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config(); // Load biến môi trường từ file .env

export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    logging: false,
  }
);

// Kết nối cơ sở dữ liệu
export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to MySQL database using Sequelize");
  } catch (error) {
    console.error("❌ MySQL connection error:", error);
  }
};
