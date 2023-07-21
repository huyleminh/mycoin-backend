import { Logger, WalletKeyAgent } from "../../common/utils";

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
            Logger.error("Check output structure: txOut is null");
            return false;
        }

        if (typeof txOut.address !== "string") {
            Logger.error("Check output structure: invalid address type in txOut");
            return false;
        }

        const walletKeyAgent = new WalletKeyAgent();
        if (!walletKeyAgent.verifyAddress(txOut.address)) {
            Logger.error("Check output structure: invalid TxOut address");
            return false;
        }

        if (typeof txOut.amount !== "number") {
            Logger.error("Check output structure: invalid amount type in txOut");
            return false;
        }
        return true;
    }
}

export function findUnspentTxOutput(
    txOutputId: string,
    index: number,
    aUnspentTxOuts: UnspentTxOutput[],
): UnspentTxOutput | null {
    return aUnspentTxOuts.find((uTxO) => uTxO.txOutputId === txOutputId && uTxO.txOutputIndex === index) || null;
}
