import { ApiExceptionFilter } from "@/common/http/api-exception.filter";
import { ok, type ApiResponse } from "@/common/http/api-response";
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseFilters,
} from "@nestjs/common";
import { SubmitAnswerDto } from "./dto/submit-answer.dto";
import { GameService, GameState, SubmitAnswerResult } from "./game.service";

@Controller("game")
@UseFilters(ApiExceptionFilter)
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get(":roomId/state")
  async getState(
    @Param("roomId", ParseIntPipe) roomId: number,
  ): Promise<ApiResponse<GameState>> {
    return ok(await this.gameService.getRoomState(roomId));
  }

  @Post("answer")
  async submitAnswer(
    @Body() dto: SubmitAnswerDto,
  ): Promise<ApiResponse<SubmitAnswerResult>> {
    return ok(await this.gameService.submitAnswer(dto));
  }
}
