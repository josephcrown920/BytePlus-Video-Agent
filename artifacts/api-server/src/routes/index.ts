import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import contentRouter from "./content";
import imagesRouter from "./images";
import videoAgentRouter from "./video-agent";
import shareRouter from "./share";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/chat", chatRouter);
router.use("/content", contentRouter);
router.use("/images", imagesRouter);
router.use("/video-agent", videoAgentRouter);
router.use("/share", shareRouter);

export default router;
