import { ApiExceptionFilter } from "@/common/http/api-exception.filter";
import { ok, type ApiResponse } from "@/common/http/api-response";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { AuthGuard } from "@/modules/auth/guards/auth.guard";
import { AuthPayload } from "@/modules/auth/types/auth-payload.type";
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseFilters,
  UseGuards,
} from "@nestjs/common";
import {
  NotificationItem,
  NotificationsService,
} from "./notifications.service";

@Controller("notifications")
@UseFilters(ApiExceptionFilter)
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async listForCurrentUser(
    @CurrentUser() auth: AuthPayload,
    @Query("limit") rawLimit?: string,
    @Query("unreadOnly") rawUnreadOnly?: string,
  ): Promise<ApiResponse<NotificationItem[]>> {
    return ok(
      await this.notificationsService.listForUser(auth.sub, {
        limit:
          typeof rawLimit === "string" && rawLimit.length > 0
            ? Number(rawLimit)
            : undefined,
        unreadOnly: rawUnreadOnly === "true",
      }),
    );
  }

  @Get("unread-count")
  async getUnreadCount(
    @CurrentUser() auth: AuthPayload,
  ): Promise<ApiResponse<{ unreadCount: number }>> {
    return ok({
      unreadCount: await this.notificationsService.countUnreadForUser(auth.sub),
    });
  }

  @Patch("read-all")
  async markAllAsRead(
    @CurrentUser() auth: AuthPayload,
  ): Promise<ApiResponse<{ updatedCount: number }>> {
    return ok(await this.notificationsService.markAllAsRead(auth.sub));
  }

  @Patch(":notificationId/read")
  async markAsRead(
    @CurrentUser() auth: AuthPayload,
    @Param("notificationId", ParseIntPipe) notificationId: number,
  ): Promise<ApiResponse<NotificationItem>> {
    return ok(
      await this.notificationsService.markAsRead(auth.sub, notificationId),
    );
  }
}
