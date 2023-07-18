import * as ecdsa from "elliptic";
import * as _ from "lodash";
import crypto from "crypto";
import { HexaConverter } from "./common/utils";

const ec = new ecdsa.ec("secp256k1");

// const COINBASE_AMOUNT: number = 50;

export class UnspentTxOut {
    constructor(
        public readonly txOutputId: string,
        public readonly txOutputIndex: number,
        public readonly address: string,
        public readonly amount: number,
    ) {}
}

export class TransactionInput {
    constructor(public txOutputId: string, public txOutputIndex: number, public signature: string) {}
}

export class TransactionOutput {
    constructor(public address: string, public amount: number) {}
}

export class Transaction {
    constructor(public id: string, public txInputList: TransactionInput[], public txOutputList: TransactionOutput[]) {}

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

    calculateSignature(txInIndex: number, ownerPrivateKey: string, aUnspentTxOuts: UnspentTxOut[]): string {
        const txInput: TransactionInput = this.txInputList[txInIndex];

        const dataToSign = this.id;

        const referencedUnspentTxOut = findUnspentTxOut(txInput.txOutputId, txInput.txOutputIndex, aUnspentTxOuts);

        if (!referencedUnspentTxOut) {
            console.log("could not find referenced txOut");
            throw Error();
        }
        const referencedAddress = referencedUnspentTxOut.address;

        if (getPublicKey(ownerPrivateKey) !== referencedAddress) {
            console.log(
                "trying to sign an input with private" +
                    " key that does not match the address that is referenced in txIn",
            );
            throw Error();
        }

        const key = ec.keyFromPrivate(ownerPrivateKey, "hex");
        const signature = new HexaConverter().fromByteArray(key.sign(dataToSign).toDER());

        return signature;
    }
}

// const validateTransaction = (transaction: Transaction, aUnspentTxOuts: UnspentTxOut[]): boolean => {
//     if (!isValidTransactionStructure(transaction)) {
//         return false;
//     }

//     if (transaction.calculateIdHash() !== transaction.id) {
//         console.log("invalid tx id: " + transaction.id);
//         return false;
//     }
//     const hasValidTxIns: boolean = transaction.txInputList
//         .map((txIn) => validateTxIn(txIn, transaction, aUnspentTxOuts))
//         .reduce((a, b) => a && b, true);

//     if (!hasValidTxIns) {
//         console.log("some of the txIns are invalid in tx: " + transaction.id);
//         return false;
//     }

//     const totalTxInValues: number = transaction.txInputList
//         .map((txIn) => getTxInAmount(txIn, aUnspentTxOuts))
//         .reduce((a, b) => a + b, 0);

//     const totalTxOutValues: number = transaction.txOutputList.map((txOut) => txOut.amount).reduce((a, b) => a + b, 0);

//     if (totalTxOutValues !== totalTxInValues) {
//         console.log("totalTxOutValues !== totalTxInValues in tx: " + transaction.id);
//         return false;
//     }

//     return true;
// };

// const validateBlockTransactions = (
//     aTransactions: Transaction[],
//     aUnspentTxOuts: UnspentTxOut[],
//     blockIndex: number,
// ): boolean => {
//     const coinbaseTx = aTransactions[0];
//     if (!validateCoinbaseTx(coinbaseTx, blockIndex)) {
//         console.log("invalid coinbase transaction: " + JSON.stringify(coinbaseTx));
//         return false;
//     }

//     // check for duplicate txIns. Each txIn can be included only once
//     const txIns: TransactionInput[] = _(aTransactions)
//         .map((tx) => tx.txIns)
//         .flatten()
//         .value();

//     if (hasDuplicates(txIns)) {
//         return false;
//     }

//     // all but coinbase transactions
//     const normalTransactions: Transaction[] = aTransactions.slice(1);
//     return normalTransactions.map((tx) => validateTransaction(tx, aUnspentTxOuts)).reduce((a, b) => a && b, true);
// };

// const hasDuplicates = (txIns: TransactionInput[]): boolean => {
//     const groups = _.countBy(txIns, (txIn: TransactionInput) => txIn.txOutputId + txIn.txOutputIndex);
//     return _(groups)
//         .map((value, key) => {
//             if (value > 1) {
//                 console.log("duplicate txIn: " + key);
//                 return true;
//             } else {
//                 return false;
//             }
//         })
//         .includes(true);
// };

// const validateCoinbaseTx = (transaction: Transaction, blockIndex: number): boolean => {
//     if (transaction == null) {
//         console.log("the first transaction in the block must be coinbase transaction");
//         return false;
//     }
//     if (transaction.calculateIdHash() !== transaction.id) {
//         console.log("invalid coinbase tx id: " + transaction.id);
//         return false;
//     }
//     if (transaction.txInputList.length !== 1) {
//         console.log("one txIn must be specified in the coinbase transaction");
//         return;
//     }
//     if (transaction.txInputList[0].txOutputIndex !== blockIndex) {
//         console.log("the txIn signature in coinbase tx must be the block height");
//         return false;
//     }
//     if (transaction.txOutputList.length !== 1) {
//         console.log("invalid number of txOuts in coinbase transaction");
//         return false;
//     }
//     if (transaction.txOutputList[0].amount !== COINBASE_AMOUNT) {
//         console.log("invalid coinbase amount in coinbase transaction");
//         return false;
//     }
//     return true;
// };

// const validateTxIn = (txIn: TransactionInput, transaction: Transaction, aUnspentTxOuts: UnspentTxOut[]): boolean => {
//     const referencedUTxOut: UnspentTxOut = aUnspentTxOuts.find(
//         (uTxO) => uTxO.txOutputId === txIn.txOutputId && uTxO.txOutputIndex === txIn.txOutputIndex,
//     );
//     if (referencedUTxOut == null) {
//         console.log("referenced txOut not found: " + JSON.stringify(txIn));
//         return false;
//     }
//     const address = referencedUTxOut.address;

