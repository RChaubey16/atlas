export const USER_CREATED_EVENT = 'user.created';

export interface UserCreatedEvent {
  userId: string;
  email: string;
  createdAt: Date;
}
