import { ec } from "elliptic";
// import crypto from "crypto";

const EC = new ec("secp256k1");

export class WalletKeyAgent {
    generateKeyPair() {
        const keyPair = EC.genKeyPair();

        return {
            privateKey: keyPair.getPrivate().toString("hex"),
            publicKey: keyPair.getPublic().encode("hex", false),
        };
    }
}
