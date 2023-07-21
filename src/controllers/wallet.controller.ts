import { Request, Response } from "express";
import { getUnspentTxOutputPool } from "../blockchain/blockchain";
import { DataResponse } from "../core/response";
import { TransactionService } from "../services";
import { findUnspentTxOutputByAddress, getBalance, getPublicKey } from "../wallet";
import { TransactionPool } from "../blockchain/transaction";
import path from "path";
import { APP_CONFIG } from "../infrastructure/configs";

export function getMyWalletAddress(_req: Request, res: Response) {
    const address = getPublicKey();
    res.json(new DataResponse({ address }));
}

export function getUserbalance(req: Request, res: Response) {
    const { address } = req.params;

    const unspentPool = getUnspentTxOutputPool();

    const balance = getBalance(address, unspentPool);

    res.json(new DataResponse({ balance }));
}

export function getUserUnspentTransactionOutput(req: Request, res: Response) {
    const { address } = req.params;

    const myUnspentTxOutputList = findUnspentTxOutputByAddress(address, getUnspentTxOutputPool());

    const filteredUnspenTxs = TransactionService.filterTxPoolTxs(
        myUnspentTxOutputList,
        TransactionPool.getInstance().pool,
    );

    res.json(new DataResponse([...filteredUnspenTxs]));
}

export function sendKeyStore(_req: Request, res: Response) {
    res.sendFile(path.join(__dirname, "../../", APP_CONFIG.minerKeystoreLocation));
}
