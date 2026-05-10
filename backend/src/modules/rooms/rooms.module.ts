// Ce fichier declare le module des rooms et branche Prisma
// pour leur persistence.
import { PrismaModule } from "@/prisma/prisma.module";
import { Module } from "@nestjs/common";
import { RoomsController } from "./rooms.controller";
import { RoomsService } from "./rooms.service";

@Module({
  imports: [PrismaModule],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
