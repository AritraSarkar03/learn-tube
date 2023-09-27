import { CatchAsyncError } from "../middlewares/CatchAsyncError.js";
import { User } from "../models/User.js";
import ErrorHandler from "../utils/errorHandler.js";
import { instance } from "../server.js";
import { Payment } from "../models/Payment.js";
import crypto from "crypto";

export const createSubscription = CatchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (user.role === "admin")
    return next(new ErrorHandler("Admin can not buy subscription", 400));

  const plan_id = process.env.PLAN_ID || "plan_fjjsdgfjf";

  const subscription = await instance.subscriptions.create({
    plan_id,
    customer_notify: 1,
    total_count: 12,
  });

  user.subscription.status = subscription.status;

  await user.save();

  res.status(200).json({
    success: true,
    subscriptionId: subscription.id,
  });
});

export const paymentVerification = CatchAsyncError(async (req, res, next) => {
  const { razorpay_signature, razorpay_payment_id, razorpay_subscription_id } =
    req.body;

  const user = await User.findById(req.user._id);

  const subscription_id = user.subscription.id;

  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
    .update(razorpay_payment_id + "|" + subscription_id, "utf-8")
    .digest("hex");

  const IsAuthentic = generated_signature === razorpay_signature;

  if (!IsAuthentic)
    return res.redirect(`${process.env.FRONTEND_URL}/paymentfailed`);

  await Payment.create({
    razorpay_signature,
    razorpay_payment_id,
    razorpay_subscription_id,
  });

  user.subscription.status = "active";
  await User.save();

  res.redirect(
    `${process.env.FRONTEND_URL}/paymentsuccess?reference=${razorpay_payment_id}`
  );
});

export const getRazorPayKey = CatchAsyncError(async (req, res, next) => {
  res.status(201).json({
    success: true,
    key: process.env.RAZORPAY_API_KEY,
  });
});

export const deleteSubscription = CatchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  const subscriptionId = user.subscription.id;
  let refund = false;

  await instance.subscriptions.cancel(subscriptionId);

  const payment = await Payment.findOne({
    razorpay_payment_id: subscriptionId,
  });

  const gap = Date.now() - payment.createdAt;

  const refundTime = process.env.REFUND_DAYS * 24 * 60 * 60 * 1000;

  if (refundTime > gap) {
    await instance.payments.refund(payment.razorpay_payment_id);
    refund: true;
  }

  await payment.deleteOne();
  user.subscription.id = undefined;
  user.subscription.status = undefined;

  await user.save();

  res.status(201).json({
    success: true,
    message: refund
      ? "Subscription cancelled, You will receive full refund within 7 days."
      : "Subscription cancelled, Now refund initiated as subscription was cancelled after 7 days.",
  });
});
