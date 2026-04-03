import { ok, type ApiResponse } from "@/common/http/api-response";
import { Body, Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { SubmitAnswerDto } from "./dto/submit-answer.dto";
import { GameService, GameState, SubmitAnswerResult } from "./game.service";

@Controller("game")
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get(":roomId/state")
  getState(
    @Param("roomId", ParseIntPipe) roomId: number,
  ): ApiResponse<GameState> {
    return ok(this.gameService.getRoomState(roomId));
  }

  @Post("answer")
  submitAnswer(@Body() dto: SubmitAnswerDto): ApiResponse<SubmitAnswerResult> {
    return ok(this.gameService.submitAnswer(dto));
  }
}

