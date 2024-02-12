import { User } from "../models/user.models.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
export const verifyJwt = asyncHandler(async (req, _, next) => {
  try {
    const accessToken =
      req.cookies?.accessToken /*browser*/ ||
      req.header("Authorization")?.replace("Bearer ", ""); //mobile//

    console.log(req.cookies);
    if (!accessToken) {
      throw new ApiError(401, "Unauthorized Access");
    }

    const decodedToken = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id).select(
      "-password -accessToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
