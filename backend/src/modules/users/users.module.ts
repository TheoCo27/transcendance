import { PrismaModule } from "@/prisma/prisma.module";
import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";

@Module({
  imports: [PrismaModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
