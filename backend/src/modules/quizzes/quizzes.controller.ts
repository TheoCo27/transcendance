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
import { CreateQuizDto } from "./dto/create-quiz.dto";
import { QuizzesService, type QuizResponse } from "./quizzes.service";

@Controller("quizzes")
@UseFilters(ApiExceptionFilter)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Get()
  async listQuizzes(): Promise<ApiResponse<QuizResponse[]>> {
    return ok(await this.quizzesService.listQuizzes());
  }

  @Get(":quizId")
  async getQuizById(
    @Param("quizId", ParseIntPipe) quizId: number,
  ): Promise<ApiResponse<QuizResponse>> {
    return ok(await this.quizzesService.getQuizById(quizId));
  }

  @Post()
  async createQuiz(
    @Body() dto: CreateQuizDto,
  ): Promise<ApiResponse<QuizResponse>> {
    return ok(await this.quizzesService.createQuiz(dto));
  }
}
