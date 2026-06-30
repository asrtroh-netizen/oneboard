import fs from 'node:fs'
import path from 'node:path'
import {
  applyProviderToYaml,
  parseProxyProvidersYaml,
} from './utils/subscriptionConfig.js'

const DEFAULT_CONFIG_PATH = '/etc/mihomo/config.yaml'

function resolveConfigPath() {
  const fromEnv = String(process.env.ONEBORD_MIHOMO_CONFIG_PATH || '').trim()
  return fromEnv ? path.resolve(fromEnv) : DEFAULT_CONFIG_PATH
}

export function getMihomoConfigPath() {
  return resolveConfigPath()
}

export function readMihomoConfigYaml() {
  const configPath = resolveConfigPath()
  if (!fs.existsSync(configPath)) {
    const err = new Error(`配置文件不存在：${configPath}`)
    err.status = 404
    throw err
  }
  const yaml = fs.readFileSync(configPath, 'utf8')
  const parsed = parseProxyProvidersYaml(yaml)
  return {
    path: configPath,
    yaml,
    providers: parsed.providers,
    order: parsed.order,
  }
}

export function writeProviderConfig(providerName, config) {
  const configPath = resolveConfigPath()
  if (!fs.existsSync(configPath)) {
    const err = new Error(`配置文件不存在：${configPath}`)
    err.status = 404
    throw err
  }

  const currentYaml = fs.readFileSync(configPath, 'utf8')
  const nextYaml = applyProviderToYaml(currentYaml, providerName, config)
  fs.writeFileSync(configPath, nextYaml, 'utf8')

  return {
    path: configPath,
    providerName,
    yaml: nextYaml,
  }
}

export function writeMihomoConfigYamlToDisk(yaml) {
  const configPath = resolveConfigPath()
  const nextYaml = String(yaml || '').trim()
  if (!nextYaml) {
    const err = new Error('YAML 内容不能为空')
    err.status = 400
    throw err
  }
  fs.writeFileSync(configPath, `${nextYaml}\n`, 'utf8')
  return { path: configPath, yaml: nextYaml }
}
