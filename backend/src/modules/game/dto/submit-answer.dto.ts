// Ce fichier definit le payload attendu lorsqu'un joueur envoie
// une reponse a la question courante.
import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Max, Min } from "class-validator";

export class SubmitAnswerDto {
  // Identifiant de la room dans laquelle la partie se joue.
  @ApiProperty({ example: 42, minimum: 1 })
  @IsInt()
  @Min(1)
  roomId: number;

  // Identifiant du joueur qui soumet la reponse.
  @ApiProperty({ example: 12, minimum: 1 })
  @IsInt()
  @Min(1)
  userId: number;

  // Identifiant de la question actuellement active.
  @ApiProperty({ example: 7, minimum: 1 })
  @IsInt()
  @Min(1)
  questionId: number;

  // Index de la reponse choisie dans la liste des options visibles.
  @ApiProperty({ example: 2, minimum: 0, maximum: 3 })
  @IsInt()
  @Min(0)
  @Max(3)
  answerIndex: number;
}
