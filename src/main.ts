import compression from "compression";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import { env } from "process";
import { AccessLogStream, Logger } from "./common/utils";
import { errorHandlerMiddleware } from "./common/middlewares";

env.TZ = "Asia/Ho_Chi_Minh";

const PORT = 5000;

async function bootstrap() {
    const app = express();

    app.use(compression());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use(
        cors({
            origin: "*",
            allowedHeaders:
                "X-Requested-With, X-HTTP-Method-Override, X-Request-Id, Content-Type, Authorization, Accept",
            methods: "GET, POST, PUT, PATCH, DELETE",
        }),
    );

    app.use(morgan("combined", { stream: new AccessLogStream() }));

    // set custom headers
    app.use(function (_req, _res, next) {
        next();
    });

    // disable get favicon with 404 error
    app.get("/favicon.ico", (_req, res) => res.status(204).end());

    // 404
    app.use(function (_req, res, _next) {
        res.sendStatus(404);
    });

    // error
    app.use(errorHandlerMiddleware);

    app.listen(PORT, () => {
        Logger.info(`Server is listening on port:${PORT}`);
    });
}

// Run http server
bootstrap();
