import crypto from "crypto";
import * as ecdsa from "elliptic";
import _ from "lodash";
import { TransactionInput } from "./transaction-input";
import { TransactionOutput, UnspentTxOutput, findUnspentTxOutput } from "./transaction-output";

const ec = new ecdsa.ec("secp256k1");

const COINBASE_AMOUNT: number = 50;

export class Transaction {
    public id: string;
    constructor(public txInputList: TransactionInput[], public txOutputList: TransactionOutput[]) {
        this.id = this.calculateIdHash();
    }

    // Hash transaction id
    calculateIdHash(): string {
        const txInContent: string = this.txInputList
            .map((txIn: TransactionInput) => txIn.txOutputId + txIn.txOutputIndex)
            .reduce((a, b) => a + b, "");

        const txOutContent: string = this.txOutputList
            .map((txOut: TransactionOutput) => txOut.address + txOut.amount)
            .reduce((a, b) => a + b, "");

        const stringToHash = txInContent + txOutContent;
        const hash = crypto.createHash("sha256");
        hash.update(stringToHash);

        return hash.digest().toString("hex");
    }

    static isStructureValid(transaction: Transaction): boolean {
        if (typeof transaction.id !== "string") {
            console.log("transactionId missing");
            return false;
        }

        if (!(transaction.txInputList instanceof Array)) {
            console.log("invalid txIns type in transaction");
            return false;
        }
        if (!transaction.txInputList.map(TransactionInput.isStructureValid).reduce((a, b) => a && b, true)) {
            return false;
        }

        if (!(transaction.txOutputList instanceof Array)) {
            console.log("invalid txIns type in transaction");
            return false;
        }

        if (!transaction.txOutputList.map(TransactionOutput.isValidTxOutStructure).reduce((a, b) => a && b, true)) {
            return false;
        }
        return true;
    }
}

export const validateTransaction = (transaction: Transaction, aUnspentTxOuts: UnspentTxOutput[]): boolean => {
    if (!Transaction.isStructureValid(transaction)) {
        return false;
    }

    if (transaction.calculateIdHash() !== transaction.id) {
        console.log("invalid tx id: " + transaction.id);
        return false;
    }

    const hasValidTxIns: boolean = transaction.txInputList
        .map((txIn) => validateTxIn(txIn, transaction, aUnspentTxOuts))
        .reduce((a, b) => a && b, true);

    if (!hasValidTxIns) {
        console.log("some of the txIns are invalid in tx: " + transaction.id);
        return false;
    }

    const totalTxInValues: number = transaction.txInputList
        .map((txIn) => {
            return findUnspentTxOutput(txIn.txOutputId, txIn.txOutputIndex, aUnspentTxOuts)?.amount || 0;
        })
        .reduce((a, b) => a + b, 0);

    const totalTxOutValues: number = transaction.txOutputList.map((txOut) => txOut.amount).reduce((a, b) => a + b, 0);

    if (totalTxOutValues !== totalTxInValues) {
        console.log("totalTxOutValues !== totalTxInValues in tx: " + transaction.id);
        return false;
    }

    return true;
};

const validateBlockTransactions = (
    aTransactions: Transaction[],
    aUnspentTxOuts: UnspentTxOutput[],
    blockIndex: number,
): boolean => {
    const coinbaseTx = aTransactions[0];
    if (!validateCoinbaseTx(coinbaseTx, blockIndex)) {
        console.log("invalid coinbase transaction: " + JSON.stringify(coinbaseTx));
        return false;
    }

    // check for duplicate txIns. Each txIn can be included only once
    const txIns: TransactionInput[] = _(aTransactions)
        .map((tx) => tx.txInputList)
        .flatten()
        .value();

    if (hasDuplicates(txIns)) {
        return false;
    }

    // all but coinbase transactions
    const normalTransactions: Transaction[] = aTransactions.slice(1);
    return normalTransactions.map((tx) => validateTransaction(tx, aUnspentTxOuts)).reduce((a, b) => a && b, true);
};

