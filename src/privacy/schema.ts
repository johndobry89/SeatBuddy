import { z } from 'zod';
// Set before constructing any schemas. MV3's CSP forbids dynamic compilation;
// Zod's interpreter avoids both its Function probe and object-parser JIT.
z.config({ jitless: true });
export { z };
