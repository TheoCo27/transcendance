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
import { ScoresService, UserScore } from "./scores.service";

@Controller("scores")
@UseFilters(ApiExceptionFilter)
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  @Get("leaderboard")
  async getLeaderboard(
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<ApiResponse<UserScore[]>> {
    return ok(await this.scoresService.getLeaderboard(limit));
  }

  @Get("users/:userId")
  async getUserScore(
    @Param("userId", ParseIntPipe) userId: number,
  ): Promise<ApiResponse<UserScore>> {
    return ok(await this.scoresService.getUserScore(userId));
  }
}
