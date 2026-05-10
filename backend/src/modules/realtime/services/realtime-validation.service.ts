// Ce fichier valide les payloads WebSocket entrants contre les DTOs du projet.
import { BadRequestException, Injectable } from "@nestjs/common";
import { ClassConstructor, plainToInstance } from "class-transformer";
import { ValidationError, validateSync } from "class-validator";

@Injectable()
export class RealtimeValidationService {
  // Valide un payload socket contre un DTO.
  validatePayload<T extends object>(
    classRef: ClassConstructor<T>,
    payload: unknown,
  ): T {
    const dto = plainToInstance(classRef, payload);
    const errors = validateSync(dto as object, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw new BadRequestException(this.formatValidationErrors(errors));
    }

    return dto;
  }

  // Aplati les erreurs de validation en message lisible.
  private formatValidationErrors(errors: ValidationError[]): string {
    const messages: string[] = [];

    const collect = (validationErrors: ValidationError[]): void => {
      for (const error of validationErrors) {
        if (error.constraints) {
          messages.push(...Object.values(error.constraints));
        }
        if (error.children && error.children.length > 0) {
          collect(error.children);
        }
      }
    };

    collect(errors);
    return messages.length > 0 ? messages.join(", ") : "Invalid payload";
  }
}
