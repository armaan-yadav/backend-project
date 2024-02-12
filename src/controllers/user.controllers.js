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
  const isPasswordCorrect = user.isPasswordCorrect(password);

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
export { registerUser, loginUser, logoutUser, refreshAccessToken };
