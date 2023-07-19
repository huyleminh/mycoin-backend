import { Router } from "express";
import { asyncRouteHandler } from "../common/middlewares/async-route.handler";
import { WalletController } from "../controllers";

export const router = Router();

router.get("/me", asyncRouteHandler(WalletController.getMyWalletAddress));

router.get("/:address/balance", asyncRouteHandler(WalletController.getUserbalance))
