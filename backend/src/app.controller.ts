import {
  Controller,
  Get,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("health")
  async getHealth() {
    const status = await this.appService.getHealth();

    if (!status.ok) {
      throw new ServiceUnavailableException(status);
    }

    return status;
  }

  @Get("api")
  getApi() {
    if (process.env.NODE_ENV !== "development") {
      throw new NotFoundException();
    }

    return this.appService.getApi();
  }
}
