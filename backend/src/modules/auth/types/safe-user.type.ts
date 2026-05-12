// Ce type represente la vue "publique" d'un utilisateur:
// on retire les champs sensibles jamais renvoyes au frontend.
import { User } from "@generated/prisma/client";

export type SafeUser = Omit<User, "password" | "googleId">;
