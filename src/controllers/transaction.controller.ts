import { Request, Response } from "express";
import _ from "lodash";
import { BadRequestException } from "../common/exceptions";
import { WalletKeyAgent } from "../common/utils";
import { CreatedResponse } from "../core/response";
import { TransactionOutput, UnspentTxOutput } from "../transaction/transaction-output";
import { Transaction } from "../transaction/transaction";
import { TransactionInput } from "../transaction/transaction-input";
import { TransactionPool } from "../transaction/transaction-pool";
import { TransactionSocketHandlers } from "../socket/handlers";
import { getUnspentTxOuts } from "../blockchain";

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
    // test server key
    const privateKey = "b7040e53c99ab89bf759900846bace120f8a582b7f3e74f7766b696edf6a4ecb";
    // create
    const transaction = createTx(address, actualAmount, privateKey, getUnspentTxOuts(), poolInst.pool);
    // add pool
    poolInst.addTransaction(transaction, getUnspentTxOuts());
    // broadcast
    TransactionSocketHandlers.broadcastTransactionPool();

    res.json(new CreatedResponse(transaction));
}

export const createTx = (
    receiverAddress: string,
    amount: number,
    privateKey: string,
    unspentTxOuts: UnspentTxOutput[],
    txPool: Transaction[],
): Transaction => {
    // FE wallet
    const myAddress: string = new WalletKeyAgent().getPublicAddress(privateKey);
    console.log({ myAddress });

    // Call API to get
    const myUnspentTxOutsA = unspentTxOuts.filter((uTxO: UnspentTxOutput) => uTxO.address === myAddress);

    const myUnspentTxOuts = filterTxPoolTxs(myUnspentTxOutsA, txPool);

    // filter from unspentOutputs such inputs that are referenced in pool
    const { includedUnspentTxOuts, leftOverAmount } = findTxOutsForAmount(amount, myUnspentTxOuts);

    const toUnsignedTxIn = (unspentTxOut: UnspentTxOutput) => {
        const txIn = new TransactionInput(unspentTxOut.txOutputId, unspentTxOut.txOutputIndex, "");
        return txIn;
    };

    const unsignedTxIns: TransactionInput[] = includedUnspentTxOuts.map(toUnsignedTxIn);

    // FE create
    const tx: Transaction = new Transaction(
        unsignedTxIns,
        createTxOuts(receiverAddress, myAddress, amount, leftOverAmount),
    );

    // FE sign
    tx.txInputList = tx.txInputList.map((txIn) => {
        txIn.signature = txIn.calculateSignature(privateKey, tx.id, unspentTxOuts);
        return txIn;
    });

    return tx;
};

const createTxOuts = (receiverAddress: string, myAddress: string, amount: number, leftOverAmount: number) => {
    const txOut1: TransactionOutput = new TransactionOutput(receiverAddress, amount);
    if (leftOverAmount === 0) {
        return [txOut1];
    } else {
        const leftOverTx = new TransactionOutput(myAddress, leftOverAmount);
        return [txOut1, leftOverTx];
    }
};

const filterTxPoolTxs = (unspentTxOuts: UnspentTxOutput[], transactionPool: Transaction[]): UnspentTxOutput[] => {
    const txIns: TransactionInput[] = _(transactionPool)
        .map((tx: Transaction) => tx.txInputList)
        .flatten()
        .value();
    const removable: UnspentTxOutput[] = [];
    for (const unspentTxOut of unspentTxOuts) {
        const txIn = _.find(txIns, (aTxIn: TransactionInput) => {
            return aTxIn.txOutputIndex === unspentTxOut.txOutputIndex && aTxIn.txOutputId === unspentTxOut.txOutputId;
        });

        if (txIn === undefined) {
        } else {
            removable.push(unspentTxOut);
        }
    }

    return _.without(unspentTxOuts, ...removable);
};

const findTxOutsForAmount = (amount: number, myUnspentTxOuts: UnspentTxOutput[]) => {
    let currentAmount = 0;
    const includedUnspentTxOuts = [];

    for (const myUnspentTxOut of myUnspentTxOuts) {
        includedUnspentTxOuts.push(myUnspentTxOut);
        currentAmount = currentAmount + myUnspentTxOut.amount;

        if (currentAmount >= amount) {
            const leftOverAmount = currentAmount - amount;
            return { includedUnspentTxOuts, leftOverAmount };
        }
    }

    const eMsg =
        "Cannot create transaction from the available unspent transaction outputs." +
        " Required amount:" +
        amount +
        ". Available unspentTxOuts:" +
        JSON.stringify(myUnspentTxOuts);
    throw Error(eMsg);
};
