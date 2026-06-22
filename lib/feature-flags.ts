/**
 * Feature flags — thin wrapper over lib/billing/limits for use in
 * Server Components. Re-exports checkFeature for ergonomic imports.
 *
 * @module lib/feature-flags
 */
export { checkFeature, getOrgPlan } from './billing/limits';
