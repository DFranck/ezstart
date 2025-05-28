import { libMeta } from './meta/lib-meta';

export type LibId = keyof typeof libMeta;

export type LibMeta = (typeof libMeta)[LibId];
