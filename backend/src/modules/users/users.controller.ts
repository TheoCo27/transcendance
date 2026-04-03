import { ok, type ApiResponse } from "@/common/http/api-response";
import { User } from "@generated/prisma/client";
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
} from "@nestjs/common";
import { UsersService } from "./users.service";

type SafeUser = Omit<User, "password">;

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  async getMe(@Query("email") email?: string): Promise<ApiResponse<SafeUser>> {
    const user = email
      ? await this.usersService.findUserByEmail(email)
      : (
          await this.usersService.findUsers({
            take: 1,
            orderBy: { createdAt: "desc" },
          })
        )[0] ?? null;

    if (!user) {
      throw new NotFoundException("No user found");
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

