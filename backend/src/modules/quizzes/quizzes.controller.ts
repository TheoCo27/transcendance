// Ce fichier expose les endpoints HTTP de consultation et creation des quiz.
import { ApiExceptionFilter } from "@/common/http/api-exception.filter";
import { ok, type ApiResponse } from "@/common/http/api-response";
import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Post,
  Query,
  UseFilters,
} from "@nestjs/common";
import { CreateQuizDto } from "./dto/create-quiz.dto";
import {
  QuizzesService,
  SimpleQuizApiCategory,
  SimpleQuizApiDifficulty,
  type QuizResponse,
  type SimpleQuizApiResponse,
} from "./quizzes.service";

@Controller("quizzes")
@UseFilters(ApiExceptionFilter)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  // Retourne la liste complete des quiz disponibles.
  @Get()
  async listQuizzes(): Promise<ApiResponse<QuizResponse[]>> {
    return ok(await this.quizzesService.listQuizzes());
  }

  // Proxie la Simple Quiz API avec des filtres de theme et de difficulte.
  @Get("simple-api")
  async getSimpleQuizQuestions(
    @Query("category", new ParseEnumPipe(SimpleQuizApiCategory))
    category: SimpleQuizApiCategory,
    @Query("difficulty", new ParseEnumPipe(SimpleQuizApiDifficulty))
    difficulty: SimpleQuizApiDifficulty,
    @Query("limit", new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ): Promise<ApiResponse<SimpleQuizApiResponse>> {
    return ok(
      await this.quizzesService.fetchSimpleQuizQuestions({
        category,
        difficulty,
        limit,
      }),
    );
  }

  // Retourne le detail complet d'un quiz par son identifiant.
  @Get(":quizId")
  async getQuizById(
    @Param("quizId", ParseIntPipe) quizId: number,
  ): Promise<ApiResponse<QuizResponse>> {
    return ok(await this.quizzesService.getQuizById(quizId));
  }

  // Cree un quiz et toutes ses questions en une seule requete.
  @Post()
  async createQuiz(
    @Body() dto: CreateQuizDto,
  ): Promise<ApiResponse<QuizResponse>> {
    return ok(await this.quizzesService.createQuiz(dto));
  }
}
