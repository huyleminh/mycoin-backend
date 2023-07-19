import _ from "lodash";
import { Transaction, validateTransaction } from "./transaction";
import { TransactionInput } from "./transaction-input";
import { UnspentTxOutput } from "./transaction-output";
import { Logger } from "../../common/utils";

export class TransactionPool {
    public pool: Transaction[];

    private static _instance: TransactionPool;

    private constructor() {
        this.pool = [];
    }

    // TODO: review exception
    addTransaction(tx: Transaction, unspentOutputs: UnspentTxOutput[]): boolean {
        if (!validateTransaction(tx, unspentOutputs)) {
            throw Error("Trying to add invalid tx to pool");
        }

        if (!this.isTransactionValid(tx)) {
            throw Error("Invalid transaction for pool");
        }

        this.pool.push(tx);
        return true;
    }

    isTransactionValid(transaction: Transaction): boolean {
        const poolTxInputList = this.getAllCurrentTxInput();

        for (const txInput of transaction.txInputList) {
            const isContained = poolTxInputList.find((poolTxInput) => {
                return (
                    txInput.txOutputIndex === poolTxInput.txOutputIndex && txInput.txOutputId === poolTxInput.txOutputId
                );
            });

            if (isContained) {
                return false;
            }
        }
        return true;
    }

    getAllCurrentTxInput(): TransactionInput[] {
        return _(this.pool)
            .map((tx) => tx.txInputList)
            .flatten()
            .value();
    }

    update(unspentTxOuts: UnspentTxOutput[]) {
        const invalidTxs = [];
        for (const tx of this.pool) {
            for (const txIn of tx.txInputList) {
                const hasTxIn = unspentTxOuts.find((uTxO) => {
                    return uTxO.txOutputId === txIn.txOutputId && uTxO.txOutputIndex === txIn.txOutputIndex;
                });

                if (!hasTxIn) {
                    invalidTxs.push(tx);
                    break;
                }
            }
        }
        if (invalidTxs.length > 0) {
            Logger.debug(
                "Update transaction pool: removing the following transactions from txPool: %s",
                JSON.stringify(invalidTxs),
            );

            this.pool = _.without(this.pool, ...invalidTxs);
        }
    }

    static getInstance(): TransactionPool {
        if (!TransactionPool._instance) {
            TransactionPool._instance = new TransactionPool();
        }

        return TransactionPool._instance;
    }
}
