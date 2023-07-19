import * as ecdsa from "elliptic";
import { HexaConverter, Logger, WalletKeyAgent } from "../../common/utils";
import { UnspentTxOutput, findUnspentTxOutput } from "./transaction-output";

const ec = new ecdsa.ec("secp256k1");

export class TransactionInput {
    constructor(public txOutputId: string, public txOutputIndex: number, public signature: string) {}

    // TODO: check throw exception
    calculateSignature(ownerPrivateKey: string, dataToSign: string, aUnspentTxOuts: UnspentTxOutput[]): string {
        const referencedUnspentTxOut = findUnspentTxOutput(this.txOutputId, this.txOutputIndex, aUnspentTxOuts);

        if (!referencedUnspentTxOut) {
            Logger.debug("could not find referenced txOut");
            throw Error();
        }
        const referencedAddress = referencedUnspentTxOut.address;

        const walletKeyAgent = new WalletKeyAgent();
        const ownerPublicKey = walletKeyAgent.getPublicAddress(ownerPrivateKey);

        if (ownerPublicKey !== referencedAddress) {
            Logger.debug(
                "trying to sign an input with private key that does not match the address that is referenced in txIn",
            );
            throw Error();
        }

        const key = ec.keyFromPrivate(ownerPrivateKey, "hex");
        const signature = new HexaConverter().fromByteArray(key.sign(dataToSign).toDER());

        return signature;
    }

    static isStructureValid(txIn: TransactionInput): boolean {
        if (!txIn) {
            Logger.debug("Check TxInput structure: txIn is null");
            return false;
        }

        if (typeof txIn.signature !== "string") {
            Logger.debug("Check TxInput structure: invalid signature type in txIn");
            return false;
        }

        if (typeof txIn.txOutputId !== "string") {
            Logger.debug("Check TxInput structure: invalid txOutId type in txIn");
            return false;
        }

        if (typeof txIn.txOutputIndex !== "number") {
            Logger.debug("Check TxInput structure: invalid txOutIndex type in txIn");
            return false;
        }

        return true;
    }
}
