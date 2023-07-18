import { NextFunction, Request, Response } from "express";
import { Logger } from "../utils";
import { BaseException } from "../../core/exceptions";

export function errorHandlerMiddleware(error: any, _request: Request, response: Response, _next: NextFunction) {
    let status = 500;
    const responseError = {
        code: 500,
        message: "Internal Server Error",
    } as { code: number; message: string; data: any };

    let outMessage;

    if (error instanceof BaseException) {
        status = error.status;

        responseError.code = error.code;
        responseError.message = error.message;
        responseError.data = error.response;

        outMessage = error.errors && error.toString();
    }

    // handle error detaisl base on its name
    switch (error.name) {
        case "BadRequestException":
            break;
        default:
            outMessage = error;
            break;
    }

    // store error logging message
    outMessage && Logger.error(outMessage);

    // Send error response
    response.statusCode = status;
    response.status(status).json(responseError);
}
