import { ChatType } from "../../../generated/prisma/enums";

export class ChatResponseDto {
  id: string;
  type: ChatType;
  title?: string;
  participants: any[];
  lastMessageAt?: Date;
}
