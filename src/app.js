import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true })); //for solving cors problem
app.use(express.json({ limit: "16kb" })); //allowing express to handle json  data
app.use(express.urlencoded({ extended: true, limit: "16kb" })); //for enciodng the data in url => armaan+yadav || armaan%20yadav
app.use(express.static("public")); //allows us to store files from server statically in *public* folder
app.use(cookieParser()); //allows server to access and perform CRUD operations on browser cookies

//routes import
import userRouter from "./routes/user.routes.js";

//routes declaration
app.use("/api/v1/users", userRouter); //https://localhost:8000/users/xyz => userRouter(xyz)

export default app;
