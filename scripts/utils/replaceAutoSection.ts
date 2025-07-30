import fs from 'fs';

export function replaceAutoSection(
  filePath: string,
  sectionName: string,
  newContent: string
): void {
  const START_TAG = `<!-- AUTO:${sectionName}:START -->`;
  const END_TAG = `<!-- AUTO:${sectionName}:END -->`;

  let fileContent = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, 'utf-8')
    : '';

  const block = [START_TAG, newContent.trim(), END_TAG].join('\n');
  const regex = new RegExp(`${START_TAG}[\\s\\S]*?${END_TAG}`, 'g');

  if (regex.test(fileContent)) {
    fileContent = fileContent.replace(regex, block);
  } else {
    fileContent = `${fileContent.trim()}\n\n${block}`;
  }

  fs.writeFileSync(filePath, fileContent, 'utf-8');
  console.log(`✅ Updated section [${sectionName}] in ${filePath}`);
}
