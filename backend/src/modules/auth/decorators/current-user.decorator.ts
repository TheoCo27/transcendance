// Ce fichier definit un decorateur NestJS pratique pour recuperer
// l'utilisateur authentifie depuis la requete HTTP.
import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedRequest } from "../types/authenticated-request.type";

// Decorateur qui lit `request.user` injecte par `AuthGuard`.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
