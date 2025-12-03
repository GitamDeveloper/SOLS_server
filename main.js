// relay-server.js
import http from "http";
import WebSocket from "ws";

const RECEIVER_KEY = "zss2izLqSy2F5N3t269XTVMTxxvxDOc1";
let receiver = null;

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("WebSocket Relay Server running\n");
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws, req) => {
  console.log("New client connected");

  ws.once("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg.toString());
    } catch {
      ws.send(JSON.stringify({ type: "response", status: "error", data: "Invalid JSON" }));
      ws.close();
      return;
    }

    if (data.type === "receiver" && data.key === RECEIVER_KEY) {
      if (receiver) {
        ws.send(JSON.stringify({ type: "response", status: "error", data: "Receiver already connected" }));
        ws.close();
        return;
      }
      receiver = ws;
      ws.send(JSON.stringify({ type: "response", status: "ok", data: "You are now the receiver" }));
      console.log("Receiver connected");

      ws.on("close", () => {
        console.log("Receiver disconnected");
        receiver = null;
      });

    } else if (data.type === "sender") {
      ws.send(JSON.stringify({ type: "response", status: "ok", data: "Sender registered" }));

      ws.on("message", (msg) => {
        let eventData;
        try {
          eventData = JSON.parse(msg.toString());
        } catch {
          ws.send(JSON.stringify({ type: "response", status: "error", data: "Invalid JSON" }));
          return;
        }

        if (receiver && receiver.readyState === WebSocket.OPEN) {
          receiver.send(JSON.stringify({
            type: "request",
            event: eventData.event || "unknown",
            data: eventData.data || null
          }));
        } else {
          ws.send(JSON.stringify({ type: "response", status: "error", data: "No active receiver" }));
        }
      });

    } else {
      ws.send(JSON.stringify({ type: "response", status: "error", data: "Invalid role or wrong key" }));
      ws.close();
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
