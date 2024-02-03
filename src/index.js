import app from "./app.js";
import connectDb from "./db/index.js";
import dotenv from "dotenv";
dotenv.config({
  path: "./env",
});

connectDb()
  .then(() => {
    app.on("error", (error) => {
      console.log("Error  : ", error);
      throw error;
    });
    app.listen(process.env.PORT, () => {
      console.log("Express App running at PORT  : ", process.env.PORT);
    });
  })
  .catch((error) => {
    console.log("MongoDb connection Failed ,  ERROR : ", error);
  });

// import mongoose from "mongoose";
// import express from "express";
// const app = express();
// const port = process.env.PORT;
// const { DB_NAME, MONGODB_URI } = process.env;
// //IFFE -> immdiately invoked function expression
// (async () => {
//   //always use try catch & async await for connecting DB
//   try {
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//     app.on("error", (error) => {
//       console.log("Error : ", error);
//       throw error;
//     });
//     app.listen(port, () => {
//       console.log("Express app running on PORT : ", port);
//     });
//   } catch (error) {
//     console.error("Error : ", error);
//     throw error;
//   }
// })();
