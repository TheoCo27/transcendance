import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateAvatarDto {
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
