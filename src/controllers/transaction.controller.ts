import { Request, Response } from "express";
import { Blockchain, getUnspentTxOutputPool } from "../blockchain/blockchain";
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
    const { transaction } = body;

    if (!transaction || typeof transaction !== "object") {
        throw new BadRequestException(400, "Missing transaction");
    }

    // check transaction structure
    const isStructureValid = Transaction.isStructureValid(transaction);

    if (!isStructureValid) {
        throw new BadRequestException(400, "Invalid transaction structure");
    }

    const tx = new Transaction(transaction.txInputList, transaction.txOutputList);

    const poolInst = TransactionPool.getInstance();
    // add pool
    poolInst.addTransaction(tx, getUnspentTxOutputPool());

    // broadcast
    TransactionSocketSender.broadcastTransactionPoolRepsonse();

    res.json(new CreatedResponse(transaction));
}

export function getTransactionDetails(req: Request, res: Response) {
    const { id } = req.params;

    const txList = Blockchain.getInstance().chain.reduce((prev: Transaction[], curr) => {
        return prev.concat(curr.data);
    }, []);

    const transaction = txList.find((tx) => tx.id === id);

    if (!transaction) {
        throw new BadRequestException(400, "Cannot find transaction");
    }

    res.json(new DataResponse({ ...transaction }));
}

export function createTransactionMiner(req: Request, res: Response) {
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

    const privateKey = getPrivateKey();
    const transaction = TransactionService.generateTransaction(
        address,
        actualAmount,
        privateKey,
        getUnspentTxOutputPool(),
        poolInst.pool,
    );

    // add pool
    poolInst.addTransaction(transaction, getUnspentTxOutputPool());

    // broadcast
    TransactionSocketSender.broadcastTransactionPoolRepsonse();

    res.json(new CreatedResponse(transaction));
}
