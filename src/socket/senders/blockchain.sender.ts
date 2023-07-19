import { WebSocket } from "ws";
import { Block } from "../../blockchain/block";
import { Blockchain } from "../../blockchain/blockchain";
import { SocketMessage } from "../../core/types";
import { SOCKET_EVENT_NAME } from "../common/constants";
import { SocketWriter } from "../common/utils";
import { getAllSocket } from "../server";

export function broadcastLatestBlockResponse(): void {
    const message: SocketMessage<Block[]> = {
        eventName: SOCKET_EVENT_NAME.blockchainResponse,
        data: [Blockchain.getInstance().getLatestBlock()],
    };

    const wss = getAllSocket();
    SocketWriter.broadcastMessage(wss, message);
}

export function sendWholeChainResponse(ws: WebSocket): void {
    const message: SocketMessage<Block[]> = {
        eventName: SOCKET_EVENT_NAME.blockchainResponse,
        data: Blockchain.getInstance().chain,
    };

    SocketWriter.writeMessage(ws, message);
}

export function sendChainLengthQuery(ws: WebSocket) {
    const message: SocketMessage<null> = {
        eventName: SOCKET_EVENT_NAME.queryLatest,
        data: null,
    };

    SocketWriter.writeMessage(ws, message);
}
