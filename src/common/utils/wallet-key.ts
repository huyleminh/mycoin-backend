import { ec } from "elliptic";

const EC = new ec("secp256k1");

export class WalletKeyAgent {
    generateKeyPair() {
        const keyPair = EC.genKeyPair();

        return {
            privateKey: keyPair.getPrivate().toString("hex"),
            publicKey: keyPair.getPublic().encode("hex", false),
        };
    }

    getPublicAddress(privateKey: string) {
        return EC.keyFromPrivate(privateKey, "hex").getPublic().encode("hex", false);
    }

    // valid address is a valid ecdsa public key in the 04 + X-coordinate + Y-coordinate format
    verifyAddress(address: string): boolean {
        if (address.length !== 130) {
            console.log(address);
            console.log("invalid public key length");
            return false;
        }

        if (address.match("^[a-fA-F0-9]+$") === null) {
            console.log("public key must contain only hex characters");
            return false;
        }

        if (!address.startsWith("04")) {
            console.log("public key must start with 04");
            return false;
        }

        return true;
    }
}
