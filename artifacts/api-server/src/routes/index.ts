import { Router, type IRouter } from "express";
import healthRouter from "./health";
import v1Router from "./v1/index.js";
import emailRouter from "./email.js";
import midtransRouter from "./midtrans.js";
import pushRouter from "./push.js";
import manifestRouter from "./manifest.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(manifestRouter);
router.use("/v1", v1Router);
router.use("/email", emailRouter);
router.use("/midtrans", midtransRouter);
router.use("/push", pushRouter);

export default router;
