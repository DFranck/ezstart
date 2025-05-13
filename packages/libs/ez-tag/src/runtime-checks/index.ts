// ez-tag/src/runtime-checks/index.ts
import { LayoutTag } from '../types/supported-tags';
import { runImageCheck } from './imageCheck';

export const EzTagRuntimeChecks: Partial<
  Record<LayoutTag, (props: any) => void>
> = {
  img: runImageCheck,
};
