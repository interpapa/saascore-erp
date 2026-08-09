import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const projectRoot = process.cwd();

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'next/cache') {
    return nextResolve('next/cache.js', context);
  }

  let absolutePath;
  if (specifier.startsWith('@/')) {
    const relativePath = specifier.slice(2);
    absolutePath = path.resolve(projectRoot, 'src', relativePath);
  } else if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const parentDir = path.dirname(context.parentURL ? new URL(context.parentURL).pathname.replace(/^\/([A-Z]:)/, '$1') : projectRoot);
    absolutePath = path.resolve(parentDir, specifier);
  }

  if (absolutePath) {
    if (!path.extname(absolutePath)) {
      if (fs.existsSync(absolutePath + '.ts')) {
        absolutePath += '.ts';
      } else if (fs.existsSync(absolutePath + '.tsx')) {
        absolutePath += '.tsx';
      } else if (fs.existsSync(absolutePath + '/index.ts')) {
        absolutePath += '/index.ts';
      } else if (fs.existsSync(absolutePath + '.js')) {
        absolutePath += '.js';
      }
    }
    const fileUrl = pathToFileURL(absolutePath).href;
    return nextResolve(fileUrl, context);
  }

  return nextResolve(specifier, context);
}
