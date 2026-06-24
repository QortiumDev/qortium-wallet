export const APPS = {
  apps:  { qdn: 'Apps',  label: 'Apps'  },
  chain: { qdn: 'Chain', label: 'Chain' },
  groups: { qdn: 'Groups', label: 'Groups' },
  names: { qdn: 'Names', label: 'Names' },
  profile: { qdn: 'Profile', label: 'Profile' },
  publish: { qdn: 'Publish', label: 'Publish' },
  wallet: { qdn: 'Wallet', label: 'Wallet' },
} as const;

export type AppKey = keyof typeof APPS;

export function appLink(app: AppKey, path = ''): string {
  return `qdn://APP/${APPS[app].qdn}/${APPS[app].qdn}${path}`;
}

export function appLabel(app: AppKey): string {
  return APPS[app].label;
}
