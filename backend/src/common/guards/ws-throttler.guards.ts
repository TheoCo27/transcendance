import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class WsThrottlerGuard extends ThrottlerGuard {}
