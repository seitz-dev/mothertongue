import fs from 'fs';
import crypto from 'crypto';
import { argv } from 'process';

/**
 * Supported hashing algorithms.
 * @enum {string}
 */
const ALGORITHMS = {
  0: 'md5',
  1: 'sha1'
};

/**
 * Simple utility to parse CLI arguments.
 * @returns {Object} Parsed arguments
 */
function parseArgs() {
  const args = argv.slice(2);
  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : null;
  };

  return {
    targetPath: getArg('-t'),
    wordlistPath: getArg('-l'),
    alg: getArg('-a'),
    debug: args.includes('-d')
  };
}

async function main() {
  const { targetPath, wordlistPath, alg, debug } = parseArgs();

  if (!targetPath || !wordlistPath || !alg) {
    console.error('Error: Missing required arguments -t, -l, or -a');
    process.exit(1);
  }

  const hashAlg = ALGORITHMS[alg] || alg;
  
  try {
    const targetHash = fs.readFileSync(targetPath, 'utf8').trim();
    const words = fs.readFileSync(wordlistPath, 'utf8').split(/\r?\n/);

    for (const word of words) {
      if (!word) continue;
      
      const currentHash = crypto.createHash(hashAlg).update(word).digest('hex');

      if (debug) {
        console.log(`Checking: ${word} -> ${currentHash}`);
      }

      if (currentHash === targetHash) {
        console.log(`Match found: ${word}`);
        return;
      }
    }

    console.log('No match found in wordlist.');
  } catch (err) {
    console.error(`Runtime error: ${err.message}`);
    process.exit(1);
  }
}

main();