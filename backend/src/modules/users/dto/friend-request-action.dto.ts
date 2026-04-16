import { IsIn } from "class-validator";

export class FriendRequestActionDto {
  @IsIn(["accepted", "declined"])
  action: "accepted" | "declined";
}
