import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class JoinRoomDto {
  @IsInt()
  @Min(1)
  userId: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  password?: string;
}

