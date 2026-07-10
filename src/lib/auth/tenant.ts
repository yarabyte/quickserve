import type { Session } from "next-auth";
import type { UserRole } from "@prisma/client";

export type TenantScope =
  | { kind: "all" }
  | { kind: "restaurant"; restaurantId: string };

export class TenantAccessError extends Error {
  constructor(message = "Accès tenant refusé") {
    super(message);
    this.name = "TenantAccessError";
  }
}

export function getTenantScope(session: Session | null): TenantScope {
  if (!session?.user) {
    throw new TenantAccessError("Non authentifié");
  }

  if (session.user.role === "SUPERADMIN") {
    return { kind: "all" };
  }

  if (!session.user.restaurantId) {
    throw new TenantAccessError("Utilisateur sans restaurantId");
  }

  return { kind: "restaurant", restaurantId: session.user.restaurantId };
}

export function restaurantWhere(scope: TenantScope): { restaurantId?: string } {
  if (scope.kind === "all") return {};
  return { restaurantId: scope.restaurantId };
}

export function assertRestaurantAccess(
  scope: TenantScope,
  restaurantId: string,
): void {
  if (scope.kind === "all") return;
  if (scope.restaurantId !== restaurantId) {
    throw new TenantAccessError("Restaurant hors périmètre");
  }
}

export function requireRole(
  session: Session | null,
  roles: UserRole[],
): void {
  if (!session?.user || !roles.includes(session.user.role)) {
    throw new TenantAccessError("Rôle insuffisant");
  }
}

/**
 * Isolates every dashboard query/mutation to the caller's tenant.
 * SUPERADMIN may optionally pass restaurantId to act on one resto.
 */
export async function withTenant<T>(
  session: Session | null,
  fn: (scope: TenantScope, session: Session) => Promise<T>,
  options?: { restaurantId?: string; roles?: UserRole[] },
): Promise<T> {
  if (!session?.user) {
    throw new TenantAccessError("Non authentifié");
  }

  if (options?.roles) {
    requireRole(session, options.roles);
  }

  const scope = getTenantScope(session);

  if (options?.restaurantId) {
    assertRestaurantAccess(scope, options.restaurantId);
    return fn(
      { kind: "restaurant", restaurantId: options.restaurantId },
      session,
    );
  }

  return fn(scope, session);
}
