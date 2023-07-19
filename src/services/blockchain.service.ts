import { TransactionService } from ".";
import { Blockchain, generateNextRawBlock } from "../blockchain";
import { Transaction, TransactionPool } from "../blockchain/transaction";
import { getPublicKey } from "../wallet";

export function generateNextBlock() {
    const chain = Blockchain.getInstance();
    const poolInst = TransactionPool.getInstance();

    const minerAddress = getPublicKey();

    const coinbaseTx: Transaction = TransactionService.getCoinbaseTransaction(
        minerAddress,
        chain.getLatestBlock().index + 1,
    );

    const blockData: Transaction[] = [coinbaseTx].concat(poolInst.pool);

    return generateNextRawBlock(chain.getLatestBlock(), blockData);
}
