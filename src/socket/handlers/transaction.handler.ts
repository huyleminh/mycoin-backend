import { SocketMessage } from "../../core/types";
import { Transaction } from "../../transaction/transaction";
import { TransactionPool } from "../../transaction/transaction-pool";
import { SOCKET_EVENT_NAME } from "../common/constants";
import { SocketWriter } from "../common/utils";
import { getAllSocket } from "../server";

export function broadcastTransactionPool() {
    const message: SocketMessage<Transaction[]> = {
        eventName: SOCKET_EVENT_NAME.transactionPoolResponse,
        data: TransactionPool.getInstance().pool,
    };

    const wss = getAllSocket();
    SocketWriter.broadcastMessage(wss, message);
}
