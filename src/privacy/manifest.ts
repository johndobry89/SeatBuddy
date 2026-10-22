import { z } from './schema';

export const extensionVersionSchema = z
  .string()
  .regex(/^\d+(\.\d+){1,3}$/)
  .max(24)
  .nullable();

/** Reviewed permission/exposure scope only; not a complete Chrome manifest validator. */
export const reviewedManifestScope = z.object({
  manifest_version: z.literal(3),
  version: extensionVersionSchema.refine((version) => version !== null),
  permissions: z.tuple([z.literal('sidePanel'), z.literal('storage')]),
  host_permissions: z.array(z.never()).optional(),
  optional_host_permissions: z.array(z.never()).optional(),
  optional_permissions: z.array(z.never()).optional(),
  content_scripts: z.array(z.never()).optional(),
  web_accessible_resources: z.array(z.never()).optional(),
  externally_connectable: z.never().optional(),
});
