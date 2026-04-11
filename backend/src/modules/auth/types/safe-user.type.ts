import { User } from "@generated/prisma/client";

export type SafeUser = Omit<User, "password">;
