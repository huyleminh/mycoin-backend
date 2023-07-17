import { Request, Response } from "express";
import { Logger } from "../utils";

export function errorHandlerMiddleware(error: any, _req: Request, res: Response) {
    Logger.error(error);
    res.sendStatus(500).send("Internal Server Error");
}
