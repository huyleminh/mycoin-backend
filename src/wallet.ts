import fs from "fs";
import { Logger, WalletKeyAgent } from "./common/utils";
import { UnspentTxOutput } from "./blockchain/transaction/transaction-output";
import _ from "lodash";
import { APP_CONFIG } from "./infrastructure/configs";

export function initMinerWallet(): void {
    if (fs.existsSync(APP_CONFIG.minerKeyLocation)) {
        return;
    }

    const walletKeyAgent = new WalletKeyAgent();
    const { privateKey } = walletKeyAgent.generateKeyPair();

    fs.writeFileSync(APP_CONFIG.minerKeyLocation, privateKey);
    Logger.info(`Miner private key was generated and stored at ${APP_CONFIG.minerKeyLocation}`);
}

export function getPrivateKey(): string {
    const buffer = fs.readFileSync(APP_CONFIG.minerKeyLocation, "utf8");
    return buffer.toString();
}

export function getPublicKey(): string {
    const privateKey = getPrivateKey();
    const walletKeyAgent = new WalletKeyAgent();

    return walletKeyAgent.getPublicAddress(privateKey);
}

export function getBalance(address: string, unspentTxOuts: UnspentTxOutput[]): number {
    return _(findUnspentTxOuts(address, unspentTxOuts))
        .map((uTxO) => uTxO.amount)
        .sum();
}

const findUnspentTxOuts = (ownerAddress: string, unspentTxOuts: UnspentTxOutput[]) => {
    return _.filter(unspentTxOuts, (uTxO) => uTxO.address === ownerAddress);
};

// const findTxOutsForAmount = (amount: number, myUnspentTxOuts: UnspentTxOut[]) => {
//     let currentAmount = 0;
//     const includedUnspentTxOuts = [];
//     for (const myUnspentTxOut of myUnspentTxOuts) {
//         includedUnspentTxOuts.push(myUnspentTxOut);
//         currentAmount = currentAmount + myUnspentTxOut.amount;
//         if (currentAmount >= amount) {
//             const leftOverAmount = currentAmount - amount;
//             return { includedUnspentTxOuts, leftOverAmount };
//         }
//     }

//     const eMsg =
//         "Cannot create transaction from the available unspent transaction outputs." +
//         " Required amount:" +
//         amount +
//         ". Available unspentTxOuts:" +
//         JSON.stringify(myUnspentTxOuts);
//     throw Error(eMsg);
// };

// const createTxOuts = (receiverAddress: string, myAddress: string, amount, leftOverAmount: number) => {
//     const txOut1: TxOut = new TxOut(receiverAddress, amount);
//     if (leftOverAmount === 0) {
//         return [txOut1];
//     } else {
//         const leftOverTx = new TxOut(myAddress, leftOverAmount);
//         return [txOut1, leftOverTx];
//     }
// };

// const filterTxPoolTxs = (unspentTxOuts: UnspentTxOut[], transactionPool: Transaction[]): UnspentTxOut[] => {
//     const txIns: TxIn[] = _(transactionPool)
//         .map((tx: Transaction) => tx.txIns)
//         .flatten()
//         .value();
//     const removable: UnspentTxOut[] = [];
//     for (const unspentTxOut of unspentTxOuts) {
//         const txIn = _.find(txIns, (aTxIn: TxIn) => {
//             return aTxIn.txOutIndex === unspentTxOut.txOutIndex && aTxIn.txOutId === unspentTxOut.txOutId;
//         });

//         if (txIn === undefined) {
//         } else {
//             removable.push(unspentTxOut);
//         }
//     }

//     return _.without(unspentTxOuts, ...removable);
// };

// const createTransaction = (
//     receiverAddress: string,
//     amount: number,
//     privateKey: string,
//     unspentTxOuts: UnspentTxOut[],
//     txPool: Transaction[],
// ): Transaction => {
//     console.log("txPool: %s", JSON.stringify(txPool));
//     const myAddress: string = getPublicKey(privateKey);
//     const myUnspentTxOutsA = unspentTxOuts.filter((uTxO: UnspentTxOut) => uTxO.address === myAddress);

//     const myUnspentTxOuts = filterTxPoolTxs(myUnspentTxOutsA, txPool);

//     // filter from unspentOutputs such inputs that are referenced in pool
//     const { includedUnspentTxOuts, leftOverAmount } = findTxOutsForAmount(amount, myUnspentTxOuts);

//     const toUnsignedTxIn = (unspentTxOut: UnspentTxOut) => {
//         const txIn: TxIn = new TxIn();
//         txIn.txOutId = unspentTxOut.txOutId;
//         txIn.txOutIndex = unspentTxOut.txOutIndex;
//         return txIn;
//     };

//     const unsignedTxIns: TxIn[] = includedUnspentTxOuts.map(toUnsignedTxIn);

//     const tx: Transaction = new Transaction();
//     tx.txIns = unsignedTxIns;
//     tx.txOuts = createTxOuts(receiverAddress, myAddress, amount, leftOverAmount);
//     tx.id = getTransactionId(tx);

//     tx.txIns = tx.txIns.map((txIn: TxIn, index: number) => {
//         txIn.signature = signTxIn(tx, index, privateKey, unspentTxOuts);
//         return txIn;
//     });

//     return tx;
// };
