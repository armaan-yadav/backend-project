// require("dotenv").config({ path: "./env" });
import dotenv from "dotenv";
import { connectDB } from "./db/index.js";
dotenv.config({
  path: "./env",
});

connectDB();
/*
import express from "express";
const app = express();
const port = process.env.PORT;
//IFFE -> immdiately invoked function expression
(async () => {
  //always use try catch & async await for connecting DB
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    app.on("error", (error) => {
      console.log("Error : ", error);
      throw error;
    });
    app.listen(port, () => {
      console.log("Express app running on PORT : ", port);
    });
  } catch (error) {
    console.error("Error : ", error);
    throw error;
  }
})();

*/
