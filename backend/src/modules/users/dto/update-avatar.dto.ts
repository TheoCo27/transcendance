// Ce DTO decrit la mise a jour de l'avatar d'un utilisateur.
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateAvatarDto {
  // Image encodee en data URL, ou `null` pour supprimer l'avatar.
  @ApiPropertyOptional({
    example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    maxLength: 4_000_000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(4_000_000)
  avatarDataUrl: string | null;
}
