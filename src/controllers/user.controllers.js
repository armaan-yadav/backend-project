import { User } from "../models/user.models.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
const registerUser = asyncHandler(async (req, res) => {
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
    username: username,
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
  console.log("req.body : ", req.body);
  console.log("req.files : ", req.files);
  console.log("user : ", user);
  return res
    .status(201)
    .json(new ApiResponse("User registered Successfully", 201, createdUser));
});

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

export { registerUser };
