import { UserStatus } from "@generated/prisma/client";
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsString, MinLength } from "class-validator";

export class UpdateProfileDto {
  @ApiProperty({ example: "alex42", minLength: 2 })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  username: string;

  @ApiProperty({ enum: UserStatus, example: UserStatus.online })
  @IsEnum(UserStatus)
  status: UserStatus;
}