const hasDuplicates = (txIns: TransactionInput[]): boolean => {
    const groups = _.countBy(txIns, (txIn: TransactionInput) => txIn.txOutputId + txIn.txOutputIndex);
    return _(groups)
        .map((value, key) => {
            if (value > 1) {
                console.log("duplicate txIn: " + key);
                return true;
            } else {
                return false;
            }
        })
        .includes(true);
};

const validateCoinbaseTx = (transaction: Transaction, blockIndex: number): boolean => {
    if (transaction == null) {
        console.log("the first transaction in the block must be coinbase transaction");
        return false;
    }
    if (transaction.calculateIdHash() !== transaction.id) {
        console.log("invalid coinbase tx id: " + transaction.id);
        return false;
    }
    if (transaction.txInputList.length !== 1) {
        console.log("one txIn must be specified in the coinbase transaction");
        return false;
    }
    if (transaction.txInputList[0].txOutputIndex !== blockIndex) {
        console.log("the txIn signature in coinbase tx must be the block height");
        return false;
    }
    if (transaction.txOutputList.length !== 1) {
        console.log("invalid number of txOuts in coinbase transaction");
        return false;
    }
    if (transaction.txOutputList[0].amount !== COINBASE_AMOUNT) {
        console.log("invalid coinbase amount in coinbase transaction");
        return false;
    }
    return true;
};

export function validateTxIn(
    txIn: TransactionInput,
    transaction: Transaction,
    aUnspentTxOuts: UnspentTxOutput[],
): boolean {
    const referencedUTxOut = aUnspentTxOuts.find(
        (uTxO) => uTxO.txOutputId === txIn.txOutputId && uTxO.txOutputIndex === txIn.txOutputIndex,
    );

    if (!referencedUTxOut) {
        console.log("referenced txOut not found: " + JSON.stringify(txIn));
        return false;
    }

    const address = referencedUTxOut.address;

    const key = ec.keyFromPublic(address, "hex");
    const validSignature: boolean = key.verify(transaction.id, txIn.signature);
    if (!validSignature) {
        console.log(
            "invalid txIn signature: %s txId: %s address: %s",
            txIn.signature,
            transaction.id,
            referencedUTxOut.address,
        );
        return false;
    }
    return true;
}

const updateUnspentTxOuts = (aTransactions: Transaction[], aUnspentTxOuts: UnspentTxOutput[]): UnspentTxOutput[] => {
    const newUnspentTxOuts: UnspentTxOutput[] = aTransactions
        .map((t) => {
            return t.txOutputList.map((txOut, index) => new UnspentTxOutput(t.id, index, txOut.address, txOut.amount));
        })
        .reduce((a, b) => a.concat(b), []);

    const consumedTxOuts: UnspentTxOutput[] = aTransactions
        .map((t) => t.txInputList)
        .reduce((a, b) => a.concat(b), [])
        .map((txIn) => new UnspentTxOutput(txIn.txOutputId, txIn.txOutputIndex, "", 0));

    const resultingUnspentTxOuts = aUnspentTxOuts
        .filter((uTxO) => !findUnspentTxOutput(uTxO.txOutputId, uTxO.txOutputIndex, consumedTxOuts))
        .concat(newUnspentTxOuts);

    return resultingUnspentTxOuts;
};

export function processTransactions(
    aTransactions: Transaction[],
    aUnspentTxOuts: UnspentTxOutput[],
    blockIndex: number,
) {
    if (!validateBlockTransactions(aTransactions, aUnspentTxOuts, blockIndex)) {
        console.log("invalid block transactions");
        return null;
    }
    return updateUnspentTxOuts(aTransactions, aUnspentTxOuts);
}

export function getCoinbaseTransaction(address: string, blockIndex: number): Transaction {
    const txInput = new TransactionInput("", blockIndex, "");
    const transaction = new Transaction([txInput], [new TransactionOutput(address, COINBASE_AMOUNT)]);

    return transaction;
}
