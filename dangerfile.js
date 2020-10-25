import {message, danger, markdown} from "danger"

const fs = require('fs').promises;
const gzipSize = require('gzip-size');
const git = require('simple-git/promise')(__dirname);

// https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const percDiff =  (first, second) =>
  `${(100 * Math.abs( (first - second) / ( (first+second)/2 ) )).toFixed(2)}%`

const run = async () => {
  const minified = danger.git.modified_files.filter(file => file.includes('.min.js'))

  if (minified.length === 0) {
    return;
  }

  const rows = [];

  for (const file of minified) {
    const [fileContents, fileMasterContents] = await Promise.all([
      fs.readFile(file, 'utf-8'),
      git.show([`master:${file}`]),
    ]);

    const [fileSize, fileMasterSize] = await Promise.all([
      gzipSize(fileContents),
      gzipSize(fileMasterContents),
    ]);

    rows.push([file, formatBytes(fileSize), formatBytes(fileMasterSize), percDiff(fileSize, fileMasterSize)])
  }

  markdown(`
# Component Size Changes (gzipped)

| file | master | pull | % change |
| --- | --- | --- |
${rows.reduce((table, row) => `${table}${row.reduce((row, value) => `${row}| ${value} `, '')}|
`, '')}
`
  )
}

(async () => {
  let exitCode = 0;
  try {
    await run();
  } catch (err) {
    console.error(err);
    exitCode = 1;
  }

  process.exit(exitCode);
})();