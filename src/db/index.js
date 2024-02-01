import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

export const connectDB = async () => {
  try {
    const connectinInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(
      "MongoDB connected :) \n Host DB : ",
      connectinInstance.connection.host
    );
  } catch (error) {
    console.error("MongoDB connection failed ", error);
    process.exit(1);
  }
};
