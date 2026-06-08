import { io } from "socket.io-client";

export const socket = io("https://techero.ge", {
    path: "/socket.io/",
    transports: ["websocket"], // Forces raw websockets instantly to avoid Cloudflare long-polling loops
    secure: true,
    withCredentials: true,
    autoConnect: true,
});