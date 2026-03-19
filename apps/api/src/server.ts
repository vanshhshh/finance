import { createServer } from "node:http";

import { Server } from "socket.io";

import { env } from "./config/env.js";
import { startSchedulers } from "./jobs/scheduler.js";
import { logger } from "./lib/logger.js";
import { createApp } from "./app.js";
import { initializeSocket } from "./modules/common/socket.js";

const app = createApp();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
  },
});

io.on("connection", (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  socket.on("disconnect", () => logger.info(`Socket disconnected: ${socket.id}`));
});

initializeSocket(httpServer, io);

httpServer.listen(env.PORT, () => {
  logger.info(`API listening on ${env.API_URL}`);
  startSchedulers();
});
