export interface User {
  id: string;
  email: string;
  name: string;
}

export enum TaskStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED'
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt: string;
  userId: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiError {
  message: string;
}
