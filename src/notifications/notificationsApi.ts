export type NotificationRule = {
  notificationId: string;
  event: string;
  filters: Record<string, boolean | number | string | string[]>;
  title?: string;
  text?: string;
  link?: string;
};

export async function supportsNotifications(): Promise<boolean> {
  try {
    const actions = await qdnRequest({ action: 'SHOW_ACTIONS' });
    return Array.isArray(actions) && actions.includes('NOTIFICATION_ADD');
  } catch {
    return false;
  }
}

export async function getNotificationRules(): Promise<NotificationRule[]> {
  try {
    const res = await qdnRequest({ action: 'NOTIFICATION_GET' });
    return Array.isArray(res) ? (res as NotificationRule[]) : [];
  } catch {
    return [];
  }
}

export async function addNotificationRules(
  rules: NotificationRule[]
): Promise<void> {
  if (rules.length === 0) return;
  await qdnRequest({ action: 'NOTIFICATION_ADD', subscriptions: rules });
}

export async function removeNotificationRules(
  notificationIds?: string[]
): Promise<void> {
  await qdnRequest({
    action: 'NOTIFICATION_REMOVE',
    ...(notificationIds ? { notificationIds } : {}),
  });
}
