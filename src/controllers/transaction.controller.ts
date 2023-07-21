import * as ecdsa from "elliptic";
import { Request, Response } from "express";
import { Blockchain, getUnspentTxOutputPool } from "../blockchain/blockchain";
import { Transaction } from "../blockchain/transaction/transaction";
import { TransactionPool } from "../blockchain/transaction/transaction-pool";
import { BadRequestException } from "../common/exceptions";
import { CreatedResponse, DataResponse } from "../core/response";
import { TransactionService } from "../services";
import { TransactionSocketSender } from "../socket/senders";
import { getPrivateKey } from "../wallet";

const ec = new ecdsa.ec("secp256k1");

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

    const tx = new Transaction(
        transaction.owner,
        transaction.txInputList,
        transaction.txOutputList,
        transaction.timestamp,
    );

    const poolInst = TransactionPool.getInstance();
    // add pool
    poolInst.addTransaction(tx, getUnspentTxOutputPool());

    // broadcast
    TransactionSocketSender.broadcastTransactionPoolRepsonse();

    res.json(new CreatedResponse(transaction));
}

export function getTransactionDetails(req: Request, res: Response) {
    const { id } = req.params;

    const poolTx = TransactionPool.getInstance().pool.find((tx) => tx.id === id);

    if (poolTx) {
        const receiver = poolTx.txOutputList.find((tx) => tx.address !== poolTx.owner);
        res.json(
            new DataResponse({
                hash: poolTx.id,
                blockId: null,
                status: "pending",
                createdAt: poolTx.timestamp,
                blockCreatedAt: null,
                from: poolTx.owner,
                to: receiver?.address,
                amount: receiver?.amount,
            }),
        );
        return;
    }

    const minedTransaction = Blockchain.getInstance()
        .chain.map((block) => {
            return block.data.map((tx) => {
                return {
                    status: "success",
                    block: { id: block.hash, timestamp: block.timestamp },
                    tx,
                };
            });
        })
        .reduce((prev: { status: string; block: { id: string; timestamp: number }; tx: Transaction }[], curr) => {
            return prev.concat(curr);
        }, [])
        .find((tx) => tx.tx.id === id);

    if (!minedTransaction) {
        throw new BadRequestException(400, "Cannot find transaction");
    }

    const receiver = minedTransaction.tx.txOutputList.find((tx) => tx.address !== minedTransaction.tx.owner);

    res.json(
        new DataResponse({
            hash: minedTransaction.tx.id,
            blockId: minedTransaction.block.id,
            status: "success",
            createdAt: minedTransaction.tx.timestamp,
            blockCreatedAt: minedTransaction.block.timestamp,
            from: minedTransaction.tx.owner,
            to: receiver?.address,
            amount: receiver?.amount,
        }),
    );
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

export function getTransactionList(req: Request, res: Response) {
    const { owner, receiver } = req.query;

    const filter = {
        owner: owner || "",
        receiver: receiver || "",
    };

    const poolTxList = TransactionPool.getInstance().pool.map((tx) => {
        return {
            status: "pending",
            tx,
        };
    });

    const minedTransaction = Blockchain.getInstance()
        .chain.map((block) => {
            return block.data.map((tx) => {
                return {
                    status: "success",
                    block: { id: block.hash, index: block.index, timestamp: block.timestamp },
                    tx,
                };
            });
        })
        .reduce(
            (
                prev: { status: string; block?: { id: string; index: number; timestamp: number }; tx: Transaction }[],
                curr,
            ) => {
                return prev.concat(curr);
            },
            [],
        );

    // sort latest tx
    const result = minedTransaction
        .concat(poolTxList)
        .filter((tx) => {
            if (filter.owner === "") return true;

            // verify signature
            const txInputToVerify = tx.tx.txInputList[0];
            if (txInputToVerify.txOutputId === "") {
                return false;
            }

            const keyPair = ec.keyFromPublic(filter.owner.toString(), "hex");

            const isSignatureValid = ec.verify(tx.tx.id, txInputToVerify.signature, keyPair);
            return isSignatureValid;
        })
        .map((tx) => {
            // get to address
            const txOutputList = tx.tx.txOutputList;
            const receiverTx = txOutputList.find((txOutput) => txOutput.address !== tx.tx.owner);

            return {
                hash: tx.tx.id,
                blockId: tx.block?.id || null,
                status: tx.status,
                createdAt: tx.tx.timestamp,
                blockCreatedAt: tx.block?.timestamp || null,
                from: tx.tx.owner,
                to: receiverTx!.address,
                amount: receiverTx!.amount,
            };
        })
        .sort((a, b) => b.createdAt - a.createdAt);

    res.json(new DataResponse({ items: result }));
}
