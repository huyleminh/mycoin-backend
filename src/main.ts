import compression from "compression";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import morgan from "morgan";
import { env } from "process";
import { errorHandlerMiddleware } from "./common/middlewares";
import { AccessLogStream, Logger } from "./common/utils";
import { APP_CONFIG } from "./infrastructure/configs";
import { AppControllers } from "./routes";
import { bootstrapSocketServer } from "./socket";
import { initMinerKeyStore, initMinerWallet } from "./wallet";

env.TZ = "Asia/Ho_Chi_Minh";

const PORT = APP_CONFIG.appPort;
const app = express();
const httpServer = createServer(app);

async function bootstrap() {
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

    // handle API route here
    AppControllers.forEach((controller) => app.use(controller.path, controller.handler));

    // 404
    app.use(function (_req, res, _next) {
        res.status(404).json({ code: 404, message: "Not Found" });
    });

    // error
    app.use(errorHandlerMiddleware);

    httpServer.listen(PORT, () => {
        Logger.info(`Server is listening on port:${PORT}`);
    });
}

// Run http server
bootstrap();

// Run socket server
bootstrapSocketServer();

// Init wallet
initMinerWallet();
initMinerKeyStore();
