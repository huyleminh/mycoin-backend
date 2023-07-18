import { Request, Response } from "express";
import { CreatedResponse } from "../core/response";

export function createTransaction(req: Request, res: Response) {
    const { body } = req;
    const { amount, address } = body;

    // create
    // add pool
    // broadcast
    res.json(new CreatedResponse({ amount, address }));
}
