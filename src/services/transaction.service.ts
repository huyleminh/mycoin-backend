import _ from "lodash";
import {
    COINBASE_AMOUNT,
    Transaction,
    TransactionInput,
    TransactionOutput,
    UnspentTxOutput,
} from "../blockchain/transaction";
import { WalletKeyAgent, getCurrentTimestampAsSecond } from "../common/utils";

export function getCoinbaseTransaction(address: string, blockIndex: number): Transaction {
    const txInput = new TransactionInput("", blockIndex, "");
    const transaction = new Transaction(
        "04bfcab8722991ae774db48f934ca79cfb7dd991229153b9f732ba5334aafcd8e7266e47076996b55a14bf9913ee3145ce0cfc1372ada8ada74bd287450313534a",
        [txInput],
        [new TransactionOutput(address, COINBASE_AMOUNT)],
        getCurrentTimestampAsSecond(),
    );

    return transaction;
}

export function generateTransaction(
    receiverAddress: string,
    amount: number,
    privateKey: string,
    unspentTxOuts: UnspentTxOutput[],
    txPool: Transaction[],
): Transaction {
    const myAddress: string = new WalletKeyAgent().getPublicAddress(privateKey);

    const myUnspentTxOutsA = unspentTxOuts.filter((uTxO: UnspentTxOutput) => uTxO.address === myAddress);

    const myUnspentTxOuts = filterTxPoolTxs(myUnspentTxOutsA, txPool);

    // filter from unspentOutputs such inputs that are referenced in pool
    const { includedUnspentTxOuts, leftOverAmount } = findTxOutsForAmount(amount, myUnspentTxOuts);

    const unsignedTxIns: TransactionInput[] = includedUnspentTxOuts.map((unspentTxOut) => {
        const txIn = new TransactionInput(unspentTxOut.txOutputId, unspentTxOut.txOutputIndex, "");
        return txIn;
    });

    const tx: Transaction = new Transaction(
        myAddress,
        unsignedTxIns,
        createTxOuts(receiverAddress, myAddress, amount, leftOverAmount),
        getCurrentTimestampAsSecond(),
    );

    tx.txInputList = tx.txInputList.map((txIn) => {
        // txIn.signature = txIn.calculateSignature(privateKey, tx.id, unspentTxOuts);
        txIn.signature = txIn.calculateSignature(privateKey, tx.id, myUnspentTxOuts);
        return txIn;
    });

    return tx;
}

function createTxOuts(receiverAddress: string, myAddress: string, amount: number, leftOverAmount: number) {
    const txOut1: TransactionOutput = new TransactionOutput(receiverAddress, amount);
    if (leftOverAmount === 0) {
        return [txOut1];
    }

    const leftOverTx = new TransactionOutput(myAddress, leftOverAmount);
    return [txOut1, leftOverTx];
}

export function filterTxPoolTxs(unspentTxOuts: UnspentTxOutput[], transactionPool: Transaction[]): UnspentTxOutput[] {
    const txIns = _(transactionPool)
        .map((tx: Transaction) => tx.txInputList)
        .flatten()
        .value();

    const removable: UnspentTxOutput[] = [];

    for (const unspentTxOut of unspentTxOuts) {
        const txIn = _.find(txIns, (aTxIn: TransactionInput) => {
            return aTxIn.txOutputIndex === unspentTxOut.txOutputIndex && aTxIn.txOutputId === unspentTxOut.txOutputId;
        });

        txIn && removable.push(unspentTxOut);
    }

    return _.without(unspentTxOuts, ...removable);
}

function findTxOutsForAmount(amount: number, myUnspentTxOuts: UnspentTxOutput[]) {
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

    const eMsg = `Cannot create transaction from the available unspent transaction outputs.
                    Required amount: ${amount}.
                    Available unspentTxOuts: ${JSON.stringify(myUnspentTxOuts)}`;

    throw Error(eMsg);
}
