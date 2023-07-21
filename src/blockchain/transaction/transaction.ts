import CryptoJS from "crypto-js";
import * as ecdsa from "elliptic";
import _ from "lodash";
import { Logger } from "../../common/utils";
import { TransactionInput } from "./transaction-input";
import { TransactionOutput, UnspentTxOutput, findUnspentTxOutput } from "./transaction-output";

const ec = new ecdsa.ec("secp256k1");

export const COINBASE_AMOUNT: number = 50 as const;

export class Transaction {
    public id: string;

    constructor(
        public owner: string,
        public txInputList: TransactionInput[],
        public txOutputList: TransactionOutput[],
        public timestamp: number,
    ) {
        this.id = this.calculateIdHash();
    }

    getDataToSign(): string {
        const txInContent: string = this.txInputList
            .map((txIn: TransactionInput) => txIn.txOutputId + txIn.txOutputIndex)
            .reduce((a, b) => a + b, "");

        const txOutContent: string = this.txOutputList
            .map((txOut: TransactionOutput) => txOut.address + txOut.amount)
            .reduce((a, b) => a + b, "");

        const stringToHash = this.owner + txInContent + txOutContent + this.timestamp;

        return stringToHash;
    }

    // Hash transaction id
    calculateIdHash(): string {
        const hash = CryptoJS.SHA256(this.getDataToSign());

        return hash.toString(CryptoJS.enc.Hex);
    }

    static isStructureValid(transaction: Transaction): boolean {
        if (typeof transaction.id !== "string") {
            Logger.debug("Check transaction structure: transactionId missing");
            return false;
        }

        if (!(transaction.txInputList instanceof Array)) {
            Logger.debug("Check transaction structure: invalid txIns type in transaction");
            return false;
        }
        if (!transaction.txInputList.map(TransactionInput.isStructureValid).reduce((a, b) => a && b, true)) {
            return false;
        }

        if (!(transaction.txOutputList instanceof Array)) {
            Logger.debug("Check transaction structure: invalid txIns type in transaction");
            return false;
        }

        if (!transaction.txOutputList.map(TransactionOutput.isValidTxOutStructure).reduce((a, b) => a && b, true)) {
            return false;
        }

        return true;
    }
}

export function validateTransaction(transaction: Transaction, aUnspentTxOuts: UnspentTxOutput[]): boolean {
    if (!Transaction.isStructureValid(transaction)) {
        return false;
    }

    if (transaction.calculateIdHash() !== transaction.id) {
        Logger.debug("invalid tx id: " + transaction.id);
        return false;
    }

    const hasValidTxIns: boolean = transaction.txInputList
        .map((txIn) => validateTxIn(txIn, transaction, aUnspentTxOuts))
        .reduce((a, b) => a && b, true);

    if (!hasValidTxIns) {
        Logger.debug("some of the txIns are invalid in tx: " + transaction.id);
        return false;
    }

    const totalTxInValues: number = transaction.txInputList
        .map((txIn) => {
            return findUnspentTxOutput(txIn.txOutputId, txIn.txOutputIndex, aUnspentTxOuts)?.amount || 0;
        })
        .reduce((a, b) => a + b, 0);

    const totalTxOutValues: number = transaction.txOutputList.map((txOut) => txOut.amount).reduce((a, b) => a + b, 0);

    if (totalTxOutValues !== totalTxInValues) {
        Logger.debug("totalTxOutValues !== totalTxInValues in tx: " + transaction.id);
        return false;
    }

    return true;
}

function validateBlockTransactions(
    aTransactions: Transaction[],
    aUnspentTxOuts: UnspentTxOutput[],
    blockIndex: number,
): boolean {
    const coinbaseTx = aTransactions[0];
    if (!validateCoinbaseTx(coinbaseTx, blockIndex)) {
        Logger.debug("invalid coinbase transaction: " + JSON.stringify(coinbaseTx));
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
}

function hasDuplicates(txIns: TransactionInput[]): boolean {
    const groups = _.countBy(txIns, (txIn: TransactionInput) => txIn.txOutputId + txIn.txOutputIndex);
    return _(groups)
        .map((value, key) => {
            if (value > 1) {
                Logger.debug("duplicate txIn: " + key);
                return true;
            } else {
                return false;
            }
        })
        .includes(true);
}

function validateCoinbaseTx(transaction: Transaction, blockIndex: number): boolean {
    if (transaction == null) {
        Logger.debug("the first transaction in the block must be coinbase transaction");
        return false;
    }
    if (transaction.calculateIdHash() !== transaction.id) {
        Logger.debug("invalid coinbase tx id: " + transaction.id);
        return false;
    }
    if (transaction.txInputList.length !== 1) {
        Logger.debug("one txIn must be specified in the coinbase transaction");
        return false;
    }
    if (transaction.txInputList[0].txOutputIndex !== blockIndex) {
        Logger.debug("the txIn signature in coinbase tx must be the block height");
        return false;
    }
    if (transaction.txOutputList.length !== 1) {
        Logger.debug("invalid number of txOuts in coinbase transaction");
        return false;
    }
    if (transaction.txOutputList[0].amount !== COINBASE_AMOUNT) {
        Logger.debug("invalid coinbase amount in coinbase transaction");
        return false;
    }
    return true;
}

export function validateTxIn(
    txIn: TransactionInput,
    transaction: Transaction,
    aUnspentTxOuts: UnspentTxOutput[],
): boolean {
    const referencedUTxOut = aUnspentTxOuts.find(
        (uTxO) => uTxO.txOutputId === txIn.txOutputId && uTxO.txOutputIndex === txIn.txOutputIndex,
    );

    if (!referencedUTxOut) {
        Logger.debug("referenced txOut not found: " + JSON.stringify(txIn));
        return false;
    }

    const address = referencedUTxOut.address;

    const key = ec.keyFromPublic(address, "hex");
    const validSignature: boolean = key.verify(transaction.id, txIn.signature);
    if (!validSignature) {
        Logger.debug(
            "invalid txIn signature: %s txId: %s address: %s",
            txIn.signature,
            transaction.id,
            referencedUTxOut.address,
        );
        return false;
    }
    return true;
}

function updateUnspentTxOuts(aTransactions: Transaction[], aUnspentTxOuts: UnspentTxOutput[]): UnspentTxOutput[] {
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
}

export function processTransactions(
    aTransactions: Transaction[],
    aUnspentTxOuts: UnspentTxOutput[],
    blockIndex: number,
) {
    if (!validateBlockTransactions(aTransactions, aUnspentTxOuts, blockIndex)) {
        Logger.debug("Process transaction: Invalid block transactions");
        return null;
    }
    return updateUnspentTxOuts(aTransactions, aUnspentTxOuts);
}
