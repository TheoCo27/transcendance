// Ce fichier expose les endpoints HTTP lies a l'etat du jeu quiz
// et a l'envoi d'une reponse.
import { ApiExceptionFilter } from "@/common/http/api-exception.filter";
import { ok, type ApiResponse } from "@/common/http/api-response";
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseFilters,
} from "@nestjs/common";
import { GameService, GameState } from "./game.service";

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
}
