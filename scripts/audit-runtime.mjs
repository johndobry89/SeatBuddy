import ts from 'typescript';

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
    function visit(node) {
      if (
        (ts.isIdentifier(node) || ts.isStringLiteral(node)) &&
        forbidden.has(node.text)
      )
        throw new Error(`Network or dynamic execution primitive in ${name}`);
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        (!ts.isStringLiteral(node.moduleSpecifier) ||
          !/^\.\.?\//.test(node.moduleSpecifier.text))
      )
        throw new Error(`Nonlocal module in ${name}`);
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        (!node.arguments[0] ||
          !ts.isStringLiteral(node.arguments[0]) ||
          !/^\.\.?\//.test(node.arguments[0].text))
      )
        throw new Error(`Unbounded module import in ${name}`);
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
}
