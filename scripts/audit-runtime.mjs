import ts from 'typescript';
import { posix } from 'node:path';

const csp =
  "script-src 'self'; object-src 'none'; connect-src 'none'; base-uri 'none'";
const forbidden = new Set([
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'sendBeacon',
  'eval',
  'importScripts',
]);

/** Function type references and Zod's bundled, jitless-disabled compiler are
 * constrained by the exact CSP; this scan is not a JavaScript sandbox.
 * Audit the generated bundle, not just source/config. Conservative static check,
 * alongside CSP and native tests; not a claim to detect all malicious programs. */
export function auditRuntime(manifest, files) {
  const allowedManifestKeys = new Set([
    'manifest_version',
    'name',
    'version',
    'version_name',
    'description',
    'minimum_chrome_version',
    'permissions',
    'incognito',
    'background',
    'action',
    'side_panel',
    'content_security_policy',
    'icons',
  ]);
  if (manifest.incognito !== 'spanning')
    throw new Error('Unexpected incognito mode');
  if (Object.keys(manifest).some((key) => !allowedManifestKeys.has(key)))
    throw new Error('Unexpected generated manifest field');
  if (
    manifest.content_security_policy?.extension_pages !== csp ||
    manifest.web_accessible_resources?.length ||
    manifest.externally_connectable
  )
    throw new Error('Unexpected runtime exposure or CSP');
  for (const [name, bytes] of Object.entries(files)) {
    if (!/\.(js|html|css|svg)$/.test(name)) continue;
    const source = bytes.toString('utf8');
    function localResource(specifier) {
      if (!/^\.\.?\//.test(specifier))
        throw new Error(`Nonlocal resource in ${name}`);
      const target = posix.normalize(
        posix.join(posix.dirname(name), specifier),
      );
      if (target.startsWith('../') || !Object.hasOwn(files, target))
        throw new Error(`Missing or escaping runtime resource in ${name}`);
    }
    if (/\.(html|svg)$/.test(name)) {
      for (const tag of source.matchAll(
        /<(?:script|link|img|source|audio|video|iframe|object|embed)\b[^>]*>/gi,
      )) {
        for (const attribute of tag[0].matchAll(
          /(?:src|href|data)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
        ))
          localResource(attribute[1] ?? attribute[2] ?? attribute[3]);
        if (/^<script\b/i.test(tag[0]) && !/\bsrc\s*=/i.test(tag[0]))
          throw new Error(`Inline runtime script in ${name}`);
        if (/\bsrcset\s*=/i.test(tag[0]))
          throw new Error(`Unreviewed resource set in ${name}`);
      }
    }

    if (
      /\.(html|svg)$/.test(name) &&
      /<(?:script|iframe|object|embed)\b[^>]*(?:src|data)\s*=\s*["']?(?:https?:|\/\/|data:)/i.test(
        source,
      )
    )
      throw new Error(`Remote executable resource in ${name}`);
    if (
      /\.css$/.test(name) &&
      /(?:@import|url\s*\()\s*["']?(?:https?:|\/\/)/i.test(source)
    )
      throw new Error(`Remote style resource in ${name}`);
    if (!name.endsWith('.js')) continue;
    const ast = ts.createSourceFile(
      name,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    );
    if (ast.parseDiagnostics.length)
      throw new Error(`Invalid generated JavaScript in ${name}`);
    function visit(node) {
      if (
        (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) &&
        forbidden.has(node.text)
      )
        throw new Error(`Network or dynamic execution primitive in ${name}`);
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        (!ts.isStringLiteralLike(node.moduleSpecifier) ||
          !/^\.\.?\//.test(node.moduleSpecifier.text))
      )
        throw new Error(`Nonlocal module in ${name}`);
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        (!node.arguments[0] ||
          !ts.isStringLiteralLike(node.arguments[0]) ||
          !/^\.\.?\//.test(node.arguments[0].text))
      )
        throw new Error(`Unbounded module import in ${name}`);
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteralLike(node.moduleSpecifier)
      )
        localResource(node.moduleSpecifier.text);
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments[0] &&
        ts.isStringLiteralLike(node.arguments[0])
      )
        localResource(node.arguments[0].text);
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
}
