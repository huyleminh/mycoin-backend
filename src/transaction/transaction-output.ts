import { WalletKeyAgent } from "../common/utils";

export class UnspentTxOutput {
    constructor(
        public readonly txOutputId: string,
        public readonly txOutputIndex: number,
        public readonly address: string,
        public readonly amount: number,
    ) {}
}

export class TransactionOutput {
    constructor(public address: string, public amount: number) {}

    static isValidTxOutStructure(txOut: TransactionOutput): boolean {
        if (!txOut) {
            console.log("txOut is null");
            return false;
        }

        if (typeof txOut.address !== "string") {
            console.log("invalid address type in txOut");
            return false;
        }

        const walletKeyAgent = new WalletKeyAgent();
        if (!walletKeyAgent.verifyAddress(txOut.address)) {
            console.log("invalid TxOut address");
            return false;
        }

        if (typeof txOut.amount !== "number") {
            console.log("invalid amount type in txOut");
            return false;
        }
        return true;
    }
}

export const findUnspentTxOutput = (
    transactionId: string,
    index: number,
    aUnspentTxOuts: UnspentTxOutput[],
): UnspentTxOutput | null => {
    return aUnspentTxOuts.find((uTxO) => uTxO.txOutputId === transactionId && uTxO.txOutputIndex === index) || null;
};
