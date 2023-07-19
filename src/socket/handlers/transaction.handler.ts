import { getUnspentTxOuts } from "../../blockchain/blockchain";
import { Logger } from "../../common/utils";
import { SocketMessage } from "../../core/types";
import { Transaction } from "../../blockchain/transaction/transaction";
import { TransactionPool } from "../../blockchain/transaction/transaction-pool";
import { TransactionSocketSender } from "../senders";

export function handleReceivedTransactions(message: SocketMessage) {
    Logger.info("--- Handle received new transactions ---");

    const receivedTransactions: Transaction[] = message.data;

    Logger.debug("Received: ", JSON.stringify(receivedTransactions));

    if (!receivedTransactions) {
        console.log("invalid transaction received: %s", JSON.stringify(message.data));
        return;
    }

    const poolInst = TransactionPool.getInstance();
    receivedTransactions.forEach((transaction: Transaction) => {
        try {
            poolInst.addTransaction(transaction, getUnspentTxOuts());
            // if no error is thrown, transaction was indeed added to the pool
            // let's broadcast transaction pool
            TransactionSocketSender.broadcastTransactionPoolRepsonse();
        } catch (e: any) {
            console.log(e.message);
        }
    });
}
