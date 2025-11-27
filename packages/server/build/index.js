"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const colyseus_1 = require("colyseus");
const http_1 = require("http");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const monitor_1 = require("@colyseus/monitor");
const port = Number(process.env.PORT || 2567);
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const gameServer = new colyseus_1.Server({
    server: (0, http_1.createServer)(app),
});
// Define rooms here later
// gameServer.define("my_room", MyRoom);
app.use("/colyseus", (0, monitor_1.monitor)());
gameServer.listen(port);
console.log(`Listening on ws://localhost:${port}`);
