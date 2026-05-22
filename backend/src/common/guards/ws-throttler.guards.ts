import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class WsThrottlerGuard extends ThrottlerGuard {
  async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
    throttler: any,
  ): Promise<boolean> {
    // 1. On précise qu'on est sur une connexion WebSocket
    const client = context.switchToWs().getClient();
    
    // 2. On récupère l'adresse IP du tricheur
    const ip = client.handshake.address;
    
    // 3. On demande au Throttler de compter
    const key = this.generateKey(context, ip, throttler.name);
    const { totalHits } = await this.storageService.increment(key, ttl);

    // 4. S'il dépasse la limite, on bloque l'événement WebSocket
    if (totalHits > limit) {
      throw new ThrottlerException('Spam détecté ! Veuillez ralentir.');
    }

    return true;
  }
}