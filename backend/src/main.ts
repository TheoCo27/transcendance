// Ce fichier est le point d'entree du backend: il cree l'application NestJS,
// active les middlewares globaux et configure HTTPS/CORS/Swagger.
import "dotenv/config";
import { ApiExceptionFilter } from "@/common/http/api-exception.filter";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { existsSync, readFileSync } from "fs";
import "reflect-metadata";
import { AppModule } from "./app.module";

// Demarre l'application backend avec sa configuration globale.
async function bootstrap() {
  const isDevelopment = process.env.NODE_ENV === "development";
  const port = Number(process.env.BACKEND_PORT || 4000);
  const frontendOrigin = process.env.FRONTEND_ORIGIN || "https://localhost:3000";
  const tlsKeyPath = process.env.TLS_KEY_FILE || "/certs/dev-localhost.key";
  const tlsCertPath = process.env.TLS_CERT_FILE || "/certs/dev-localhost.crt";
  const hasTlsFiles = existsSync(tlsKeyPath) && existsSync(tlsCertPath);
  const app = await NestFactory.create(
    AppModule,
    hasTlsFiles
      ? {
          httpsOptions: {
            key: readFileSync(tlsKeyPath),
            cert: readFileSync(tlsCertPath),
          },
        }
      : undefined,
  );

  app.enableCors({
    credentials: true,
    origin: frontendOrigin,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new ApiExceptionFilter());
  app.use(cookieParser());

  if (isDevelopment) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Transcendance API")
      .setDescription("Development API documentation")
      .setVersion("1.0")
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup("docs", app, swaggerDocument);
  }

  await app.listen(port, "0.0.0.0");

  if (isDevelopment) {
    console.log(
      `Swagger available on ${hasTlsFiles ? "https" : "http"}://0.0.0.0:${port}/docs`,
    );
  }

  console.log(
    `Backend listening on ${hasTlsFiles ? "https" : "http"}://0.0.0.0:${port}`,
  );
}

void bootstrap();
