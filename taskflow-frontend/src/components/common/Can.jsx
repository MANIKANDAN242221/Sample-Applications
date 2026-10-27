import { useAuth } from '../../hooks/useAuth';

/**
 * Renders children only if the user holds the permission(s).
 * <Can permission={PERMISSIONS.USERS_MANAGE}>...</Can>
 * <Can anyOf={[A, B]} fallback={<span>No access</span>}>...</Can>
 */
export function Can({ permission, anyOf, when = true, fallback = null, children }) {
  const { hasPermission, hasAnyPermission } = useAuth();
  const allowed =
    when && (permission ? hasPermission(permission) : true) && (anyOf ? hasAnyPermission(...anyOf) : true);
  return allowed ? children : fallback;
}
