const dotenv = require("dotenv");

dotenv.config();

const path = require("path");
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const databaseModule = require("./src/config/database");
const initDatabaseModule = require("./src/database/init");
const botModule = require("./src/bot");
const adminRoutes = require("./src/web/adminRoutes");

const pool = databaseModule.pool || databaseModule;

const healthCheck =
    typeof databaseModule.healthCheck === "function"
        ? databaseModule.healthCheck
        : async () => {
              try {
                  await pool.query("SELECT 1");

                  return {
                      connected: true,
                      message: "Database connection is healthy",
                  };
              } catch (error) {
                  return {
                      connected: false,
                      message: error.message,
                  };
              }
          };

const initDatabase =
    typeof initDatabaseModule === "function"
        ? initDatabaseModule
        : initDatabaseModule.initDatabase;

const registerBot =
    typeof botModule === "function"
        ? botModule
        : botModule.registerBot;

const requiredVariables = [
    "BOT_TOKEN",
    "DATABASE_URL",
    "ADMIN_USERNAME",
    "ADMIN_PASSWORD",
];

for (const variableName of requiredVariables) {
    if (!process.env[variableName]) {
        throw new Error(
            `Thiếu biến môi trường ${variableName}`,
        );
    }
}

if (typeof initDatabase !== "function") {
    throw new Error(
        "Không tìm thấy hàm initDatabase trong src/database/init.js",
    );
}

if (typeof registerBot !== "function") {
    throw new Error(
        "Không tìm thấy hàm registerBot trong src/bot.js",
    );
}

const app = express();
const port = Number(process.env.PORT) || 8080;

/*
 * Railway chạy phía sau proxy.
 * Dòng này xử lý lỗi X-Forwarded-For của express-rate-limit.
 */
app.set("trust proxy", 1);

app.disable("x-powered-by");

app.set("view engine", "ejs");
app.set(
    "views",
    path.join(__dirname, "views"),
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "100kb",
    }),
);

app.use(
    express.json({
        limit: "100kb",
    }),
);

app.use(
    express.static(
        path.join(__dirname, "public"),
    ),
);

app.get("/", (_req, res) => {
    res.redirect("/admin");
});

app.get("/health", async (_req, res) => {
    try {
        const status = await healthCheck();

        res
            .status(status.connected ? 200 : 503)
            .json({
                status: status.connected
                    ? "ok"
                    : "degraded",

                database: status.connected
                    ? "connected"
                    : "disconnected",

                message:
                    status.message ||
                    (status.connected
                        ? "Database connection is healthy"
                        : "Database connection failed"),
            });
    } catch (error) {
        res.status(503).json({
            status: "degraded",
            database: "disconnected",
            message: error.message,
        });
    }
});

app.use("/admin", adminRoutes);

app.use((_req, res) => {
    res.status(404).send(
        "Không tìm thấy trang.",
    );
});

app.use((error, _req, res, next) => {
    console.error(
        "WEB ERROR:",
        error,
    );

    if (res.headersSent) {
        return next(error);
    }

    res.status(
        error.statusCode || 500,
    ).send(
        error.publicMessage ||
            "Hệ thống đang gặp lỗi. Vui lòng thử lại.",
    );
});

let server;
let bot;
let shuttingDown = false;

async function startSystem() {
    await initDatabase();

    bot = new TelegramBot(
        process.env.BOT_TOKEN,
        {
            polling: false,
        },
    );

    const botInfo = await bot.getMe();

    registerBot(bot);

    bot.on(
        "polling_error",
        (error) => {
            console.error(
                "TELEGRAM POLLING ERROR:",
                error.message,
            );
        },
    );

    if (
        typeof bot.deleteWebHook ===
        "function"
    ) {
        await bot
            .deleteWebHook()
            .catch((error) => {
                console.log(
                    "DELETE WEBHOOK:",
                    error.message,
                );
            });
    }

    await bot.startPolling({
        interval: 300,
        params: {
            timeout: 30,
        },
    });

    server = app.listen(
        port,
        () => {
            console.log(
                "================================",
            );
            console.log(
                "Thu Chi Luong System Started",
            );
            console.log(
                `PORT: ${port}`,
            );
            console.log(
                "DATABASE: CONNECTED",
            );
            console.log(
                `BOT: @${botInfo.username}`,
            );
            console.log(
                "================================",
            );
        },
    );
}

async function shutdown(signal) {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;

    console.log(
        `${signal}: stopping safely...`,
    );

    try {
        if (bot) {
            await bot.stopPolling();
        }
    } catch (error) {
        console.error(
            "STOP POLLING ERROR:",
            error.message,
        );
    }

    if (server) {
        await new Promise(
            (resolve) => {
                server.close(resolve);
            },
        );
    }

    try {
        if (
            pool &&
            typeof pool.end ===
                "function"
        ) {
            await pool.end();
        }
    } catch (error) {
        console.error(
            "DATABASE CLOSE ERROR:",
            error.message,
        );
    }

    process.exit(0);
}

process.once(
    "SIGTERM",
    () => {
        shutdown("SIGTERM");
    },
);

process.once(
    "SIGINT",
    () => {
        shutdown("SIGINT");
    },
);

startSystem().catch((error) => {
    console.error(
        "START SYSTEM ERROR:",
        error,
    );

    process.exit(1);
});