// packages/vue/vite-plugin.ts
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import type { Plugin } from 'vite'

/**
 * kit 插件配置项。
 * 当前监听范围固定为 packages/core、packages/javaScript、packages/vue，
 * 暂无需要业务侧配置的项；该参数先保留，后续按需扩展。
 */
export interface KitPluginOptions {}

/**
 * 固定纳入监听（HMR）的子包目录
 * @see packages/ 下的目录，新增目录时在这里补上
 */
const PACKAGES = ['core', 'javaScript', 'vue']

const require = createRequire(import.meta.url)

/**
 * 解析 kit 包的真实根目录。
 * kit 通常通过 `link:` / workspace 软链安装，位于业务工程之外，
 * 这个真实目录需要放行给 dev server，同时也要加入监听范围才能 HMR。
 *
 * 兼容两种加载方式：
 * 1. 以源码形式直接加载 —— 相对本文件定位
 * 2. 被打包进业务工程的 vite.config —— 从业务工程解析 kit 包
 */
function resolveKitRoot(): string {
  const candidates = [
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'),
  ]

  try {
    candidates.push(path.resolve(path.dirname(require.resolve('kit/vue/vite-plugin')), '../..'))
  } catch {
    // 忽略：由下一个候选或最后统一报错
  }

  // kit 在业务工程里的依赖别名是 kit，包自身的 name 是 ruyi-kit
  const kitNames = ['kit', 'ruyi-kit']

  const kitRoot = candidates.find(candidate => {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(candidate, 'package.json'), 'utf-8'))
      return kitNames.includes(pkg.name)
    } catch {
      return false
    }
  })

  if (!kitRoot) {
    throw new Error('[vite-plugin-kit] 无法定位 kit 包目录，请确认 kit 已作为依赖安装')
  }

  return fs.realpathSync(kitRoot)
}

export function kitPlugin(options: KitPluginOptions = {}): Plugin {
  // options 目前无可用配置项，先保留形参，后续扩展时在这里取值
  void options

  let kitRoot = ''
  const resolvePackageDirs = () => PACKAGES.map(pkg => path.join(kitRoot, 'packages', pkg))

  return {
    name: 'vite-plugin-kit',
    enforce: 'pre',

    config() {
      kitRoot = resolveKitRoot()

      // 业务工程根目录（即 vite 运行目录，与 Vite 默认的 allow 取值一致）。
      // 显式写 allow 会覆盖 Vite 默认的「工作区根目录」，工程自身必须一起放行，
      // 否则连 index.html 都会 403
      const projectRoot = path.resolve('.')

      return {
        // kit 与业务工程各自依赖了 vue，这里统一只保留业务侧的一份实例
        resolve: {
          dedupe: ['vue', 'vue-router', 'naive-ui'],
        },

        optimizeDeps: {
          exclude: ['kit'],
        },

        server: {
          fs: {
            // 会被 Vite 与业务自己写的 allow 合并，不需要业务侧手动拼
            allow: [projectRoot, kitRoot],
          },
        },
      }
    },

    configureServer(server) {
      // kit 源码位于业务工程目录之外，默认不在监听范围内，这里补上以保证 HMR
      server.watcher.add(resolvePackageDirs())
    },
  }
}
