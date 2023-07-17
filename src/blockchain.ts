import crypto from "crypto";

class Block {
    public hash: string;
    public nonce = 0;

    constructor(public index: number, public prevHash: string, public data: any, public timestamp: number) {
        this.hash = this.calculateHash();
    }

    public calculateHash() {
        const stringToHash = this.index + this.prevHash + this.timestamp + this.data + this.nonce;
        const hash = crypto.createHash("sha256");
        hash.update(stringToHash);

        return hash.digest().toString("hex");
    }
}

class Blockchain {
    public chain: Block[];
    constructor(genesis: Block) {
        this.chain = [genesis];
    }

    public getLatestBlock(): Block {
        return this.chain[this.chain.length - 1];
    }

    public isValidChain(): boolean {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (previousBlock.hash !== currentBlock.prevHash) {
                return false;
            }

            if (currentBlock.calculateHash() !== currentBlock.hash) {
                return false;
            }
        }
        return true;
    }

    public addBlock(block: Block) {
        // find the difficulty
        const difficulty = 5;
        const prefixToMatch = "0".repeat(difficulty);

        // verify hash with the difficulty
        while (!block.hash.startsWith(prefixToMatch)) {
            block.nonce++;
            block.hash = block.calculateHash();
        }

        this.chain.push(block);
    }
}

const generateNextBlock = (previousBlock: Block, blockData: string) => {
    const nextIndex: number = previousBlock.index + 1;
    const newBlock: Block = new Block(nextIndex, previousBlock.hash, blockData, Date.now());
    return newBlock;
};

const genesisBlock: Block = new Block(0, "", "This is genesis block", Date.now());

const blockChain = new Blockchain(genesisBlock);
blockChain.addBlock(generateNextBlock(blockChain.getLatestBlock(), "Second block"));
blockChain.addBlock(generateNextBlock(blockChain.getLatestBlock(), "Third block"));

console.log(blockChain);
console.log(`Is chain valid: ${blockChain.isValidChain()}`);
