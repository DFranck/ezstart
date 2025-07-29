const fs = require('fs');

/**
 * Remplace une section auto-générée entre <!-- AUTO:NAME:START --> ... <!-- AUTO:NAME:END -->
 *
 * @param {string} filePath - chemin du fichier à modifier
 * @param {string} sectionName - nom unique (ex: "STRUCTURE", "QUICK")
 * @param {string} newContent - contenu à injecter dans la section
 */
function replaceAutoSection(filePath, sectionName, newContent) {
  const START_TAG = `<!-- AUTO:${sectionName}:START -->`;
  const END_TAG = `<!-- AUTO:${sectionName}:END -->`;

  let fileContent = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, 'utf-8')
    : '';

  const block = [START_TAG, newContent.trim(), END_TAG].join('\n');

  const regex = new RegExp(`${START_TAG}[\\s\\S]*?${END_TAG}`, 'g');

  if (regex.test(fileContent)) {
    // ✅ Replace existing block
    fileContent = fileContent.replace(regex, block);
  } else {
    // ✅ Append at the end if no block found
    fileContent = `${fileContent.trim()}\n\n${block}`;
  }

  fs.writeFileSync(filePath, fileContent, 'utf-8');
  console.log(`✅ Updated section [${sectionName}] in ${filePath}`);
}

module.exports = { replaceAutoSection };
