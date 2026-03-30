import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.BACKEND_PORT || 4000);
  const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

  app.enableCors({
    origin: frontendOrigin,
  });

  await app.listen(port, "0.0.0.0");
  console.log(`Backend listening on http://0.0.0.0:${port}`);
}

void bootstrap();
