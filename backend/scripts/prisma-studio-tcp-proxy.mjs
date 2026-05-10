import net from "node:net";

const listenPort = Number(process.env.PRISMA_STUDIO_PROXY_PORT || 5555);
const targetPort = Number(process.env.PRISMA_STUDIO_INTERNAL_PORT || 5556);

const shutdown = (server) => {
  server.close(() => process.exit(0));
};

const server = net.createServer((clientSocket) => {
  const upstreamSocket = net.connect(targetPort, "127.0.0.1");

  clientSocket.pipe(upstreamSocket);
  upstreamSocket.pipe(clientSocket);

  const closeSockets = () => {
    clientSocket.destroy();
    upstreamSocket.destroy();
  };

  clientSocket.on("error", closeSockets);
  upstreamSocket.on("error", closeSockets);
});

server.on("error", (error) => {
  console.error("Prisma Studio proxy error:", error);
  process.exit(1);
});

server.listen(listenPort, "0.0.0.0");

process.on("SIGINT", () => shutdown(server));
process.on("SIGTERM", () => shutdown(server));
