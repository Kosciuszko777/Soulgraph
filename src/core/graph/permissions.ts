/**
 * SoulGraph — permission graph & relationship graph types (Graph layer).
 *
 * Pure TypeScript + zod. Modelled in Phase I, used in Phases III–VIII. See
 * docs/ARCHITECTURE.md §7–§9 and docs/NIP-SOULGRAPH.md.
 */

import { z } from 'zod';
import { FACET_KEYS } from './schema';

/** The complete set of permission grants a relationship can carry. */
export const PERMISSIONS = [
  'VIEW_JUNG',
  'VIEW_OCEAN',
  'VIEW_ENNEAGRAM',
  'VIEW_LIFE_PATTERN',
  'VIEW_HUMAN_DESIGN',
  'VIEW_WORLDVIEW',
  'VIEW_CORE',
  'VIEW_FULL_SOULGRAPH',
  'COMPARE_WITH_ME',
  'PARTNER_ANALYSIS',
  'COACH_ACCESS',
  'TEAM_AGGREGATION',
  'ORGANIZATION_AGGREGATION',
  'AI_CONTEXT',
  'REPORT_ACCESS',
] as const;
export type Permission = (typeof PERMISSIONS)[number];
export const PermissionSchema = z.enum(PERMISSIONS);

/** Relationship edge types. See docs/ARCHITECTURE.md §7. */
export const RELATIONSHIP_TYPES = [
  'person',
  'partner',
  'coach',
  'team',
  'organization',
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];
export const RelationshipTypeSchema = z.enum(RELATIONSHIP_TYPES);

/** State of a grant. */
export const GRANT_STATES = ['granted', 'limited', 'revoked'] as const;
export type GrantState = (typeof GRANT_STATES)[number];
export const GrantStateSchema = z.enum(GRANT_STATES);

const PubkeySchema = z.string().regex(/^[0-9a-f]{64}$/);

/** Which facets and versions a grant covers. */
export const GrantScopeSchema = z.object({
  /** Facet keys the grant exposes. */
  facets: z.array(z.enum(FACET_KEYS)),
  /**
   * Version scope: 'all' past+future, 'current' only the current pointer,
   * or an explicit list of version ids.
   */
  versions: z.union([
    z.literal('all'),
    z.literal('current'),
    z.array(z.string().min(1)),
  ]),
});
export type GrantScope = z.infer<typeof GrantScopeSchema>;

/** One append-only audit entry. */
export const AuditEntrySchema = z.object({
  at: z.number().int().nonnegative(),
  action: z.enum(['granted', 'limited', 'extended', 'revoked', 'rotated']),
  note: z.string().optional(),
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;

/** A permission grant to one grantee pubkey. */
export const PermissionGrantSchema = z.object({
  grant_id: z.string().min(1),
  grantee_pubkey: PubkeySchema,
  permissions: z.array(PermissionSchema),
  state: GrantStateSchema,
  scope: GrantScopeSchema,
  granted_at: z.number().int().nonnegative(),
  expires_at: z.number().int().nonnegative().optional(),
  revoked_at: z.number().int().nonnegative().optional(),
  /** Append-only. Never mutate past entries. */
  audit: z.array(AuditEntrySchema),
});
export type PermissionGrant = z.infer<typeof PermissionGrantSchema>;

/** An edge from the owner to another pubkey, carrying its grants. */
export const RelationshipSchema = z.object({
  relationship_id: z.string().min(1),
  owner_pubkey: PubkeySchema,
  counterpart_pubkey: PubkeySchema,
  type: RelationshipTypeSchema,
  label: z.string().max(80).optional(),
  created_at: z.number().int().nonnegative(),
  grants: z.array(PermissionGrantSchema),
});
export type Relationship = z.infer<typeof RelationshipSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Organization hierarchy (modelled now, built in Phase VI). Organizations never
// hold private facets; aggregates obey a minimum-group threshold.
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_MIN_GROUP_SIZE = 5;

export const OrgMembershipSchema = z.object({
  member_pubkey: PubkeySchema,
  roles: z.array(z.string()).default([]),
  projects: z.array(z.string()).default([]),
});
export type OrgMembership = z.infer<typeof OrgMembershipSchema>;

export const OrgNodeSchema: z.ZodType<OrgNode> = z.lazy(() =>
  z.object({
    node_id: z.string().min(1),
    kind: z.enum(['organization', 'department', 'team']),
    name: z.string(),
    pubkey: PubkeySchema.optional(),
    members: z.array(OrgMembershipSchema).default([]),
    children: z.array(OrgNodeSchema).default([]),
    /** Minimum group size required before any aggregate is shown. */
    min_group_size: z.number().int().min(1).default(DEFAULT_MIN_GROUP_SIZE),
  })
);
export interface OrgNode {
  node_id: string;
  kind: 'organization' | 'department' | 'team';
  name: string;
  pubkey?: string;
  members: OrgMembership[];
  children: OrgNode[];
  min_group_size: number;
}
