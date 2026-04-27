import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

export class FriendRequestActionDto {
  @ApiProperty({ enum: ["accepted", "declined"], example: "accepted" })
  @IsIn(["accepted", "declined"])
  action: "accepted" | "declined";
}
