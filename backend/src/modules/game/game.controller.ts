// Ce fichier expose les endpoints HTTP lies a l'etat du jeu quiz
// et a l'envoi d'une reponse.
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

  // Retourne l'etat agrege de la partie pour une room donnee.
  @Get(":roomId/state")
  async getState(
    @Param("roomId", ParseIntPipe) roomId: number,
  ): Promise<ApiResponse<GameState>> {
    return ok(await this.gameService.getRoomState(roomId));
  }

  // Enregistre une reponse de joueur via HTTP.
  @Post("answer")
  async submitAnswer(
    @Body() dto: SubmitAnswerDto,
  ): Promise<ApiResponse<SubmitAnswerResult>> {
    return ok(await this.gameService.submitAnswer(dto));
  }
}
