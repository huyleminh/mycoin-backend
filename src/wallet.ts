import CryptoJS from "crypto-js";
import fs from "fs";
import _ from "lodash";
import { UnspentTxOutput } from "./blockchain/transaction/transaction-output";
import { Logger, WalletKeyAgent } from "./common/utils";
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

export function initMinerKeyStore(): void {
    if (fs.existsSync(APP_CONFIG.minerKeystoreLocation)) {
        return;
    }
    // keystore
    const dataToSign = JSON.stringify({
        privateKey: getPrivateKey(),
        publicKey: getPublicKey(),
        timestamp: new Date().getTime() / 1000,
    });

    const keystoreData = CryptoJS.AES.encrypt(dataToSign, APP_CONFIG.minerKeystorePassword).toString();
    fs.writeFileSync(APP_CONFIG.minerKeystoreLocation, JSON.stringify({key: keystoreData}));
    Logger.info(`Miner keystore file was generated and stored at ${APP_CONFIG.minerKeystoreLocation}`);
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
    const result = findUnspentTxOutputByAddress(address, unspentTxOuts);

    return _(result)
        .map((uTxO) => uTxO.amount)
        .sum();
}

export function findUnspentTxOutputByAddress(ownerAddress: string, unspentTxOuts: UnspentTxOutput[]) {
    const unspentTxOutputList = _.filter(unspentTxOuts, (uTxO) => uTxO.address === ownerAddress);

    return unspentTxOutputList;
}
