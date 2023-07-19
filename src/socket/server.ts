import { v4 } from "uuid";
import WebSocket, { WebSocket as IWebSocket } from "ws";
import { Logger } from "../common/utils";
import { SocketMessage } from "../core/types";
import { SOCKET_CONFIG } from "../infrastructure/configs";
import { SOCKET_EVENT_NAME } from "./common/constants";
import { BlockchainSocketHandler, TransactionSocketHandler } from "./handlers";
import { BlockchainSocketSender, TransactionSocketSender } from "./senders";

type SocketPoolItem = {
    id: string;
    socket: IWebSocket;
    address: string;
};

const sockets: SocketPoolItem[] = [];

export function getAllSocketPoolItem() {
    return sockets;
}

export function getAllSocket() {
    return getAllSocketPoolItem().map((s) => s.socket);
}

function closeConnection(socketItem: SocketPoolItem) {
    Logger.info("Close connection to " + socketItem.address);

    const indexToRemove = sockets.findIndex((item) => item.id === socketItem.id);
    sockets.splice(indexToRemove, 1);
}

function initMessageHandler(ws: WebSocket) {
    ws.on("message", (data: string) => {
        try {
            const message: SocketMessage = JSON.parse(data);

            Logger.debug(`Received message: ${message.eventName}`);

            switch (message.eventName) {
                case SOCKET_EVENT_NAME.queryLatest:
                    BlockchainSocketSender.broadcastLatestBlockResponse();
                    break;
                case SOCKET_EVENT_NAME.queryAll:
                    BlockchainSocketSender.sendWholeChainResponse(ws);
                    break;
                case SOCKET_EVENT_NAME.blockchainResponse:
                    BlockchainSocketHandler.handleReceivedBlockchain(message);
                    break;
                case SOCKET_EVENT_NAME.queryTransactionPool:
                    TransactionSocketSender.sendTransactionPoolResponse(ws);
                    break;
                case SOCKET_EVENT_NAME.transactionPoolResponse:
                    TransactionSocketHandler.handleReceivedTransactions(message);
                    break;
            }
        } catch (e) {
            Logger.error("-------- Listening message error")
            Logger.error(e);
        }
    });
}

function initWebSocketConnection(socketItem: SocketPoolItem) {
    const ws = socketItem.socket;
    sockets.push(socketItem);

    ws.on("close", () => closeConnection(socketItem));
    ws.on("error", () => closeConnection(socketItem));

    initMessageHandler(ws);

    BlockchainSocketSender.sendChainLengthQuery(ws);

    // query transactions pool only some time after chain query
    let timeoutId = setTimeout(() => {
        TransactionSocketSender.broadcastTransactionPoolQuery();

        clearTimeout(timeoutId);
    }, 500);
}

export function connectToPeerAsync(peerAddress: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const client = new WebSocket(peerAddress);

        client.on("open", () => {
            const address = (client as any)._socket.remoteAddress + ":" + (client as any)._socket.remotePort;
            initWebSocketConnection({ id: v4(), socket: client, address });

            resolve();
        });
        client.on("error", (error) => {
            const reason = error.message;
            reject(reason);
        });
    });
}

export function bootstrapSocketServer() {
    const PORT = SOCKET_CONFIG.port;
    const server = new WebSocket.Server({ port: PORT });

    Logger.info(`Socket server is listening on port ${PORT}`);

    server.on("connection", (ws: WebSocket, req) => {
        const socketItem: SocketPoolItem = {
            id: v4(),
            socket: ws,
            address: req.socket.remoteAddress || "unknown",
        };
        initWebSocketConnection(socketItem);
    });
}
