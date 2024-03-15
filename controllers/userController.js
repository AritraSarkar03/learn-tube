import { User } from "../models/User.js";
import { Course } from "../models/Course.js";
import { CatchAsyncError } from "../middlewares/CatchAsyncError.js";
import { sendToken } from "../utils/sendToken.js";
import ErrorHandler from "../utils/errorHandler.js";
import { sendEmail } from "../utils/sendEmail.js";
import getDataUri from "../utils/dataUri.js";
import cloudinary from "cloudinary";
import crypto from "crypto";
import { Stats } from "../models/Stats.js";

export const register = CatchAsyncError(async (req, res, next) => {
  const { name, email, password } = req.body;

  console.log(req.body); 
  const file = req.file;
  if (!name || !email || !password || !file)
    return next(new ErrorHandler("Please add all fields", 400));

  let user = await User.findOne({ email });

  if (user) return next(new ErrorHandler("User already exist", 409));

   const fileUri = getDataUri(file);
   const mycloud = await cloudinary.uploader.upload(fileUri.content);

   user = await User.create({
     name,
    password,
    email,
    avatar: {
      public_id: mycloud.public_id,
       url: mycloud.secure_url,
    },
   });

  sendToken(res, user, "Register Succesfully", 201);
});

export const login = CatchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    return next(new ErrorHandler("Please add all fields", 400));

  let user = await User.findOne({ email }).select("+password");

  if (!user)
    return next(new ErrorHandler("Incorrect Password or Email Id", 401));

  const isMatch = await user.comparePassword(password);

  if (!isMatch)
    return next(new ErrorHandler("Incorrect Password or Email Id", 400));

  sendToken(res, user, `Welcome back, ${user.name}`, 200);
});

export const logout = CatchAsyncError(async (req, res, next) => {
  res
    .status(200)
    .cookie("token", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
      secure: true,
      sameSite: "none",
    })
    .json({
      success: true,
      message: "Log out successfully",
    });
});

export const getMyProfile = CatchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  res.status(200).json({
    success: true,
    user,
  });
});

export const changePassword = CatchAsyncError(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword)
    return next(new ErrorHandler("Please add all fields", 400));

  const user = await User.findById(req.user._id).select("+password");

  const isMatch = await user.comparePassword(oldPassword);

  if (!isMatch) return next(new ErrorHandler("Incorrect old Password", 400));

  user.password = newPassword;

  user.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

export const updateProfile = CatchAsyncError(async (req, res, next) => {
  const { name, email } = req.body;

  const user = await User.findById(req.user._id);

  if (name) user.name = name;
  if (email) user.email = email;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
  });
});

export const updateProfilePic = CatchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  const file = req.file;
  const fileUri = getDataUri(file);

  await cloudinary.uploader.destroy(user.avatar.public_id);

  const mycloud = await cloudinary.uploader.upload(fileUri.content);

  user.avatar = {
    public_id: mycloud.public_id,
    url: mycloud.secure_url,
  };

  await user.save();

  res.status(200).json({
    success: true,
    message: "Profile picture updated successfully",
  });
});

export const forgetPassword = CatchAsyncError(async (req, res, next) => {
 
  const { email } = req.body;

  if (!email) return next(new ErrorHandler("Please add Email", 400));

  const user = await User.findOne({ email });
  if (!user) return next(new ErrorHandler("User not found", 400));

  const resetToken = await user.getResetToken();

  await user.save();

  const url = `${process.env.FRONTEND_URL}/resetpassword/${resetToken}`;
  const message = `Click on the link below. ${url}`;

  await sendEmail(user.email, "LearnTube Reset Password", message);

  res.status(200).json({
    success: true,
    message: `Reset token has been sent to ${user.email}`,
  });
});

export const resetPassword = CatchAsyncError(async (req, res, next) => {
  const { token } = req.params;
  const resetPasswordToken = crypto
  .createHash("sha256")
  .update(token)
  .digest("hex");
  
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: {
      $gt: Date.now(),
    },
  });
  
  if (!user) return next(new ErrorHandler("Token expired", 409));
  
  user.password = req.body.Password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  
  await user.save();
  
  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

export const addtoplaylist = CatchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  const course = await Course.findById(req.body.id);

  if (!course) return next(new ErrorHandler("Invalid Course Id", 404));

  const itemExists = user.playlist.find((item) => {
    if (item.course.toString() === course._id.toString()) return true;
  });

  if (itemExists) return next(new ErrorHandler("Item already exists", 409));

  user.playlist.push({
    course: course._id,
    poster: course.poster.url,
  });

  await user.save();

  res.status(200).json({
    success: true,
    message: "Added to playlist Successfully",
  });
});

export const removefromplaylist = CatchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  const course = await Course.findById(req.query.id);

  if (!course) return next(new ErrorHandler("Invalid Course Id", 404));
  const newPlaylist = user.playlist.filter((item) => {
    if (item.course.toString() !== course._id.toString()) return item;
  });

  user.playlist = newPlaylist;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Removed from playlist",
  });
});

export const getAllUsers = CatchAsyncError(async (req, res, next) => {
  const user = await User.find({});

  res.status(200).json({
    success: true,
    user,
  });
});

export const updateUserRole = CatchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) return next(new ErrorHandler("User not found", 404));

  if (user.role == "user") user.role = "admin";
  else user.role = "user";

  await user.save();

  res.status(200).json({
    success: true,
    message: "Role update successfully",
  });
});

export const deleteUserRole = CatchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) return next(new ErrorHandler("User not found", 404));

  user.role = "user";

  await user.save();

  res.status(200).json({
    success: true,
    message: "User role updated successfully",
  });
});

export const deleteMyProfile = CatchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) return next(new ErrorHandler("User not found", 404));

  await cloudinary.uploader.destroy(user.avatar.public_id);
  await User.deleteOne();

  res
    .status(200)
    .cookie("token", null, {
      expires: new Date(Date.now()),
    })
    .json({
      success: true,
      message: "User deleted successfully",
    });
});

User.watch().on("change", async () => {
  const stats = await Stats.find({}).sort({ createdAt: "desc" }).limit(1);

  const subscription = await User.find({ "subscription.status": "active" });

  stats[0].subscription = subscription.length;
  stats[0].users = await User.countDocuments();
  stats[0].createdAt = new Date(Date.now());

  // Use updateOne to update the existing document
  await Stats.updateOne({ _id: stats[0]._id }, stats[0]);
});

