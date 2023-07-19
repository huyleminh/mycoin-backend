import { Request, Response } from "express";
import { Blockchain, generateNextBlock } from "../blockchain/blockchain";
import { BadRequestException } from "../common/exceptions";
import { DataResponse } from "../core/response";
import { BlockchainSocketSender } from "../socket/senders";

export function getBlockChainInformation(_req: Request, res: Response) {
    const chain = Blockchain.getInstance();

    res.json(new DataResponse(chain.chain).toJSON());
}

export function mineBlock(_req: Request, res: Response) {
    const block = generateNextBlock();

    if (!block) {
        throw new BadRequestException(400, "Fail to add new block to chain, please try again");
    }

    res.json(new DataResponse(block).toJSON());

    // add success -> broadcast
    BlockchainSocketSender.broadcastLatestBlockResponse();
}

export function getBlockDetail(req: Request, res: Response) {
    const { blockHash } = req.params;

    const blockchain = Blockchain.getInstance().chain;

    const block = blockchain.find((block) => block.hash === blockHash);
    if (!block) {
        throw new BadRequestException(400, "Block not found");
    }

    res.json(new DataResponse({ ...block }));
}
