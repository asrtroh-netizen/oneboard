/** OneBoard localStorage key constants (onebord → oneboard migration). */

export const STORAGE_KEYS = {
  theme: 'oneboard-theme-mode',
  authToken: 'oneboard-auth-token',
  authUser: 'oneboard-auth-user',
  clashBackend: 'oneboard-clash-backend',
  clashAuthMode: 'oneboard-clash-auth-mode',
  vohiveConnection: 'oneboard-vohive-connection',
  vohiveActiveInstance: 'oneboard:vohive:active-instance-id',
  vohiveInstances: 'oneboard:vohive:instances',
  vohiveToken: 'oneboard:vohive:token',
  vohiveUsername: 'oneboard:vohive:username',
  rulesEditor: 'oneboard-rules-editor',
  wifiState: 'oneboard-wifi-state',
  remoteYamlPrefix: 'oneboard-remote-yaml',
  configYaml: 'oneboard:config-yaml',
  migrationFlag: 'oneboard:storage-migrated-v1',
}

export const LEGACY_STORAGE_KEY_MAP = {
  'onebord-theme-mode': STORAGE_KEYS.theme,
  'onebord-auth-token': STORAGE_KEYS.authToken,
  'onebord-auth-user': STORAGE_KEYS.authUser,
  'onebord-clash-backend': STORAGE_KEYS.clashBackend,
  'onebord-vohive-connection': STORAGE_KEYS.vohiveConnection,
  'onebord:vohive:instances': STORAGE_KEYS.vohiveInstances,
  'onebord:vohive:token': STORAGE_KEYS.vohiveToken,
  'onebord:vohive:username': STORAGE_KEYS.vohiveUsername,
  'onebord-rules-editor': STORAGE_KEYS.rulesEditor,
  'onebord-wifi-state': STORAGE_KEYS.wifiState,
  'onebord:config-yaml': STORAGE_KEYS.configYaml,
}

export const LEGACY_STORAGE_PREFIX_MAP = {
  'onebord-remote-yaml:': `${STORAGE_KEYS.remoteYamlPrefix}:`,
}
