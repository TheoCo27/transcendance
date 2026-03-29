import cors from "cors";
import express from "express";
import pg from "pg";

const { Pool } = pg;

const app = express();
const port = Number(process.env.BACKEND_PORT || 4000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
const databaseUrl = process.env.DATABASE_URL;

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
    })
  : null;

app.use(
  cors({
    origin: frontendOrigin,
  }),
);
app.use(express.json());

app.get("/health", async (_request, response) => {
  const status = {
    service: "backend",
    ok: true,
    timestamp: new Date().toISOString(),
    database: {
      configured: Boolean(pool),
      ok: false,
    },
  };

  if (!pool) {
    return response.status(200).json(status);
  }

  try {
    await pool.query("SELECT 1");
    status.database.ok = true;
    return response.status(200).json(status);
  } catch (error) {
    status.ok = false;
    status.database.error = error.message;
    return response.status(503).json(status);
  }
});

app.get("/api", (_request, response) => {
  response.json({
    name: "ft_transcendance starter",
    message: "Backend Express accessible.",
    endpoints: ["/health", "/api"],
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Backend listening on http://0.0.0.0:${port}`);
});
