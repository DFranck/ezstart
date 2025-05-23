import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(__dirname, '../../data');

export const readJsonFile = async (filename: string) => {
  const file = path.join(DATA_DIR, filename);
  const content = await fs.readFile(file, 'utf-8');
  return JSON.parse(content);
};

export const writeJsonFile = async (filename: string, data: any) => {
  const file = path.join(DATA_DIR, filename);
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf-8');
};
