import { User } from "../models/user.models.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); //turns off the validation => wont check for password, email etc

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating Access or Refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  /*       #Registering a user
  take credentials  //
  validate the above //
  check in DB if user already exists!! : username and email both //
  check for images : avatar //
  upload images on cloudinary and extract the related URL //
  --data saara hai mere paas
  create a user object and create an entry in mongo db //
  remove password and refresh token field as we dont want to expose them to frontend //
  check for reponse : user  is created or not //
  if user created then return reponse //
  DONE
   */
  //taking data from frontend
  const { username, email, fullName, password } = req.body;
  // console.log(email, username, fullName, password);
  // console.log(req.body);

  //validation
  //--------for empty field
  if (
    [username, email, fullName, password].some((value) => value.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  //--------for  email
  if (!email.includes("@")) {
    throw new ApiError(400, "@ is required in email address");
  }

  //check for already existing user
  const userExists = await User.findOne({
    $or: [{ username }, { email }],
  });

  // console.log(userExists);
  if (userExists) {
    throw new ApiError(409, "User with same username or email already exists"); //???
  }

  //check for file upload
  //--------file upload on local server
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path ||"";

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }
  //upload on cloudinary

  const avatarCloudinaryUrl = await uploadOnCloudinary(avatarLocalPath);
  const coverImageCloudinaryUrl = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatarCloudinaryUrl) {
    throw new ApiError(400, "Avatar file not uploaded on cloudinary");
  }

  // create entry in mongodb
  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatarCloudinaryUrl.url,
    coverImage: coverImageCloudinaryUrl?.url || "",
  });

  // increases database calls but makes it foolproof --> can be more optimized but abhi nayi kia !!
  //checks if the user is created in db or not
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken" // removes the password and refreshToken => BEKAR SYNTAX HAIII BHTTTT
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  //generate the response and return it
  // console.log("req.body : ", req.body);
  // console.log("req.files : ", req.files);
  // console.log("user : ", user);
  return res
    .status(201)
    .json(new ApiResponse("User registered Successfully", 201, createdUser));
});

const loginUser = asyncHandler(async (req, res) => {
  /*        #login user
  take credentials
  validate credentials
  check if username or email exists in db else ask to register
  if user exists then check password
  generate access and refresh token
  if password is correct then login the user (session create karooo)
  DONE
   */
  //take credentials
  const { username, email, password } = req.body;

  // console.log(req.body);
  if (!username) {
    throw new ApiError(400, "username  is required");
  }

  //find user in db
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  // user => returned by the db on finding
  // User =>a mongoose object
  if (!user) {
    throw new ApiError(404, "User does not exist. Register karo beyy");
  }
  // user found => check for password
  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid Password");
  }

  //generate tokens
  const { refreshToken, accessToken } = await generateAccessAndRefreshToken(
    user._id
  );
  // optional step : calling db again to get a new object and modify it so that it could be sent to frontend

  const loggedInUser = await User.findOne(user._id).select(
    "-password -refreshToken"
  );

  //setting up cookies
  const options = {
    //by default cookies are modifiable from frontend but making http and secure true makes it
    // editable only from server side
    httpOnly: true,
    secure: true,
  };

  //returning response and cookies
  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse("user logged in successfully", 200, {
        user: loggedInUser,
        accessToken,
        refreshToken,
      })
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  //add logout functinality => refer to previous commit
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    { new: true } //returns the new value instead of the  old one
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new ApiResponse("User loggedout successfully", 200, {}));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token expired");
    }

    const { newRefreshToken, accessToken } =
      await generateAccessAndRefreshToken(user._id);

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("refreshToken", newRefreshToken, options)
      .cookie("accessToken", accessToken, options)
      .json(
        new ApiResponse("Access Token refreshed", 200, {
          accessToken,
          refreshToken: newRefreshToken,
        })
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  //take credentials -> oldP, newP, confirmP
  //password change => user already logged in hai
  // get user id from req.user
  // get user from database
  //validate given password and user's password
  //user.password = newP
  //user.save({validateBeforeSave : false})
  // return res.status().json()

  const { oldPassword, newPassword, confirmPassword } = req.body;
  if (!oldPassword || oldPassword == "") {
    throw new ApiError(401, "Old password is required");
  }

  const user = await User.findById(req?.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Incorrect old password");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(401, "Old and confirm password do not match");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: true });

  return res
    .status(200)
    .json(new ApiResponse("Password changed successfully", 200, {}));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized Request");
  }
  return res
    .status(200)
    .json(new ApiResponse("User found successfully", 200, req.user));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  //update the account details
  // take input from user what we want to update -> res.body
  // validate the above input
  //get current user id and use User.findByIdAndUpdate()
  //return response //

  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new ApiError(402, "At least one field is required to update");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse("User updated successfully", 200, updatedUser));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatarCloudinary = await uploadOnCloudinary(avatarLocalPath);
  if (!avatarCloudinary.url) {
    throw new ApiError(400, "Error while uploading file on cloudninary");
  }
  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatarCloudinary.url,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse("Avatar updated successfully", 200, updatedUser));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing");
  }

  const coverImageCloudinary = await uploadOnCloudinary(coverImageLocalPath);
  if (coverImageCloudinary.url) {
    throw new ApiError(400, "Error while uploading on cloudinary");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImageCloudinary.url,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse("Cover image updated successfully", 200, updatedUser)
    );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing");
  }

  //aggregation pipelines start //
  // aggregate pipeline returns array of obj
  const channel = await User.aggregate([
    {
      //stage1
      //filters all the collection in databse and only passes
      // the collections where username is equal to given username
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      //stage2
      //finding the number of subscribers of channel
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      //stage3
      //finding the number of channels user is subscribed to
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      //stage4
      //adding new fields  : channelSubscribers , channelsSubscribedTo , isSubscribed to original user obj
      $addFields: {
        channelSubscribersCount: {
          $size: "$subscribers", //using $ bcoz subscribers is now a field
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo", //using $ bcoz subscribedTo is now a field
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            theb: true,
            else: false,
          },
        },
      },
    },
    {
      //only projects the values which are  marked as 1 -> rexduces traffic
      $project: {
        fullName: 1,
        username: 1,
        email: 1,
        channelSubscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
      },
    },
  ]);
  if (!channel?.length) {
    throw new ApiError(404, "channel does not exist");
  }
  return res
    .status(200)
    .json(new ApiResponse("channel fetched successfully", 200, channel[0]));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
};
