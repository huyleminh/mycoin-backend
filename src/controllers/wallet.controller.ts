import { Request, Response } from "express";
import { getUnspentTxOutputPool } from "../blockchain/blockchain";
import { DataResponse } from "../core/response";
import { findUnspentTxOutputByAddress, getBalance, getPublicKey } from "../wallet";

export function getMyWalletAddress(_req: Request, res: Response) {
    const address = getPublicKey();
    res.json(new DataResponse({ address }));
}

export function getUserbalance(req: Request, res: Response) {
    const { address } = req.params;

    const balance = getBalance(address, getUnspentTxOutputPool());

    res.json(new DataResponse({ balance }));
}

export function getUserUnspentTransactionOutput(req: Request, res: Response) {
    const { address } = req.params;

    const myUnspentTxOutputList = findUnspentTxOutputByAddress(address, getUnspentTxOutputPool());

    res.json(new DataResponse([...myUnspentTxOutputList]));
}
