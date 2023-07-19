import * as ecdsa from "elliptic";
import { HexaConverter } from "../common/utils";
import { UnspentTxOutput, findUnspentTxOutput } from "./transaction-output";

const ec = new ecdsa.ec("secp256k1");

const getPublicKey = (aPrivateKey: string): string => {
    return ec.keyFromPrivate(aPrivateKey, "hex").getPublic().encode("hex", false);
};

export class TransactionInput {
    constructor(public txOutputId: string, public txOutputIndex: number, public signature: string) {}

    calculateSignature(ownerPrivateKey: string, dataToSign: string, aUnspentTxOuts: UnspentTxOutput[]): string {
        const referencedUnspentTxOut = findUnspentTxOutput(this.txOutputId, this.txOutputIndex, aUnspentTxOuts);

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

    static isStructureValid(txIn: TransactionInput): boolean {
        if (txIn == null) {
            console.log("txIn is null");
            return false;
        }

        if (typeof txIn.signature !== "string") {
            console.log("invalid signature type in txIn");
            return false;
        }

        if (typeof txIn.txOutputId !== "string") {
            console.log("invalid txOutId type in txIn");
            return false;
        }

        if (typeof txIn.txOutputIndex !== "number") {
            console.log("invalid txOutIndex type in txIn");
            return false;
        }

        return true;
    }
}
