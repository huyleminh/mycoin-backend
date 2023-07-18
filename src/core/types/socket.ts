export type SocketMessage<T = any> = {
    eventName: string;
    data: T;
};
