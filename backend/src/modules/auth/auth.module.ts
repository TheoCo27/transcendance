import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import type { StringValue } from "ms";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./guards/auth.guard";

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
          throw new Error("JWT_SECRET is not configured");
        }

        return {
          secret: jwtSecret,
          signOptions: {
            expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as StringValue,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [AuthService],
})
export class AuthModule {}
