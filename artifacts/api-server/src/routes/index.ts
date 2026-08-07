import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import imagesRouter from "./images";
import videoAgentRouter from "./video-agent";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/chat", chatRouter);
router.use("/images", imagesRouter);
router.use("/video-agent", videoAgentRouter);

export default router;