//     const key = ec.keyFromPublic(address, "hex");
//     const validSignature: boolean = key.verify(transaction.id, txIn.signature);
//     if (!validSignature) {
//         console.log(
//             "invalid txIn signature: %s txId: %s address: %s",
//             txIn.signature,
//             transaction.id,
//             referencedUTxOut.address,
//         );
//         return false;
//     }
//     return true;
// };

// const getTxInAmount = (txIn: TransactionInput, aUnspentTxOuts: UnspentTxOut[]): number => {
//     return findUnspentTxOut(txIn.txOutputId, txIn.txOutputIndex, aUnspentTxOuts).amount;
// };

const findUnspentTxOut = (
    transactionId: string,
    index: number,
    aUnspentTxOuts: UnspentTxOut[],
): UnspentTxOut | null => {
    return aUnspentTxOuts.find((uTxO) => uTxO.txOutputId === transactionId && uTxO.txOutputIndex === index) || null;
};

// const getCoinbaseTransaction = (address: string, blockIndex: number): Transaction => {
//     const t = new Transaction();
//     const txIn: TransactionInput = new TransactionInput();
//     txIn.signature = "";
//     txIn.txOutputId = "";
//     txIn.txOutputIndex = blockIndex;

//     t.txInputList = [txIn];
//     t.txOutputList = [new TransactionOutput(address, COINBASE_AMOUNT)];
//     t.id = getTransactionId(t);
//     return t;
// };

// const updateUnspentTxOuts = (aTransactions: Transaction[], aUnspentTxOuts: UnspentTxOut[]): UnspentTxOut[] => {
//     const newUnspentTxOuts: UnspentTxOut[] = aTransactions
//         .map((t) => {
//             return t.txOutputList.map((txOut, index) => new UnspentTxOut(t.id, index, txOut.address, txOut.amount));
//         })
//         .reduce((a, b) => a.concat(b), []);

//     const consumedTxOuts: UnspentTxOut[] = aTransactions
//         .map((t) => t.txInputList)
//         .reduce((a, b) => a.concat(b), [])
//         .map((txIn) => new UnspentTxOut(txIn.txOutputId, txIn.txOutputIndex, "", 0));

//     const resultingUnspentTxOuts = aUnspentTxOuts
//         .filter((uTxO) => !findUnspentTxOut(uTxO.txOutputId, uTxO.txOutputIndex, consumedTxOuts))
//         .concat(newUnspentTxOuts);

//     return resultingUnspentTxOuts;
// };

// const processTransactions = (aTransactions: Transaction[], aUnspentTxOuts: UnspentTxOut[], blockIndex: number) => {
//     if (!validateBlockTransactions(aTransactions, aUnspentTxOuts, blockIndex)) {
//         console.log("invalid block transactions");
//         return null;
//     }
//     return updateUnspentTxOuts(aTransactions, aUnspentTxOuts);
// };

const getPublicKey = (aPrivateKey: string): string => {
    return ec.keyFromPrivate(aPrivateKey, "hex").getPublic().encode("hex", false);
};

// const isValidTxInStructure = (txIn: TransactionInput): boolean => {
//     if (txIn == null) {
//         console.log("txIn is null");
//         return false;
//     } else if (typeof txIn.signature !== "string") {
//         console.log("invalid signature type in txIn");
//         return false;
//     } else if (typeof txIn.txOutputId !== "string") {
//         console.log("invalid txOutId type in txIn");
//         return false;
//     } else if (typeof txIn.txOutputIndex !== "number") {
//         console.log("invalid txOutIndex type in txIn");
//         return false;
//     } else {
//         return true;
//     }
// };

// const isValidTxOutStructure = (txOut: TransactionOutput): boolean => {
//     if (txOut == null) {
//         console.log("txOut is null");
//         return false;
//     } else if (typeof txOut.address !== "string") {
//         console.log("invalid address type in txOut");
//         return false;
//     } else if (!isValidAddress(txOut.address)) {
//         console.log("invalid TxOut address");
//         return false;
//     } else if (typeof txOut.amount !== "number") {
//         console.log("invalid amount type in txOut");
//         return false;
//     } else {
//         return true;
//     }
// };

// const isValidTransactionStructure = (transaction: Transaction) => {
//     if (typeof transaction.id !== "string") {
//         console.log("transactionId missing");
//         return false;
//     }
//     if (!(transaction.txInputList instanceof Array)) {
//         console.log("invalid txIns type in transaction");
//         return false;
//     }
//     if (!transaction.txInputList.map(isValidTxInStructure).reduce((a, b) => a && b, true)) {
//         return false;
//     }

//     if (!(transaction.txOutputList instanceof Array)) {
//         console.log("invalid txIns type in transaction");
//         return false;
//     }

//     if (!transaction.txOutputList.map(isValidTxOutStructure).reduce((a, b) => a && b, true)) {
//         return false;
//     }
//     return true;
// };

// // valid address is a valid ecdsa public key in the 04 + X-coordinate + Y-coordinate format
// const isValidAddress = (address: string): boolean => {
//     if (address.length !== 130) {
//         console.log(address);
//         console.log("invalid public key length");
//         return false;
//     } else if (address.match("^[a-fA-F0-9]+$") === null) {
//         console.log("public key must contain only hex characters");
//         return false;
//     } else if (!address.startsWith("04")) {
//         console.log("public key must start with 04");
//         return false;
//     }
//     return true;
// };

// export {
//     processTransactions,
//     isValidAddress,
//     validateTransaction,
//     getCoinbaseTransaction,
//     getPublicKey,
//     hasDuplicates,
// };
