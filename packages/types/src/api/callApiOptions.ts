import { HttpMethod } from "./httpMethod";

export type CallApiOptions = {
  method?: HttpMethod;
  query?: Record<string, any>;
  body?: any;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};