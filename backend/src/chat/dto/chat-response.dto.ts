export class ChatResponseDto {
  id: string;
  isGroup: boolean;
  title?: string;
  participants: any[];
  lastMessageAt?: Date;
}
