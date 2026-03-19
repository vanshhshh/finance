"use client";

import { io } from "socket.io-client";

import { webEnv } from "./env";

export const socket = io(webEnv.socketUrl, {
  autoConnect: false,
  transports: ["websocket"],
});

