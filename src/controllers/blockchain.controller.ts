import { Request, Response } from "express";
import { Blockchain, generateNextBlock } from "../blockchain";
import { DataResponse } from "../core/response";
import { BadRequestException } from "../common/exceptions";
import { BlockchainSocketHandlers } from "../socket/handlers";

export function getBlockChainInformation(_req: Request, res: Response) {
    const chain = Blockchain.getInstance();

    res.json(new DataResponse(chain).toJSON());
}

export function mineBlock(_req: Request, res: Response) {
    const chain = Blockchain.getInstance();
    const block = generateNextBlock(chain.getLatestBlock(), "Second block data");

    if (!block) {
        throw new BadRequestException(400, "Fail to add new block to chain, please try again");
    }

    res.json(new DataResponse(block).toJSON());

    // add success -> broadcast
    BlockchainSocketHandlers.broadcastLatestBlock(block);
}
