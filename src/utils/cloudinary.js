import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      console.log("LocalFilePath does not exist");
      return null;
    }
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // console.log("File uploaded SUCCESSFULLY on Cloudinary , ", response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    //could not upload file on cloudinary as going to remove it from temporary storage
    fs.unlinkSync(localFilePath);
  }
};
