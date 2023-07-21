import { Router } from "express";
import { asyncRouteHandler } from "../common/middlewares/async-route.handler";
import { BlockchainController } from "../controllers";

export const router = Router();

router.get("/latest", asyncRouteHandler(BlockchainController.getLatestBlock));

router.get("/:blockHash", asyncRouteHandler(BlockchainController.getBlockDetail));

router.get("/", asyncRouteHandler(BlockchainController.getBlockChainInformation));

router.post("/mining", asyncRouteHandler(BlockchainController.mineBlock));
