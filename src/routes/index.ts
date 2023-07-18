import { router as blockchainRouter } from "./blockchain.route";
import { router as peerRouter } from "./peer-node.route";
import { router as transactionRouter } from "./transaction.route";
import { router as walletRouter } from "./wallet.route";

export const AppControllers = [
    { path: "/blocks", handler: blockchainRouter },
    { path: "/peers", handler: peerRouter },
    { path: "/wallet", handler: walletRouter },
    { path: "/transactions", handler: transactionRouter },
];
