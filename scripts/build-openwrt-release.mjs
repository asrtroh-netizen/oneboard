#!/usr/bin/env node
/**
 * Assemble OpenWrt Full Release: UI + API + WS + agent (same stack as Docker gateway).
 * Output: release/openwrt/
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const releaseDir = path.join(root, 'release', 'openwrt')
const binDir = path.join(releaseDir, 'bin')
const dataDir = path.join(releaseDir, 'data')
const stagingDir = path.join(releaseDir, 'staging')
const rootfsDir = path.join(stagingDir, 'onebord')

const PROD_DEPS = ['bcryptjs', 'echarts', 'vue', 'vue-router', 'ws']

const PKG_TARGETS = [
  { name: 'onebord-openwrt-amd64', target: 'node18-linux-x64', arch: 'x86_64' },
  { name: 'onebord-openwrt-arm64', target: 'node18-linux-arm64', arch: 'aarch64' },
  { name: 'onebord-openwrt-armv7', target: 'node18-linux-armv7', arch: 'armv7' },
]

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true })
}

function copyDir(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.cpSync(src, dest, { recursive: true })
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
}

function run(cmd) {
  console.log(`> ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: root })
}

function installProdModules(targetDir) {
  const nm = path.join(targetDir, 'node_modules')
  fs.mkdirSync(nm, { recursive: true })
  for (const dep of PROD_DEPS) {
    const src = path.join(root, 'node_modules', dep)
    if (!fs.existsSync(src)) {
      throw new Error(`Missing dependency: ${dep}. Run npm install first.`)
    }
    copyDir(src, path.join(nm, dep))
  }
}

function createTarball(sourceDir, archivePath) {
  const parent = path.dirname(sourceDir)
  const base = path.basename(sourceDir)
  fs.mkdirSync(path.dirname(archivePath), { recursive: true })
  run(`tar -czf "${archivePath}" -C "${parent}" "${base}"`)
}

function buildPkgBinaries(notes) {
  const entry = path.join(root, 'server', 'onebord-agent.js')
  const assets = 'dist/**/*,server/**/*'
  const onWindows = process.platform === 'win32'

  if (onWindows) {
    notes.push('[info] pkg linux binaries cannot be built on Windows (pkg only builds for win here).')
    notes.push('[info] Build pkg binaries on Linux: npm run build:openwrt')
    notes.push('[info] Universal fallback: onebord-openwrt-node.tar.gz + opkg install node')
    return
  }

  for (const { name, target, arch } of PKG_TARGETS) {
    const out = path.join(binDir, name)
    try {
      run(
        `npx --yes pkg@${process.env.PKG_VERSION || '5.8.1'} "${entry}" --targets ${target} --output "${out}" --compress GZip --assets "${assets}"`,
      )
      notes.push(`[ok] ${name} (${arch}) via pkg ${target}`)
      console.log(`pkg binary: ${out}`)
    } catch (err) {
      notes.push(
        `[skip] ${name} (${arch}): pkg cross-build failed on this host — ${err.message || err}`,
      )
      notes.push(
        `       Windows hosts cannot pkg for linux. Build on Linux: npm run build:openwrt`,
      )
      notes.push(
        `       Or use onebord-openwrt-node.tar.gz + opkg install node on OpenWrt ${arch}`,
      )
    }
  }
}

console.log('=== OneBord OpenWrt Full Release build ===')

run('npm run build')

rmrf(stagingDir)
fs.mkdirSync(rootfsDir, { recursive: true })

let exitCode = 0
try {

copyDir(path.join(root, 'dist'), path.join(rootfsDir, 'dist'))
copyDir(path.join(root, 'server'), path.join(rootfsDir, 'server'))
copyFile(path.join(root, 'openwrt', 'bin', 'onebord-agent'), path.join(rootfsDir, 'bin', 'onebord-agent'))
writeJson(path.join(rootfsDir, 'package.json'), {
  name: 'onebord-openwrt',
  private: true,
  version: '0.0.0',
  type: 'module',
})
installProdModules(rootfsDir)

rmrf(dataDir)
copyDir(path.join(root, 'dist'), path.join(dataDir, 'dist'))

fs.mkdirSync(path.join(releaseDir, 'init.d'), { recursive: true })
fs.mkdirSync(path.join(releaseDir, 'env'), { recursive: true })
copyFile(path.join(root, 'openwrt', 'onebord.init'), path.join(releaseDir, 'init.d', 'onebord'))
copyFile(path.join(root, 'openwrt', 'onebord.env.example'), path.join(releaseDir, 'env', 'onebord.env.example'))
copyFile(path.join(root, 'openwrt', 'install.sh'), path.join(releaseDir, 'install.sh'))
copyFile(path.join(root, 'openwrt', 'README.md'), path.join(releaseDir, 'README.md'))

const nodeArchive = path.join(releaseDir, 'onebord-openwrt-node.tar.gz')
createTarball(rootfsDir, nodeArchive)

rmrf(binDir)
fs.mkdirSync(binDir, { recursive: true })
const buildNotes = []
buildPkgBinaries(buildNotes)
fs.writeFileSync(path.join(binDir, 'BUILD_NOTES.txt'), `${buildNotes.join('\n')}\n`)

for (const legacy of ['onebord-openwrt-standalone.tar.gz', 'onebord.init', 'onebord.env.example']) {
  try {
    fs.unlinkSync(path.join(releaseDir, legacy))
  } catch {
    /* ignore */
  }
}
} finally {
  rmrf(stagingDir)
}

console.log('')
console.log('Done.')
console.log(`  Node tarball: ${path.join(releaseDir, 'onebord-openwrt-node.tar.gz')}`)
console.log(`  Binaries: ${binDir}`)
console.log(`  Init script: ${path.join(releaseDir, 'init.d', 'onebord')}`)
console.log(`  Env example: ${path.join(releaseDir, 'env', 'onebord.env.example')}`)

process.exit(exitCode)
