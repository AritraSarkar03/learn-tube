import express from "express";
import {
  addLectures,
  createCourse,
  deleteCourse,
  getAllCourses,
  getCourseLectures,
} from "../controllers/courseControllers.js";
import singleUpload from "../middlewares/multer.js";
import { IsAuthenticated, authorizeAdmin } from "../middlewares/Auth.js";

const router = express.Router();

router.route("/courses")
      .get(getAllCourses);

router
  .route("/createcourse")
  .post(IsAuthenticated, authorizeAdmin, singleUpload, createCourse);

router
  .route("/course/:id")
  .get(IsAuthenticated, getCourseLectures)
  .post(IsAuthenticated, authorizeAdmin, singleUpload, addLectures)
  .delete(IsAuthenticated, authorizeAdmin, deleteCourse);

  router.route("/lecture/:id").delete(IsAuthenticated, authorizeAdmin, singleUpload, deleteCourse)

export default router;
