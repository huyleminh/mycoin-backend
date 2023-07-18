import { Request, Response } from "express";
import { WalletKeyAgent } from "../common/utils";
import { DataResponse } from "../core/response";

export function getWalletAddress(_req: Request, res: Response) {
    const r = new WalletKeyAgent().generateKeyPair();

    res.json(new DataResponse(r));
}
