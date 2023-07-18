import { NextFunction, Request, Response } from "express";

interface IRouteCallback {
    (req: Request, res: Response): void;
}
interface IAsyncRouteCallback {
    (req: Request, res: Response): Promise<void>;
}

/**
 * @description Handle all error while running controller and pass to the error-handler
 */
export const asyncRouteHandler = (callback: IRouteCallback | IAsyncRouteCallback) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await callback(req, res);
        } catch (error) {
            next(error);
        }
    };
};
