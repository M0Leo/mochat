// add-participants.dto.ts
import { IsArray, ArrayMinSize } from 'class-validator';

export class AddParticipantsDto {
  @IsArray()
  @ArrayMinSize(1)
  userIds: string[];
}
