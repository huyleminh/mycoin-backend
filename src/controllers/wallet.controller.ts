import { Request, Response } from "express";
import { DataResponse } from "../core/response";
import { getBalance, getPublicKey } from "../wallet";
import { getUnspentTxOuts } from "../blockchain/blockchain";

export function getMyWalletAddress(_req: Request, res: Response) {
    const address = getPublicKey();
    res.json(new DataResponse({ address }));
}

export function getUserbalance(req: Request, res: Response) {
    const { address } = req.params;

    const balance = getBalance(address, getUnspentTxOuts());

    res.json(new DataResponse({ balance }));
}
