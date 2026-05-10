// Ce DTO decrit l'action appliquee a une demande d'ami recue.
import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

export class FriendRequestActionDto {
  // Decision prise sur la demande d'ami.
  @ApiProperty({ enum: ["accepted", "declined"], example: "accepted" })
  @IsIn(["accepted", "declined"])
  action: "accepted" | "declined";
}
