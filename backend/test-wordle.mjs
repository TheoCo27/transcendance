import { NestFactory } from '@nestjs/core';
import { AppModule } from './dist/app.module.js';
import { GameService } from './dist/modules/game/game.service.js';
import { RoomsService } from './dist/modules/rooms/rooms.service.js';
import { RealtimeGameRuntimeService } from './dist/modules/realtime/services/realtime-game-runtime.service.js';
import { ScoresService } from './dist/modules/scores/scores.service.js';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const roomsService = app.get(RoomsService);
  const gameService = app.get(GameService);
  const gameRuntime = app.get(RealtimeGameRuntimeService);

  // create a user
  const PrismaService = app.get('PrismaService');
  await PrismaService.client.user.deleteMany({});
  const user = await PrismaService.client.user.create({
    data: { email: 'test@example.com', username: 'test', password: 'password', isGuest: false }
  });

  const room = await roomsService.create(user.id, { name: 'Wordle Room' });
  await roomsService.update(room.id, user.id, { gameType: 'wordle', gameConfig: { wordLength: 5, maxAttempts: 6 } });
  
  await gameRuntime.startGameLoop(room.id, { to: () => ({ emit: () => {} }) });
  
  console.log('Started game, now recording finish');
  const res = await gameService.recordWordlePlayerFinish({
    roomId: room.id,
    userId: user.id,
    won: false,
    attemptsUsed: 6
  });
  console.log('recordWordlePlayerFinish result:', res);
  
  const endRes = await gameRuntime.completeWordleIfReady(room.id, { to: () => ({ emit: () => {} }) });
  console.log('completeWordleIfReady result:', endRes);

  await app.close();
}
bootstrap();
