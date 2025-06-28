import Authjs from './authjs';
import Expressjs from './expressjs';
import Ezstart from './ezstart';
import Figma from './figma';
import Jest from './jest';
import Mongodb from './mongodb';
import Nextjs from './nextjs';
import Prisma from './prisma';
import Reactjs from './reactjs';
import Redux from './redux';
import Sass from './sass';
import Tailwind from './tailwind';
import TypeScript from './typescript';
import Zod from './zod';
import Zustand from './zustand';

export const customIconMap = {
  Figma,
  Ezstart,
  Nextjs,
  Reactjs,
  Tailwind,
  Expressjs,
  Sass,
  Zod,
  Jest,
  TypeScript,
  Mongodb,
  Authjs,
  Prisma,
  Redux,
  Zustand,
} as const;

export type CustomIconName = keyof typeof customIconMap;
