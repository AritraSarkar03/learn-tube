import { CatchAsyncError } from "../middlewares/CatchAsyncError.js";
import { Course } from "../models/Course.js";
import getDataUri from "../utils/dataUri.js";
import ErrorHandler from "../utils/errorHandler.js";
import cloudinary from "cloudinary";
import { Stats } from "../models/Stats.js";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import admin from 'firebase-admin';


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

  course.views += 1;

  await course.save();

  res.status(201).json({
    success: true,
    lectures: course.lectures,
  });
});
//max video size 100mb


export const addLectures = CatchAsyncError(async (req, res, next) => {
  const { title, description } = req.body;
  const course = await Course.findById(req.params.id);
  if (!course) return next(new ErrorHandler("Course not found", 404));

  const rawFile = req.file;
  const file = getDataUri(rawFile);
  const storage = getStorage();

  const filePath = `lectures/${rawFile.originalname}`;
  
  const storageRef = ref(storage, filePath);

  uploadString(storageRef, file.content, "data_url")
    .then((snapshot) => {
      console.log("Uploaded a blob or file:", snapshot);
      
      return getDownloadURL(snapshot.ref);
    })
    .then((downloadURL) => {
      console.log("File download URL:", downloadURL);

      course.lectures.push({
        title,
        description,
        video: { 
          url: downloadURL,
        },
      });

      course.numOfVideos = course.lectures.length;

      return course.save();
    })
    .then(() => {
      res.status(201).json({
        success: true,
        message: "Lectures added successfully",
      });
    })
    .catch((error) => {
      console.error("Error uploading file:", error);
      next(error);
    });
});



export const deleteCourse = CatchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const course = await Course.findById(req.params.id);

  if (!course) return next(new ErrorHandler("Course not found", 404));

  await cloudinary.uploader.destroy(course.poster.public_id);

  for (let i = 0; i < course.lectures.length; i++) {
    const singleLecture = course.lectures[i];

    await cloudinary.uploader.destroy(singleLecture.video.public_id, {
      resource_type: "video",
    });
  }

  await course.deleteOne();

  res.status(200).json({
    success: true,
    message: "Course deleted successfully",
  });
});

const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Replace newlines
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://your-storage-bucket-url' // Replace with your Firebase Storage bucket URL
});

const storage = admin.storage();

export const deleteLecture = CatchAsyncError(async (req, res, next) => {
  const { courseId, lectureId } = req.query;

  const course = await Course.findById(courseId);

  if (!course) return next(new ErrorHandler("Course not found", 404));

  const singleLecture = course.lectures.find(lecture => lecture._id.toString() === lectureId.toString());

  if (!singleLecture) return next(new ErrorHandler("Lecture not found", 404));


  try {
    await storage.bucket().file(singleLecture.video.public_id).delete();
  } catch (error) {
    return next(new ErrorHandler("Failed to delete video from Firebase Storage", 500));
  }

  course.lectures = course.lectures.filter(lecture => lecture._id.toString() !== lectureId.toString());

  course.numOfVideos = course.lectures.length;

  await course.save();

  res.status(200).json({
    success: true,
    message: "Lecture deleted successfully",
  });
});


 Course.watch().on("change", async () => {
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


