import CryptoJS from "crypto-js";
import { BinaryConverter, Logger, getCurrentTimestampAsSecond } from "../common/utils";
import { Blockchain } from "./blockchain";
import { Transaction } from "./transaction/transaction";

export class Block {
    public hash: string;
    public nonce = 0;
    public difficulty = 0;
    public data: Transaction[];

    constructor(public index: number, public previousHash: string, rawData: Transaction[], public timestamp: number) {
        this.data = rawData.map((d: Transaction) => {
            return new Transaction(d.owner, d.txInputList, d.txOutputList, d.timestamp);
        });

        this.hash = this.calculateHash();
    }

    calculateHash() {
        const stringToHash = this.index + this.previousHash + this.timestamp + JSON.stringify(this.data) + this.nonce;
        const hash = CryptoJS.SHA256(stringToHash);

        return hash.toString(CryptoJS.enc.Hex);
    }

    mineBlock() {
        // find the difficulty
        this.difficulty = Blockchain.getInstance().getCurrentDifficulty();

        const prefixToMatch = "0".repeat(this.difficulty);

        // verify hash with the difficulty
        const binaryConverter = new BinaryConverter();
        while (true) {
            const binaryHash = binaryConverter.fromHexValue(this.hash)!;

            if (binaryHash.startsWith(prefixToMatch)) {
                break;
            }

            this.nonce++;
            this.hash = this.calculateHash();
        }
    }

    static isBlockStructureValid(block: Block): boolean {
        return (
            typeof block.index === "number" &&
            typeof block.hash === "string" &&
            typeof block.previousHash === "string" &&
            typeof block.timestamp === "number" &&
            typeof block.data === "object"
        );
    }

    static isBlockTimestampValid(previousBlock: Block, currentBlock: Block): boolean {
        return (
            previousBlock.timestamp < currentBlock.timestamp &&
            currentBlock.timestamp - 15 < getCurrentTimestampAsSecond()
        );
    }

    static isNewBlockValid(previousBlock: Block, currentBlock: Block): boolean {
        if (!Block.isBlockStructureValid(currentBlock)) {
            Logger.debug("Check new block: Invalid structure");
            return false;
        }

        if (currentBlock.index !== previousBlock.index + 1) {
            Logger.debug("Check new block: Invalid index");
            return false;
        }

        if (previousBlock.hash !== currentBlock.previousHash) {
            Logger.debug("Check new block: Invalid hash - prev");
            return false;
        }

        if (!Block.isBlockTimestampValid(previousBlock, currentBlock)) {
            Logger.debug("Check new block: Invalid time");
            return false;
        }

        const calculatedHash = currentBlock.calculateHash();

        if (calculatedHash !== currentBlock.hash) {
            Logger.debug("Check new block: Invalid hash");
            return false;
        }

        return true;
    }
}
