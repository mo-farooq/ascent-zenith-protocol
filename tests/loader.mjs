import { transform } from 'esbuild';
import fs from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { existsSync } from 'node:fs';

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !path.extname(specifier)) {
    const parentDir = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : process.cwd();
    const candidateTs = path.resolve(parentDir, specifier + '.ts');
    if (existsSync(candidateTs)) {
      return {
        url: pathToFileURL(candidateTs).href,
        shortCircuit: true,
      };
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.ts')) {
    const filePath = fileURLToPath(url);
    const source = await fs.readFile(filePath, 'utf8');
    const { code } = await transform(source, {
      loader: 'ts',
      format: 'esm',
      target: 'esnext',
      sourcemap: 'inline',
    });
    return {
      format: 'module',
      shortCircuit: true,
      source: code,
    };
  }
  return nextLoad(url, context);
}
