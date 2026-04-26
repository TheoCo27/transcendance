import { UserStatus } from "@generated/prisma/client";

export type UpdateProfilePayload = {
  username: string;
  status: UserStatus;
};
