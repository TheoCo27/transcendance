import { plainToInstance } from 'class-validator';
import { validateSync } from 'class-validator';
import { GameFinishEventDto } from './dist/modules/realtime/dto/game-finish-event.dto.js';

const dto = plainToInstance(GameFinishEventDto, {
  roomId: 1,
  won: false,
  attemptsUsed: 6
});

const errors = validateSync(dto);
console.log(errors);
