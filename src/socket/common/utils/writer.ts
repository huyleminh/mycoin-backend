import WebSocket from "ws";
import * as fastSafeStringify from "fast-safe-stringify";
import { SocketMessage } from "../../../core/types/socket";

export function writeMessage<T extends SocketMessage>(ws: WebSocket, message: T) {
    ws.send(fastSafeStringify.default(message));
}

export function broadcastMessage<T extends SocketMessage>(wsList: WebSocket[], message: T) {
    wsList.forEach((socket) => writeMessage(socket, message));
}
