import { getUnspentTxOuts } from "../../blockchain";
import { SocketMessage } from "../../core/types";
import { Transaction } from "../../transaction/transaction";
import { TransactionPool } from "../../transaction/transaction-pool";
import { TransactionSocketSender } from "../senders";

export function handleReceivedTransactions(message: SocketMessage) {
    const receivedTransactions: Transaction[] = message.data;

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
