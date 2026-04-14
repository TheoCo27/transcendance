import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateAvatarDto {
  @IsOptional()
  @IsString()
  @MaxLength(4_000_000)
  avatarDataUrl: string | null;
}
