import modelarkDirectorRouter from "./modelark-director";
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import videoRouter from "./video";

const router: IRouter = Router();

router.use(healthRouter);
router.use(modelarkDirectorRouter);
router.use(videoRouter);

export default router;

