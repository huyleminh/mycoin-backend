import WebSocket, { WebSocket as IWebSocket } from "ws";
import { Logger } from "../common/utils";
import { v4 } from "uuid";
import { SOCKET_CONFIG } from "../infrastructure/configs";
import { SocketMessage } from "../core/types";
import { SOCKET_EVENT_NAME } from "./common/constants";
import { BlockchainSocketHandlers } from "./handlers";

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
            console.log({ data, message });

            console.log("Received message: %s", message.eventName);

            switch (message.eventName) {
                // case MessageType.QUERY_LATEST:
                //     write(ws, responseLatestMsg());
                //     break;
                case SOCKET_EVENT_NAME.queryAll:
                    BlockchainSocketHandlers.sendWholeChainToWs(ws);
                    break;
                case SOCKET_EVENT_NAME.blockchainResponse:
                    BlockchainSocketHandlers.handleReceivedBlockchain(message);
                    break;
                // case MessageType.QUERY_TRANSACTION_POOL:
                //     write(ws, responseTransactionPoolMsg());
                //     break;
                case SOCKET_EVENT_NAME.transactionPoolResponse:
                    console.log("Recevied");
                    console.log(message.data);

                    //     const receivedTransactions: Transaction[] = JSONToObject<Transaction[]>(message.data);
                    //     if (receivedTransactions === null) {
                    //         console.log("invalid transaction received: %s", JSON.stringify(message.data));
                    //         break;
                    //     }
                    //     receivedTransactions.forEach((transaction: Transaction) => {
                    //         try {
                    //             handleReceivedTransaction(transaction);
                    //             // if no error is thrown, transaction was indeed added to the pool
                    //             // let's broadcast transaction pool
                    //             broadCastTransactionPool();
                    //         } catch (e) {
                    //             console.log(e.message);
                    //         }
                    //     });
                    break;
            }
        } catch (e) {
            console.log(e);
        }
    });
}

function initWebSocketConnection(socketItem: SocketPoolItem) {
    const ws = socketItem.socket;
    sockets.push(socketItem);

    ws.on("close", () => closeConnection(socketItem));
    ws.on("error", () => closeConnection(socketItem));

    initMessageHandler(ws);
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
