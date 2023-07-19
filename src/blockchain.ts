import crypto from "crypto";
import _ from "lodash";
import { BinaryConverter } from "./common/utils";
import { BlockchainSocketSender } from "./socket/senders";
import { Transaction, getCoinbaseTransaction, processTransactions } from "./transaction/transaction";
import { TransactionInput } from "./transaction/transaction-input";
import { TransactionOutput, UnspentTxOutput } from "./transaction/transaction-output";
import { TransactionPool } from "./transaction/transaction-pool";

const getCurrentTimestamp = (): number => Math.round(new Date().getTime() / 1000);
// in seconds
const BLOCK_GENERATION_INTERVAL: number = 10;

// in blocks
const DIFFICULTY_ADJUSTMENT_INTERVAL: number = 10;

export class Block {
    public hash: string;
    public nonce = 0;
    public difficulty = 0;

    constructor(
        public index: number,
        public previousHash: string,
        public data: Transaction[],
        public timestamp: number,
    ) {
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
            typeof block.timestamp === "number" &&
            typeof block.data === "object"
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

        const retVal = processTransactions(block.data, getUnspentTxOuts(), block.index);

        if (retVal === null) {
            console.log("block is not valid in terms of transactions");
            return false;
        }

        this.chain.push(block);

        setUnspentTxOuts(retVal);

        TransactionPool.getInstance().update(unspentTxOuts);
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
        const isStructureValid = Blockchain.isValidChainStructure(newChain);
        const aUnspentTxOuts = Blockchain.getUnspentTxOutput(newChain);

        const validChain = isStructureValid && aUnspentTxOuts !== null;

        const currentAccDiff = Blockchain.getAccumulatedDifficulty(this.chain);
        const newAccDiff = Blockchain.getAccumulatedDifficulty(newChain);

        if (!validChain || newAccDiff <= currentAccDiff) {
            return false;
        }

        this.chain = newChain;

        setUnspentTxOuts(aUnspentTxOuts);

        TransactionPool.getInstance().update(aUnspentTxOuts);

        BlockchainSocketSender.broadcastLatestBlockResponse();

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
            const genesisTransaction = new Transaction(
                [new TransactionInput("", 0, "")],
                [
                    new TransactionOutput(
                        "04bfcab8722991ae774db48f934ca79cfb7dd991229153b9f732ba5334aafcd8e7266e47076996b55a14bf9913ee3145ce0cfc1372ada8ada74bd287450313534a",
                        50,
                    ),
                ],
            );

            const genesisBlock: Block = new Block(0, "", [genesisTransaction], getCurrentTimestamp());

            Blockchain._instance = new Blockchain(genesisBlock);
        }

        return Blockchain._instance;
    }

    static isValidChainStructure(blockchain: Block[]) {
        //     const isValidGenesis = (block: Block): boolean => {
        //         return JSON.stringify(block) === JSON.stringify(genesisBlock);
        //     };

        //     if (!isValidGenesis(blockchainToValidate[0])) {
        //         return null;
        //     }
        /*
            Validate each block in the chain. The block is valid if the block structure is valid
            and the transaction are valid
         */

        for (let i = 1; i < blockchain.length; i++) {
            const currentBlock = blockchain[i];
            const previousBlock = blockchain[i - 1];

            if (!Block.isNewBlockValid(previousBlock, currentBlock)) {
                return false;
            }
        }
        return true;
    }

    /**
     * @description If return null -> blockchain's transactions is invalid
     */
    static getUnspentTxOutput(blockchain: Block[]) {
        let aUnspentTxOuts: UnspentTxOutput[] = [];

        for (let i = 0; i < blockchain.length; i++) {
            const currentBlock = blockchain[i];

            const temp = processTransactions(currentBlock.data, aUnspentTxOuts, currentBlock.index);

            if (!temp) {
                console.log("invalid transactions in blockchain");
                return null;
            }
        }

        return aUnspentTxOuts;
    }
}

export function generateNextRawBlock(previousBlock: Block, blockData: any): Block | null {
    const nextIndex: number = previousBlock.index + 1;
    const newBlock: Block = new Block(nextIndex, previousBlock.hash, blockData, getCurrentTimestamp());

    newBlock.mineBlock();
    const isBlockAdded = Blockchain.getInstance().addBlock(newBlock);

    return isBlockAdded ? newBlock : null;
}

export function generateNextBlock() {
    const chain = Blockchain.getInstance();
    const coinbaseTx: Transaction = getCoinbaseTransaction(
        // server key
        "0403b1c8466b2f15e4a60f4117334f14d68b1f85854d6ba12f404fdad9403c60994f57f1d17d28b82b5bc8f63832d93e05cce890084d0f5e094202e6e900f63cab",
        chain.getLatestBlock().index + 1,
    );
    const blockData: Transaction[] = [coinbaseTx].concat(TransactionPool.getInstance().pool);
    return generateNextRawBlock(chain.getLatestBlock(), blockData);
}

let unspentTxOuts: UnspentTxOutput[] = processTransactions(Blockchain.getInstance().chain[0].data, [], 0) || [];

export function getUnspentTxOuts(): UnspentTxOutput[] {
    return _.cloneDeep(unspentTxOuts);
}

export function setUnspentTxOuts(newUnspentTxOut: UnspentTxOutput[]) {
    console.log("replacing unspentTxouts with: %s", newUnspentTxOut);
    unspentTxOuts = newUnspentTxOut;
}
