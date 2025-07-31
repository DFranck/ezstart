import { ApiError } from './apiError';

export type ApiResponse<T> = {
  status: number;
  ok: boolean;
  url: string;
  data: T | ApiError | null;
};
