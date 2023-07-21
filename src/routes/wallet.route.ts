import { Router } from "express";
import { asyncRouteHandler } from "../common/middlewares/async-route.handler";
import { WalletController } from "../controllers";

export const router = Router();

router.get("/me", asyncRouteHandler(WalletController.getMyWalletAddress));

router.get("/keystore", asyncRouteHandler(WalletController.sendKeyStore));

router.get("/:address/balance", asyncRouteHandler(WalletController.getUserbalance));

router.get("/:address/unspent-txs", asyncRouteHandler(WalletController.getUserUnspentTransactionOutput));
