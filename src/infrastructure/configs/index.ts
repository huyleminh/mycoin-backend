import * as dotenv from "dotenv";
dotenv.config();

export const APP_CONFIG = {
    appPort: process.env.PORT ? +process.env.PORT : 5000,
    logLevel: process.env.LOG_LEVEL || "info",
    logDriver: process.env.LOG_DRIVER || "console",
    powerBy: process.env.POWER_BY || "",

    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    rsa: {
        publicKey: process.env.RSA_PUBLIC_KEY,
    },
} as const;

export const CORS_CONFIG = {
    origin: process.env.ORIGIN || "*",
    credential: Boolean(process.env.CREDENTIAL).valueOf() || false,
} as const;
