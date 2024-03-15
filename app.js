import  express  from "express";
import { config } from 'dotenv';
import course from './routers/courseRoutes.js'
import user from './routers/userRoute.js'
import ErrorMiddleWare from "./middlewares/Error.js";
import cookieParser from "cookie-parser";
import payment from "./routers/paymentRoutes.js";
import other from "./routers/otherRoutes.js";
import cors from 'cors';

config({
    path:"./config/.env"
});

const app =  express();

//Middlewares
app.use(express.json());
app.use(express.urlencoded({
    extended: true,
}));
app.use(cookieParser());
app.use(cors({
    origin:process.env.FRONTEND_URL,
    credentials:true,
    methods:["GET","POST","PUT","DELETE"],
}));


app.use('/api/v1', course);
app.use('/api/v1', user);
app.use('/api/v1', payment);
app.use('/api/v1', other);

export default app;

app.get("/",(req,res)=>res.send(`<h1>Server is working. Click <a href=${process.env.FRONTEND_URL}>here</a> to visit frontend.</h1>`))

app.use(ErrorMiddleWare);