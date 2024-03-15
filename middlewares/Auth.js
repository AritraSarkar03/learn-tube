import jwt from "jsonwebtoken";
import { CatchAsyncError } from "./CatchAsyncError.js";
import ErrorHandler from "../utils/errorHandler.js";
import { User } from "../models/User.js";

export const IsAuthenticated = CatchAsyncError(async (req, res, next) => {
  const { token } = req.cookies;

  if (!token) return next(new ErrorHandler("Not Logged In", 401));

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  req.user = await User.findById(decoded._id);

  next();
});

export const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== "active" && req.user.role !== "admin")
    return next(
      new ErrorHandler(`Only admin can access this resource`, 403)
    );

  next(); 
};

export const authorizeSubscribers = (req, res, next) => {
  if (req.user.subscription.status !== "admin")
    return next(
      new ErrorHandler(
        `${req.user.role} is not allowed to access this resource`,
        403
      )
    );

  next();
};
