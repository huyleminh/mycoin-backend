import { WebSocket } from "ws";
import { SocketMessage } from "../../core/types";
import { Transaction } from "../../blockchain/transaction/transaction";
import { TransactionPool } from "../../blockchain/transaction/transaction-pool";
import { SOCKET_EVENT_NAME } from "../common/constants";
import { SocketWriter } from "../common/utils";
import { getAllSocket } from "../server";

export function broadcastTransactionPoolRepsonse() {
    const message: SocketMessage<Transaction[]> = {
        eventName: SOCKET_EVENT_NAME.transactionPoolResponse,
        data: TransactionPool.getInstance().pool,
    };

    const wss = getAllSocket();
    SocketWriter.broadcastMessage(wss, message);
}

export function sendTransactionPoolResponse(ws: WebSocket) {
    const message: SocketMessage<Transaction[]> = {
        eventName: SOCKET_EVENT_NAME.transactionPoolResponse,
        data: TransactionPool.getInstance().pool,
    };

    SocketWriter.writeMessage(ws, message);
}

export function broadcastTransactionPoolQuery() {
    const message: SocketMessage<null> = {
        eventName: SOCKET_EVENT_NAME.queryTransactionPool,
        data: null,
    };

    const wss = getAllSocket();
    SocketWriter.broadcastMessage(wss, message);
}
