import { Router } from "express";
import { asyncRouteHandler } from "../common/middlewares";
import { TransactionController } from "../controllers";

export const router = Router();

router.get("/pool", asyncRouteHandler(TransactionController.getTransactionPool));

router.get("/:id", asyncRouteHandler(TransactionController.getTransactionDetails));

router.post("/", asyncRouteHandler(TransactionController.createTransaction));
