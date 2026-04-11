import { Request } from "express";
import { AuthPayload } from "./auth-payload.type";

export type AuthenticatedRequest = Request & {
  user?: AuthPayload;
};
