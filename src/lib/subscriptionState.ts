/**
 * A subscription snapshot is usable only for the account that produced it.
 * Keeping this check pure makes account-switch behavior straightforward to
 * test and prevents a previous account's paid state from being rendered.
 */
export function isCurrentSubscriptionIdentity(
  resolvedUserId: string | null,
  currentUserId: string | null,
): boolean {
  return resolvedUserId === currentUserId;
}

/** An async request may update state only while it remains the newest request. */
export function isCurrentSubscriptionRequest(
  requestVersion: number,
  latestRequestVersion: number,
): boolean {
  return requestVersion === latestRequestVersion;
}
