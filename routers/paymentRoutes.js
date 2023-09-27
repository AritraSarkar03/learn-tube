import express from "express";
import { IsAuthenticated, authorizeAdmin } from "../middlewares/Auth.js";
import { createSubscription, deleteSubscription, getRazorPayKey, paymentVerification } from "../controllers/paymentControllers.js";

const router = express.Router();

router.route("/subscribe").get(IsAuthenticated, createSubscription);

router.route("/paymentverification").post(IsAuthenticated, paymentVerification);

router.route("/razorpaykey").get(getRazorPayKey);

router.route("/subscribe/cancel").delete(IsAuthenticated, deleteSubscription);

export default router;