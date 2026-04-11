import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";
import { ScoresController } from "./scores.controller";
import { ScoresService } from "./scores.service";

@Module({
  imports: [UsersModule],
  controllers: [ScoresController],
  providers: [ScoresService],
  exports: [ScoresService],
})
export class ScoresModule {}
