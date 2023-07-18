import crypto from "crypto";
import { BinaryConverter } from "./common/utils";
import { BlockchainSocketHandlers } from "./socket/handlers";

const getCurrentTimestamp = (): number => Math.round(new Date().getTime() / 1000);
// in seconds
const BLOCK_GENERATION_INTERVAL: number = 10;

// in blocks
const DIFFICULTY_ADJUSTMENT_INTERVAL: number = 10;

export class Block {
    public hash: string;
    public nonce = 0;
    public difficulty = 0;

    constructor(public index: number, public previousHash: string, public data: any, public timestamp: number) {
        this.hash = this.calculateHash();
    }

    calculateHash() {
        const stringToHash = this.index + this.previousHash + this.timestamp + this.data + this.nonce;
        const hash = crypto.createHash("sha256");
        hash.update(stringToHash);

        return hash.digest().toString("hex");
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
            typeof block.timestamp === "number"
            // && typeof block.data === "object"
        );
    }

    static isBlockTimestampValid(previousBlock: Block, currentBlock: Block): boolean {
        return previousBlock.timestamp < currentBlock.timestamp && currentBlock.timestamp - 15 < getCurrentTimestamp();
    }

    static isNewBlockValid(previousBlock: Block, currentBlock: Block): boolean {
        // const isValidGenesis = (block: Block): boolean => {
        //     return JSON.stringify(block) === JSON.stringify(genesisBlock);
        // };

        // if (!isValidGenesis(blockchainToValidate[0])) {
        //     return null;
        // }

        if (!Block.isBlockStructureValid(currentBlock)) {
            console.log("Invalid structure");
            return false;
        }

        if (currentBlock.index - previousBlock.index !== 1) {
            console.log("Invalid index");
            return false;
        }

        if (previousBlock.hash !== currentBlock.previousHash) {
            console.log("Invalid hash - prev");
            return false;
        }

        if (!Block.isBlockTimestampValid(previousBlock, currentBlock)) {
            console.log("Invalid time");
            return false;
        }

        if (currentBlock.calculateHash() !== currentBlock.hash) {
            console.log("Invalid hash");
            return false;
        }

        return true;
    }
}

export class Blockchain {
    public chain: Block[];

    private static _instance: Blockchain;

    private constructor(genesis: Block) {
        this.chain = [genesis];
    }

    getLatestBlock(): Block {
        return this.chain[this.chain.length - 1];
    }

    addBlock(block: Block) {
        if (!Block.isNewBlockValid(this.getLatestBlock(), block)) {
            return false;
        }

        // const retVal: UnspentTxOut[] = processTransactions(newBlock.data, getUnspentTxOuts(), newBlock.index);
        // if (retVal === null) {
        //     console.log("block is not valid in terms of transactions");
        //     return false;
        // } else {
        //     this.chain.push(block);
        //     setUnspentTxOuts(retVal);
        //     updateTransactionPool(unspentTxOuts);
        //     return true;
        // }

        this.chain.push(block);
        return true;
    }

    getCurrentDifficulty() {
        const latestBlock = this.getLatestBlock();
        if (latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && latestBlock.index !== 0) {
            return this.getAdjustedDifficulty();
        } else {
            return latestBlock.difficulty;
        }
    }

    getAdjustedDifficulty(): number {
        const latestBlock = this.getLatestBlock();
        const prevAdjustmentBlock: Block = this.chain[this.chain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];

        const timeExpected: number = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
        const timeTaken: number = latestBlock.timestamp - prevAdjustmentBlock.timestamp;

        if (timeTaken < timeExpected / 2) {
            return prevAdjustmentBlock.difficulty + 1;
        }
        if (timeTaken > timeExpected * 2) {
            return prevAdjustmentBlock.difficulty - 1;
        }
        return prevAdjustmentBlock.difficulty;
    }

    replaceChain(newChain: Block[]) {
        // const aUnspentTxOuts = isValidChain(newBlocks);
        // const validChain: boolean = aUnspentTxOuts !== null;
        const validChain = true;

        const currentAccDiff = Blockchain.getAccumulatedDifficulty(this.chain);
        const newAccDiff = Blockchain.getAccumulatedDifficulty(newChain);

        if (!validChain || newAccDiff <= currentAccDiff) {
            return false;
        }

        this.chain = newChain;
        // setUnspentTxOuts(aUnspentTxOuts);
        // updateTransactionPool(unspentTxOuts);
        BlockchainSocketHandlers.broadcastLatestBlock(this.getLatestBlock());

        return true;
    }

    static getAccumulatedDifficulty(blockchain: Block[]) {
        return blockchain
            .map((block) => block.difficulty)
            .map((difficulty) => Math.pow(2, difficulty))
            .reduce((a, b) => a + b);
    }

    static getInstance(): Blockchain {
        if (!Blockchain._instance) {
            const genesisBlock: Block = new Block(0, "", "This is genesis block", getCurrentTimestamp());

            Blockchain._instance = new Blockchain(genesisBlock);
        }

        return Blockchain._instance;
    }

    static isValidChain(blockchain: Blockchain): boolean {
        //     console.log("isValidChain:");
        //     console.log(JSON.stringify(blockchainToValidate));
        //     const isValidGenesis = (block: Block): boolean => {
        //         return JSON.stringify(block) === JSON.stringify(genesisBlock);
        //     };

        //     if (!isValidGenesis(blockchainToValidate[0])) {
        //         return null;
        //     }
        //     /*
        // Validate each block in the chain. The block is valid if the block structure is valid
        //   and the transaction are valid
        //  */
        //     let aUnspentTxOuts: UnspentTxOut[] = [];

        for (let i = 1; i < blockchain.chain.length; i++) {
            const currentBlock = blockchain.chain[i];
            const previousBlock = blockchain.chain[i - 1];

            if (!Block.isNewBlockValid(previousBlock, currentBlock)) {
                return false;
            }
        }
        return true;
    }
}

export function generateNextBlock(previousBlock: Block, blockData: any): Block | null {
    const nextIndex: number = previousBlock.index + 1;
    const newBlock: Block = new Block(nextIndex, previousBlock.hash, blockData, getCurrentTimestamp());

    newBlock.mineBlock();
    const isBlockAdded = Blockchain.getInstance().addBlock(newBlock);

    return isBlockAdded ? newBlock : null;
}
