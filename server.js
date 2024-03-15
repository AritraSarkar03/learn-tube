import app from "./app.js";
import { connectDB } from "./config/database.js";
import cloudinary from 'cloudinary';
import RazorPay from 'razorpay';
import nodeCron from "node-cron";
import { Stats } from "./models/Stats.js"
import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes } from "firebase/storage";



 connectDB();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLIENT_NAME,
    api_key: process.env.CLOUDINARY_CLIENT_API,
    api_secret: process.env.CLOUDINARY_CLIENT_SECRET,
});

const firebaseConfig = {
    apiKey: "AIzaSyBSj-7jYSz1F5QXaMD9G_2wSUmP572tMq8",
    authDomain: "lucky-essence-416908.firebaseapp.com",
    projectId: "lucky-essence-416908",
    storageBucket: "lucky-essence-416908.appspot.com",
    messagingSenderId: "107695337771",
    appId: "1:107695337771:web:102624724dddd494c2556e",
    measurementId: "G-4TVX1HWQVB"
};

// Initialize Firebase
initializeApp(firebaseConfig);




export const instance = new RazorPay({
    key_id: process.env.RAZORPAY_API_KEY,
    key_secret: process.env.RAZORPAY_API_SECRET,
});

nodeCron.schedule("0 0 0 1 * *", async ()=>{
    try {
        await Stats.create({});
    } catch (error) {
        console.log(error);
    }
});

app.listen(process.env.PORT,()=>{
    console.log(`Server is working on port: ${process.env.PORT}`);
});