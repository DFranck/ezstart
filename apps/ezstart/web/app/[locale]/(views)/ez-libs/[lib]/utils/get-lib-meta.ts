import { libMeta } from '../meta/lib-meta';
import { LibId, LibMeta } from '../types';

export function getLibMeta(lib: LibId): LibMeta {
  return libMeta[lib];
}
