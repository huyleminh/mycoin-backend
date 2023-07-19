import _ from "lodash";
import { BlockchainSocketSender } from "../socket/senders";
import { getPublicKey } from "../wallet";
import { Block } from "./block";
import { Transaction, getCoinbaseTransaction, processTransactions } from "./transaction/transaction";
import { TransactionInput } from "./transaction/transaction-input";
import { TransactionOutput, UnspentTxOutput } from "./transaction/transaction-output";
import { TransactionPool } from "./transaction/transaction-pool";
import { Logger, getCurrentTimestampAsSecond } from "../common/utils";

// in seconds
const BLOCK_GENERATION_INTERVAL: number = 10;

// in blocks
const DIFFICULTY_ADJUSTMENT_INTERVAL: number = 10;

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

        if (!retVal) {
            Logger.debug("Cannot add new block: block is not valid in terms of transactions");
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

            const genesisBlock: Block = new Block(0, "", [genesisTransaction], getCurrentTimestampAsSecond());

            Blockchain._instance = new Blockchain(genesisBlock);
        }

        return Blockchain._instance;
    }

    static isValidChainStructure(blockchain: Block[]) {
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
                Logger.debug("Get unspentTxOutput from chain: invalid transactions in blockchain");
                return null;
            }
        }

        return aUnspentTxOuts;
    }
}

export function generateNextRawBlock(previousBlock: Block, blockData: any): Block | null {
    const nextIndex: number = previousBlock.index + 1;
    const newBlock: Block = new Block(nextIndex, previousBlock.hash, blockData, getCurrentTimestampAsSecond());

    newBlock.mineBlock();
    const isBlockAdded = Blockchain.getInstance().addBlock(newBlock);

    return isBlockAdded ? newBlock : null;
}

export function generateNextBlock() {
    const chain = Blockchain.getInstance();
    const poolInst = TransactionPool.getInstance();

    const minerAddress = getPublicKey();

    const coinbaseTx: Transaction = getCoinbaseTransaction(minerAddress, chain.getLatestBlock().index + 1);

    const blockData: Transaction[] = [coinbaseTx].concat(poolInst.pool);

    return generateNextRawBlock(chain.getLatestBlock(), blockData);
}

let unspentTxOuts: UnspentTxOutput[] = processTransactions(Blockchain.getInstance().chain[0].data, [], 0) || [];

export function getUnspentTxOuts(): UnspentTxOutput[] {
    return _.cloneDeep(unspentTxOuts);
}

export function setUnspentTxOuts(newUnspentTxOut: UnspentTxOutput[]) {
    Logger.debug("Update unspentTxouts with: %s", JSON.stringify(newUnspentTxOut));
    unspentTxOuts = newUnspentTxOut;
}
