import { Request, Response } from "express";
import { BadRequestException } from "../common/exceptions";
import { Logger } from "../common/utils";
import { CreatedResponse, DataResponse } from "../core/response";
import { connectToPeerAsync, getAllSocketPoolItem } from "../socket";

export async function registerPeerNodeServerAsync(req: Request, res: Response) {
    const { body } = req;
    const { address } = body;

    if (!address) {
        throw new BadRequestException(400, "Missing remote node socket address.");
    }

    try {
        await connectToPeerAsync(address);

        const response = new CreatedResponse("Connect successfully");
        res.status(201).json(response.toJSON());
    } catch (error) {
        Logger.error(error);
        throw new BadRequestException(400, "Cannot connect");
    }
}

export function getCurrentNodePeerList(_req: Request, res: Response) {
    const sockets = getAllSocketPoolItem();

    const result = sockets.map((s) => ({ id: s.id, address: s.address }));

    res.json(new DataResponse(result));
}
