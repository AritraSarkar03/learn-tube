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

admin.initializeApp({
  credential: admin.credential.cert({
    "type": "service_account",
    "project_id": "lucky-essence-416908",
    "private_key_id": "47a61257b020e14f40e43a27e057012d95234f30",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCTs6pbxN2l91Kt\ntOkn7AGU9mnXcUDtilfqogrWhops+mEBAqmdZ9PIJMATwYYTNjxS1qCzvp46D/Gl\ndAsCRsM13KttksHb1vpcMh2QldZKEyGhldByor56zPfALVkko51nPBLtNfFJ/Klf\n6vVYb+esZU2i1mQf7eoe3GQQgufTLjyS6cbDGfsM6wskHC8w7MfGUjQyA/yoPZ61\nIEh6FHAubG/Mirqr+HEoXGBIqaoVfdCT+L31sO5qPK91wAZD0b+GeWMD6Fd5EzE4\n6v/zayXi3TCHQEyJFgZnO9WBfHOvrrV7HfYPIrsRqyDCV3+huqybQZqx4hvs5JpT\nvczBFPtbAgMBAAECggEAKa8BS4/WG9IeR76wNF+THLakLTSdpcwuvp2HoH5sz4+j\n07SsKKuWJbxVZt3tWDusr5Y52TBZGDrKsC59MuHEks1Zpf1Ob5wOoPlVxam7xcD7\nc05D+y45wo9Y9if2KfRw5iMalk5sb7x6EoNNRW2jfNBEJkoKDMbIlXgOV2iSQ1Mx\nvA4FRMZmO2anU3HI8lE9YaNLV6JU4TJD7bqDzrDvnKAPiw591Jwnw7fMzYgTiSda\n/98jZLXzZMtPvEQh11EOqdpbOKPdd49oIod5cfOwNQY/pyhEL6G11rNIS2zizUsu\n3LzmsqOcOJ6QppQLE+kOZGPjx0KiAbYjHP+P6wRgEQKBgQDOOBxMJDUOV7wPFuVK\n103koRgv1aTrLPCfeZ7HsvhX+4iDkC8w3WrXblTI+esjd6cu3gCscUQT+RMWdkdf\n+VD/9bJ7RDZoVf/5qOWGTlCXfkcCbsNug0ABkKLkH9khzb9B+pb3KSrR679K29gU\nZqU+DuzleEF6pp8rlqgxkKJtMQKBgQC3W0+twL9cCQrEE5DlW+wx0EfdjRN+wCpp\nu9JQfWiseMr+EYvWuJSVymVfMNXHNA76I538d4cBOodGRl/ruB6n7Q5WtPXC76gf\n/Cd/SUeCn/ydyd7vM34e6M+Pc7ZLAgbB8rwAYPbI3D9Zger9lNeSQJaBtMDM14MM\nky1/ThdeSwKBgQC9BRNy+1EiZ2q6Dgt38Se1o6+O0O5MnjGki47tju8xfh5gMT4A\nNUPkWX4fhWxxYxB71gOaDGwRPqGvWhUMNHN5WhUSBbE1K3bouVZBJ/GZGqct5Kb/\n2hBGHvQf081rvbJMYMwVmsdkCQmbLS2/bWKTIo0jvHmQWb/V7U8Xt3IaUQKBgHX4\nY/2RBA39K1YYmKNZT1CFh5d+S0rD7QX2eEydQ5mkZkatl2FhhQgTHsHuM71lOzWp\ncN6dMNmThLGsWc7Zua+lkBItf+oaM/vQSsFUrpPWx7vlxG/2m3DbrZ/IfUMpXJuw\nx1EfEekN/BxkwILDHyfUMoHlgB7Lkl+m2iEMZ3CdAoGAJXxof/IGy6Vru+GAHddP\n6D8oOWk/tQ4d+wHKF2tXjG5RxDne0TxJzrAVQNc4WO8HBNgowZNo+Gc8/MtahOB5\nuKQhLqolcf0XdmDRZqa2kKgiomQN6o8NHftqsSIcsQ3peOOx5ipduj9YN0LMT5lc\n6qCOHw2p4+GLq8vUavCvlH8=\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-oas0s@lucky-essence-416908.iam.gserviceaccount.com",
    "client_id": "100932942594989244085",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-oas0s%40lucky-essence-416908.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
  }), // Provide the path to your service account key file
  storageBucket: 'gs://lucky-essence-416908.appspot.com' // Replace with your Firebase Storage bucket URL
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


