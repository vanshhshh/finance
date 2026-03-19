import type { Server as HttpServer } from "node:http";

import type { Server } from "socket.io";

import { logger } from "../../lib/logger.js";

let io: Server | null = null;

export function initializeSocket(server: HttpServer, socketServer: Server) {
  io = socketServer;
  logger.info("Socket.io initialized");
  return io;
}

export function getIo() {
  if (!io) {
    throw new Error("Socket.io has not been initialized yet.");
  }

  return io;
}

export function emitFinanceEvent<T>(event: string, payload: T) {
  if (!io) {
    return;
  }

  io.emit(event, payload);
}

