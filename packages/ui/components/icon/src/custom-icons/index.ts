import Authjs from './authjs';
import CosmosKit from './cosmoskit';
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
import Socketio from './socketio';
import Supabase from './supabase';
import Tailwind from './tailwind';
import Typescript from './typescript';
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
  Typescript,
  Mongodb,
  Authjs,
  Prisma,
  Redux,
  Zustand,
  CosmosKit,
  Supabase,
  Socketio,
} as const;

export type CustomIconName = keyof typeof customIconMap;
