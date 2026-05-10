// Ce fichier expose les endpoints HTTP de consultation des scores
// globaux et par quiz.
import { ApiExceptionFilter } from "@/common/http/api-exception.filter";
import { ok, type ApiResponse } from "@/common/http/api-response";
import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseFilters,
} from "@nestjs/common";
import { QuizUserScore, ScoresService, UserScore } from "./scores.service";

@Controller("scores")
@UseFilters(ApiExceptionFilter)
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  // Retourne le leaderboard global des utilisateurs.
  @Get("leaderboard")
  async getLeaderboard(
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<ApiResponse<UserScore[]>> {
    return ok(await this.scoresService.getLeaderboard(limit));
  }

  // Retourne le score global d'un utilisateur donne.
  @Get("users/:userId")
  async getUserScore(
    @Param("userId", ParseIntPipe) userId: number,
  ): Promise<ApiResponse<UserScore>> {
    return ok(await this.scoresService.getUserScore(userId));
  }

  // Retourne le leaderboard persistant d'un quiz donne.
  @Get("quizzes/:quizId/leaderboard")
  async getQuizLeaderboard(
    @Param("quizId", ParseIntPipe) quizId: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<ApiResponse<QuizUserScore[]>> {
    return ok(await this.scoresService.getQuizLeaderboard(quizId, limit));
  }
}
