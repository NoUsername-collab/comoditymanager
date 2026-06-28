/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  REZOVA — Data Provider Resolver                               ║
 * ║                                                                ║
 * ║  Returns the correct data provider based on deployment mode.   ║
 * ║  Currently only Supabase (cloud). SQLite adapter comes next.   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import type { IDataProvider } from "@/core/ports/repository";
import type { DeploymentMode } from "@/core/config/plans";
import { getTenantContext } from "@/core/tenant/context";

let _provider: IDataProvider | null = null;

/**
 * Get the data provider for the current deployment mode.
 *
 * @example
 * ```ts
 * const db = await getDataProvider();
 * const { data } = await db.buildings.list();
 * ```
 */
export async function getDataProvider(): Promise<IDataProvider> {
  if (_provider) return _provider;

  const ctx = getTenantContext();
  _provider = await resolveProvider(ctx.plan.mode);
  return _provider;
}

/**
 * Resolve the data provider for a specific deployment mode.
 */
async function resolveProvider(mode: DeploymentMode): Promise<IDataProvider> {
  switch (mode) {
    case "cloud": {
      const { createSupabaseProvider } = await import(
        "@/core/adapters/supabase/provider"
      );
      return createSupabaseProvider();
    }

    case "local": {
      // Phase 2: SQLite adapter
      // const { createSQLiteProvider } = await import(
      //   "@/core/adapters/sqlite/provider"
      // );
      // return createSQLiteProvider();
      throw new Error(
        "Local mode is not yet available. Coming in a future Zalmox release."
      );
    }

    case "hybrid": {
      // Phase 3: SQLite + Google Drive sync
      // const { createHybridProvider } = await import(
      //   "@/core/adapters/hybrid/provider"
      // );
      // return createHybridProvider();
      throw new Error(
        "Hybrid mode is not yet available. Coming in a future Zalmox release."
      );
    }

    default:
      throw new Error(`Unknown deployment mode: ${mode}`);
  }
}

/**
 * Reset the provider (for testing or mode switching).
 */
export function resetDataProvider(): void {
  _provider = null;
}
