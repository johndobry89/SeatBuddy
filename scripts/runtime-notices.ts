import type { Plugin } from 'vite';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/** Attribute the actual dependency modules in the emitted chunk graph.
 * Build-only: no filesystem or package metadata is exposed to extension code. */
export function runtimeNotices(): Plugin {
  return {
    name: 'seatbuddies-runtime-notices',
    async generateBundle(_options, bundle) {
      const libraries = new Map<string, string>();
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;
        for (const id of chunk.moduleIds) {
          const match = id.match(
            /^(.*[/\\]node_modules[/\\]((?:@[^/\\]+[/\\])?[^/\\]+))[/\\]/,
          );
          if (match) libraries.set(match[2]!.replaceAll('\\', '/'), match[1]!);
        }
      }
      const sections: string[] = [];
      for (const [name, directory] of [...libraries].sort(([a], [b]) =>
        a.localeCompare(b, 'en'),
      )) {
        const pkg = JSON.parse(
          await readFile(resolve(directory, 'package.json'), 'utf8'),
        ) as { name: string; version: string; license: string };
        if (pkg.name !== name || pkg.license !== 'MIT')
          throw new Error(
            'New runtime dependency license requires explicit review',
          );
        const license = await readFile(resolve(directory, 'LICENSE'), 'utf8');
        if (
          !license.includes('Permission is hereby granted') ||
          !license.includes('copyright notice')
        )
          throw new Error('Incomplete runtime license notice');
        sections.push(
          `${name}@${pkg.version} — ${pkg.license}\n${license.trim()}`,
        );
      }
      if (!libraries.has('@vue/runtime-dom') || !libraries.has('zod'))
        throw new Error('Runtime module/license inventory incomplete');
      this.emitFile({
        type: 'asset',
        fileName: 'THIRD_PARTY_NOTICES.txt',
        source: `SeatBuddies bundled dependency notices\nGenerated from the emitted module graph; see package-lock.json for package origins/integrities.\n\n${sections.join('\n\n---\n\n')}\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'LICENSE',
        source: await readFile(
          resolve(import.meta.dirname, '../LICENSE'),
          'utf8',
        ),
      });
    },
  };
}
