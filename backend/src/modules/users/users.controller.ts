import { ApiExceptionFilter } from "@/common/http/api-exception.filter";
import { ok, type ApiResponse } from "@/common/http/api-response";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { AuthGuard } from "@/modules/auth/guards/auth.guard";
import { AuthPayload } from "@/modules/auth/types/auth-payload.type";
import { User } from "@generated/prisma/client";
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  UseFilters,
  UseGuards,
} from "@nestjs/common";
import { SafeUser } from "../auth/types/safe-user.type";
import { UsersService } from "./users.service";

@Controller("users")
@UseFilters(ApiExceptionFilter)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  @UseGuards(AuthGuard)
  async getMe(
    @CurrentUser() auth: AuthPayload,
  ): Promise<ApiResponse<SafeUser>> {
    const user = await this.usersService.findUser({ id: auth.sub });

    if (!user) {
      throw new NotFoundException(`User ${auth.sub} not found`);
    }

    return ok(this.sanitizeUser(user));
  }

  @Get(":id")
  async getById(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<ApiResponse<SafeUser>> {
    const user = await this.usersService.findUser({ id });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return ok(this.sanitizeUser(user));
  }

  private sanitizeUser(user: User): SafeUser {
    const { password, ...safeUser } = user;
    return safeUser;
  }
}
