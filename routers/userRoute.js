import express from "express";
import {
  addtoplaylist,
  changePassword,
  deleteMyProfile,
  deleteUserRole,
  forgetPassword,
  getAllUsers,
  getMyProfile,
  login,
  logout,
  register,
  removefromplaylist,
  resetPassword,
  updateProfile,
  updateProfilePic,
  updateUserRole,
} from "../controllers/userController.js";
import { IsAuthenticated, authorizeAdmin } from "../middlewares/Auth.js";
import singleUpload from "../middlewares/multer.js";

const router = express.Router();

router.route("/register").post(singleUpload, register);

router.route("/login").post(login);

router.route("/logout").get(logout);

router.route("/me").get(IsAuthenticated, getMyProfile);
 
router.route("/me").delete(IsAuthenticated, deleteMyProfile);

router.route("/changepassword").put(IsAuthenticated, changePassword);

router.route("/updateprofile").put(IsAuthenticated, updateProfile);

router
  .route("/updateprofilepic")
  .put(IsAuthenticated, singleUpload, updateProfilePic);

router.route("/resetpassword/:token").put(resetPassword);

router.route("/forgetpassword").put(forgetPassword);

router.route("/addtoplaylist").post(IsAuthenticated, addtoplaylist);

router.route("/removefromplaylist").delete(IsAuthenticated, removefromplaylist);

router.route("/admin/users").get(IsAuthenticated, authorizeAdmin, getAllUsers);

router.route("/admin/users/:id").put(IsAuthenticated,updateUserRole).delete(IsAuthenticated, authorizeAdmin, deleteUserRole);

export default router;
