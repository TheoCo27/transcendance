// Ce type represente la charge utile metier passee au service de profil.
import { UserStatus } from "@generated/prisma/client";

export type UpdateProfilePayload = {
  username: string;
  status: UserStatus;
};
