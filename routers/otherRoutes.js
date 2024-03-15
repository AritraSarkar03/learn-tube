import express from "express";
import { contact, courseRequest, getDashboardStat } from "../controllers/otherControllers.js";
import { IsAuthenticated, authorizeAdmin } from "../middlewares/Auth.js"

const router = express.Router();

router.route("/contact").post(contact);

router.route("/courserequest").post(courseRequest);

router.route("/admin/stats").get(IsAuthenticated, authorizeAdmin, getDashboardStat);

export default router;     