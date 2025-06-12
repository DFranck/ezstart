export function generateLorem(wordCount: number): string {
  const loremWords =
    `Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua`.split(
      ' '
    );
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(loremWords[i % loremWords.length]);
  }
  return words.join(' ') + '.';
}
