import { User } from '../models/User.js'  // Import the User model
import { CatchAsyncError } from "../middlewares/CatchAsyncError.js";
import { Course } from "../models/Course.js";
import getDataUri from "../utils/dataUri.js";
import ErrorHandler from "../utils/errorHandler.js";
import cloudinary from "cloudinary";
import { Stats } from "../models/Stats.js";
import { admin } from "../server.js";
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";

export const getAllCourses = CatchAsyncError(async (req, res, next) => {
  const keyword = req.query.keyword || "";
  const category = req.query.category || "";

  const courses = await Course.find({
    title: {
     $regex: keyword,
    $options: "i",
 },
 category: {
   $regex: category,
    $options: "i",
    },
 }).select("-lectures");

   res.status(200).json({
     success: true,
     courses,
   }
  );
});

 

export const createCourse = CatchAsyncError(async (req, res, next) => {
  const { title, description, category, createdBy } = req.body;

  if (!title || !description || !category || !createdBy)
    return next(new ErrorHandler("Please add all fields", 400));

  const file = req.file;

  const fileUri = getDataUri(file);

  const mycloud = await cloudinary.uploader.upload(fileUri.content);


  await Course.create({
    title,
    description,
    category,
    createdBy,
    poster: {
      public_id: mycloud.public_id,
      url: mycloud.secure_url,
    },
  });


  res.status(201).json({
    success: true,
    message: "Course created successfully.",
  });
});

export const getCourseLectures = CatchAsyncError(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) return next(new ErrorHandler("Course not found", 404));

  const user = await User.findById(req.user._id);

  if(user.role !== 'admin') course.views += 1;

  await course.save();

  res.status(201).json({
    success: true,
    lectures: course.lectures,
  });
});

import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid'; // For unique filenames
import crypto from 'crypto'; // To create a hash

export const addLectures = CatchAsyncError(async (req, res, next) => {
  const { title, description } = req.body;
  const course = await Course.findById(req.params.id);
  if (!course) return next(new ErrorHandler("Course not found", 404));

  const rawFile = req.file;
  const file = getDataUri(rawFile);

  if (!file || !file.content) {
    return next(new ErrorHandler("File processing error", 400));
  }

  try {
    // Generate a hash of the file content for duplicate checking
    const fileBuffer = Buffer.from(file.content.split(',')[1], 'base64');
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Check if a lecture with this hash already exists
    const existingLecture = course.lectures.find(lecture => lecture.video && lecture.video.hash === fileHash);
    if (existingLecture) {
      return next(new ErrorHandler("This video has already been uploaded.", 400));
    }

    const storage = getStorage();
    const filePath = `lectures/${uuidv4()}_${rawFile.originalname}`;
    const storageRef = ref(storage, filePath);

    const snapshot = await uploadString(storageRef, file.content, "data_url");
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log("File download URL:", downloadURL);

    course.lectures.push({
      title,
      description,
      video: { 
        url: downloadURL,
        hash: fileHash,
      },
    });

    course.numOfVideos = course.lectures.length;

    await course.save();

    res.status(201).json({
      success: true,
      message: "Lectures added successfully",
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    next(error);
  }
});

export const deleteCourse = CatchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const course = await Course.findById(req.params.id);

  if (!course) return next(new ErrorHandler("Course not found", 404));

  await cloudinary.uploader.destroy(course.poster.public_id);

  for (let i = 0; i < course.lectures.length; i++) {
    const singleLecture = course.lectures[i];

    const storage = getStorage();
    const videoRef = ref(storage, singleLecture.video.url);
    await deleteObject(videoRef);
  }
  
  await course.deleteOne();

  res.status(200).json({
    success: true,
    message: "Course deleted successfully",
  });
});

export const deleteLecture = CatchAsyncError(async (req, res, next) => {
  const { courseId, lectureId } = req.query;

  const course = await Course.findById(courseId);
  if (!course) return next(new ErrorHandler("Course not found", 404));

  const singleLecture = course.lectures.find(lecture => lecture._id.toString() === lectureId.toString());
  if (!singleLecture) return next(new ErrorHandler("Lecture not found", 404));

  try {
    // Ensure the storage instance is properly initialized
    const storage = getStorage();
    const videoRef = ref(storage, singleLecture.video.url);
    console.log('Video Reference:', videoRef); // Debugging info

    // Attempt to delete the video
    await deleteObject(videoRef);
    console.log('Video deleted successfully'); // Debugging info
  } catch (error) {
    console.error('Error deleting video:', error); // Log the actual error
    return next(new ErrorHandler("Failed to delete video", 500));
  }

  course.lectures = course.lectures.filter(lecture => lecture._id.toString() !== lectureId.toString());
  course.numOfVideos = course.lectures.length;

  await course.save();

  res.status(200).json({
    success: true,
    message: "Lecture deleted successfully",
  });
});

Course.watch().on("change", async (change) => {
    const stats = await Stats.find({}).sort({ createdAt: "desc" }).limit(1);
    const courses = await Course.find({});
    let totalViews = 0;
    for (let i = 0; i < courses.length; i++) {
      totalViews += courses[i].views;
    }
    stats[0].views = totalViews;
    stats[0].createdAt = new Date(Date.now());
    await stats[0].save();
});
