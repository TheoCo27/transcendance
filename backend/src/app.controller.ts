// Ce fichier expose les routes globales du backend qui ne sont rattachees
// a aucun module metier particulier.
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

  // Retourne l'etat de sante global du backend et echoue si un composant critique est KO.
  @Get("health")
  async getHealth() {
    const status = await this.appService.getHealth();

    if (!status.ok) {
      throw new ServiceUnavailableException(status);
    }

    return status;
  }

  // Expose un petit index de l'API uniquement en environnement de developpement.
  @Get("api")
  getApi() {
    if (process.env.NODE_ENV !== "development") {
      throw new NotFoundException();
    }

    return this.appService.getApi();
  }
}
