// Ce type enrichit la requete Express avec le champ `user`
// pose par le guard d'authentification.
import { Request } from "express";
import { AuthPayload } from "./auth-payload.type";

export type AuthenticatedRequest = Request & {
  user?: AuthPayload;
};
