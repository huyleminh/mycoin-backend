import { getUnspentTxOutputPool } from "../../blockchain/blockchain";
import { Logger } from "../../common/utils";
import { SocketMessage } from "../../core/types";
import { Transaction } from "../../blockchain/transaction/transaction";
import { TransactionPool } from "../../blockchain/transaction/transaction-pool";
import { TransactionSocketSender } from "../senders";
import { TransactionInput } from "../../blockchain/transaction/transaction-input";
import { TransactionOutput } from "../../blockchain/transaction/transaction-output";

export function handleReceivedTransactions(message: SocketMessage) {
    Logger.info("--- Handle received new transactions ---");

    const receivedTransactions: Transaction[] = message.data;

    Logger.debug("Received: ", JSON.stringify(receivedTransactions));

    if (!receivedTransactions) {
        Logger.error("invalid transaction received: %s", JSON.stringify(message.data));
        return;
    }

    const constructedTxs = receivedTransactions.map((tx) => {
        const txInputList = tx.txInputList.map((txInput) => {
            return new TransactionInput(txInput.txOutputId, txInput.txOutputIndex, txInput.signature);
        });

        const txOutputList = tx.txOutputList.map((txOutput) => {
            return new TransactionOutput(txOutput.address, txOutput.amount);
        });

        return new Transaction(tx.owner, txInputList, txOutputList, tx.timestamp);
    });

    const poolInst = TransactionPool.getInstance();

    constructedTxs.forEach((transaction: Transaction) => {
        try {
            poolInst.addTransaction(transaction, getUnspentTxOutputPool());
            // if no error is thrown, transaction was indeed added to the pool
            // let's broadcast transaction pool
            TransactionSocketSender.broadcastTransactionPoolRepsonse();
        } catch (e: any) {
            Logger.error(e.message);
        }
    });
}
