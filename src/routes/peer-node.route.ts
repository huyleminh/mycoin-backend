import { Router } from "express";
import { asyncRouteHandler } from "../common/middlewares/async-route.handler";
import { PeerNodeController } from "../controllers";

export const router = Router();

router.post("/", asyncRouteHandler(PeerNodeController.registerPeerNodeServerAsync));
router.get("/", asyncRouteHandler(PeerNodeController.getCurrentNodePeerList));
