import { Block } from "../../blockchain/block";
import { Blockchain } from "../../blockchain/blockchain";
import { Logger } from "../../common/utils";
import { SocketMessage } from "../../core/types/socket";
import { SOCKET_EVENT_NAME } from "../common/constants";
import { SocketWriter } from "../common/utils";
import { BlockchainSocketSender } from "../senders";
import { getAllSocket } from "../server";

export function handleReceivedBlockchain(message: SocketMessage) {
    const receivedBlocks: Block[] = message.data;

    const constructedChain = receivedBlocks.map((block) => {
        return new Block(block.index, block.previousHash, block.data, block.timestamp);
    });

    Logger.info("--- Handle received new chain ---");

    if (constructedChain.length === 0) {
        Logger.info("Received block chain size of 0");
        return;
    }

    const latestBlock: Block = constructedChain[constructedChain.length - 1];

    if (!Block.isBlockStructureValid(latestBlock)) {
        Logger.info("Block structuture not valid");
        return;
    }

    const localChain = Blockchain.getInstance();
    const localLatestBlock: Block = localChain.getLatestBlock();

    // local chain is longer
    if (latestBlock.index <= localLatestBlock.index) {
        Logger.info("received blockchain is not longer than received blockchain. Do nothing");
        return;
    }

    Logger.info(
        "Blockchain possibly behind. Local latest index: " +
            localLatestBlock.index +
            " Peer latest index: " +
            latestBlock.index,
    );

    if (localLatestBlock.hash === latestBlock.previousHash) {
        if (!localChain.addBlock(latestBlock)) {
            return;
        }

        // broadcastLatestBlock(localChain.getLatestBlock());
        BlockchainSocketSender.broadcastLatestBlockResponse();
        return;
    }

    // local chain includes genesis block only
    if (constructedChain.length === 1) {
        Logger.info("We have to query the chain from our peer");

        const wss = getAllSocket();
        SocketWriter.broadcastMessage(wss, { eventName: SOCKET_EVENT_NAME.queryAll, data: null });
        return;
    }

    Logger.info("Received blockchain is longer than current blockchain");
    localChain.replaceChain(receivedBlocks);
}
