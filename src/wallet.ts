import fs from "fs";
import { Logger, WalletKeyAgent } from "./common/utils";
import { UnspentTxOutput } from "./blockchain/transaction/transaction-output";
import _ from "lodash";
import { APP_CONFIG } from "./infrastructure/configs";
import { TransactionPool } from "./blockchain/transaction";

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
    return _(findUnspentTxOutputByAddress(address, unspentTxOuts))
        .map((uTxO) => uTxO.amount)
        .sum();
}

export function findUnspentTxOutputByAddress(ownerAddress: string, unspentTxOuts: UnspentTxOutput[]) {
    const unspentTxOutputList = _.filter(unspentTxOuts, (uTxO) => uTxO.address === ownerAddress);

    return filterTxPoolTxs(unspentTxOutputList);
}

function filterTxPoolTxs(unspentTxOuts: UnspentTxOutput[]): UnspentTxOutput[] {
    const txIns = _(TransactionPool.getInstance().pool)
        .map((tx) => tx.txInputList)
        .flatten()
        .value();

    const removable: UnspentTxOutput[] = [];
    for (const unspentTxOut of unspentTxOuts) {
        const txIn = _.find(txIns, (aTxIn) => {
            return aTxIn.txOutputIndex === unspentTxOut.txOutputIndex && aTxIn.txOutputId === unspentTxOut.txOutputId;
        });

        txIn && removable.push(unspentTxOut);
    }

    return _.without(unspentTxOuts, ...removable);
}
