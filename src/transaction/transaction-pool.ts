import _ from "lodash";
import { Transaction, validateTransaction } from "./transaction";
import { TransactionInput } from "./transaction-input";
import { UnspentTxOutput } from "./transaction-output";

export class TransactionPool {
    public pool: Transaction[];

    static instance: TransactionPool;

    private constructor() {
        this.pool = [];
    }

    addTransaction(tx: Transaction, unspentOutputs: UnspentTxOutput[]) {
        if (!validateTransaction(tx, unspentOutputs)) {
            throw Error("Trying to add invalid tx to pool");
        }

        if (!this.isTransactionValid(tx)) {
            throw Error("Trying to add invalid tx to pool");
        }

        console.log("adding to txPool: %s", JSON.stringify(tx));
        this.pool.push(tx);
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
                console.log("txIn already found in the txPool");
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
            console.log("removing the following transactions from txPool: %s", JSON.stringify(invalidTxs));
            this.pool = _.without(this.pool, ...invalidTxs);
        }
    }

    static getInstance(): TransactionPool {
        if (!TransactionPool.instance) {
            TransactionPool.instance = new TransactionPool();
        }

        return _.cloneDeep(TransactionPool.instance);
    }
}
