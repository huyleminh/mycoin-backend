import { Request, Response } from "express";
import { Blockchain, getUnspentTxOuts } from "../blockchain/blockchain";
import { Transaction } from "../blockchain/transaction/transaction";
import { TransactionPool } from "../blockchain/transaction/transaction-pool";
import { BadRequestException } from "../common/exceptions";
import { CreatedResponse, DataResponse } from "../core/response";
import { TransactionService } from "../services";
import { TransactionSocketSender } from "../socket/senders";
import { getPrivateKey } from "../wallet";

export function getTransactionPool(_req: Request, res: Response) {
    res.json(new DataResponse(TransactionPool.getInstance().pool));
}

export function createTransaction(req: Request, res: Response) {
    const { body } = req;
    const { amount, address } = body;

    const actualAmount = parseFloat(amount);
    if (isNaN(actualAmount)) {
        throw new BadRequestException(400, "Invalid amount");
    }

    if (!address || !address.trim()) {
        throw new BadRequestException(400, "Invalid wallet address");
    }

    const poolInst = TransactionPool.getInstance();

    // TODO: replace by client key
    const privateKey = getPrivateKey();

    const transaction = TransactionService.generateTransaction(
        address,
        actualAmount,
        privateKey,
        getUnspentTxOuts(),
        poolInst.pool,
    );

    // add pool
    poolInst.addTransaction(transaction, getUnspentTxOuts());

    // broadcast
    TransactionSocketSender.broadcastTransactionPoolRepsonse();

    res.json(new CreatedResponse(transaction));
}

export function getTransactionDetails(req: Request, reS: Response) {
    const { id } = req.params;

    const txList = Blockchain.getInstance().chain.reduce((prev: Transaction[], curr) => {
        return prev.concat(curr.data);
    }, []);

    const transaction = txList.find((tx) => tx.id === id);

    if (!transaction) {
        throw new BadRequestException(400, "Cannot find transaction");
    }

    reS.json(new DataResponse({ ...transaction }));
}
