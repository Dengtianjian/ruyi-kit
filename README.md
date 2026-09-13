# ruyi-kit

RUYI 公共库：Vue 3 组件、请求封装、业务服务与类型定义，以及不依赖框架的基础样式、OSS 工具和（预留的）小程序端能力。

以 **源码直引 + 子路径导出** 的方式被业务工程使用：

- 不需要构建、不需要发布 —— kit 里改完代码，业务工程热更新即可看到效果，中途调试组件最省事
- 业务侧配置极少（一条依赖 + 一个 vite 插件，不需要为 kit 写 tsconfig），全程有类型提示（`vue-tsc` 能直接检查到 kit 源码）

## 快速开始

kit 不需要构建、也不需要发布，但用之前得先把它自己装好，再由业务工程 `link:` 过来。按顺序做这 6 步：

**1. 拉取仓库**（与业务工程并列存放，下面一律按 `../ruyi-kit` 这个相对路径写）

```bash
git clone https://github.com/Dengtianjian/ruyi-kit.git ruyi-kit
```

**2. 装 kit 自己的依赖 —— 必须执行**

```bash
cd ruyi-kit && pnpm install
```

**3. 业务工程声明依赖**（一条命令，不用手动改 `package.json`）

```bash
cd ../<业务工程>
pnpm add kit@link:../ruyi-kit   # 键名必须写成 kit（包自身的 name 是 ruyi-kit，业务侧按 kit/... 引入）
```

或者手写依赖，再 `pnpm install`：

```jsonc
// package.json
{
  "dependencies": {
    "kit": "link:../ruyi-kit"
  }
}
```

**4. 业务工程 vite 配置挂上插件**

```ts
// vite.config.ts
import { kitPlugin } from 'kit/vue/vite-plugin'

export default defineConfig({
  plugins: [vue(), kitPlugin()]
})
```

**5. 业务工程入口引入样式**（按需）

```ts
// src/main.ts
import('kit/vue/assets/css/common.css')
```

**6. 在业务代码里引入使用**

```ts
import { RuyiRequest } from 'kit/vue'                                      // foundation / services / types
import NaiveUIProvider from 'kit/vue/components/Naive/NaiveUIProvider.vue' // 组件：子路径 + 全文件名
import { JSOSS } from 'kit/javaScript/OSS/JSOSS'                           // 纯 TS 工具
import 'kit/core/css/common.css'                                           // 与框架无关的样式
```

几点说明：

- **第 2 步不能省**：业务侧 `vue-tsc` 会顺着 `vite.config.ts` 走进 kit 源码，其中 `vite` 的类型由 kit 自己的 `devDependencies` 提供，没装就会报 `找不到模块 "vite"`。
- **第 4 步之后 kit 就活了**：`kitPlugin()` 已经把 kit 源码目录加入 watcher，之后改 kit 组件即热更新，不用重新构建，也不用重启 dev server。
- `vue` / `vue-router` / `naive-ui` / `dayjs` / `vite` 都是 kit 的 `peerDependencies`，由业务工程提供（业务侧通常已经有了，不用额外补），kit 也不锁定它们的版本。
- 上手细节与踩坑见「一、业务端配置」「二、常见问题」，改 kit 时看「三、维护约定」。

---

## 目录结构

```
packages
├── core/                     # 与框架无关的基础内容
│   └── css/common.css        # 通用样式（a 标签、省略号）→ kit/core/css/common.css
├── javaScript/               # 纯 TS 工具，不依赖 vue / naive-ui
│   └── OSS/                  # JSOSS、JSQCloudCOS → kit/javaScript/OSS/JSOSS
├── miniProgram/              # 小程序端：api / components / foundation / platform / services / types
├── nuxt/                     # 预留
└── vue/                      # Vue 3 组件、请求封装、业务服务与类型
    ├── components/           # 组件（.vue 源码，按子路径引入）
    │   ├── Base/             # AnthorFloating、RCopyText、RPanel、RKeepAliveRouterView、RRouterMenu、RSpace、RStatus、RCommonFooter、Layout/RTwoColumnLayout
    │   ├── Naive/            # NaiveUIProvider、NaiveUIMenu、NaiveUIMenuLink、RNaiveConfig、RNaiveFormItem、
    │   │                     # RNaiveRouterMenu、RNaiveRouterTabs、RNaiveUpload、RCenterPagination
    │   └── DiscuzX/          # RDiscuzXUploadAttachment、RDiscuzXUploadFile
    ├── foundation/           # 基础能力：cookies、eventBus、file、helper、naiveUI
    │   ├── HTTP/             # RuyiRequest、request、HTTP、discuzXRequest（均由 kit/vue 入口导出）
    │   └── network/request/  # 旧版 Fetch/Request 实现，当前无人引用（遗留）
    ├── services/             # 业务服务：SettingFormService、commonService、dayjsService、naiveUIService、
    │   │                     # naiveRouterMenuService、discuzX/DiscuzXSettingFormService
    ├── types/                # 类型定义（common、components、declare/vue-router、discuzX）
    ├── api/                  # 常见接口封装（AttachmentsApi、SettingsApi、discuzX/*）
    ├── assets/css/common.css # 主题变量、省略号、滚动条
    ├── vite-plugin.ts        # 业务工程用的 vite 插件
    └── index.ts              # kit/vue 入口
```

仓库根目录只有 `package.json`（`exports` + 依赖声明）、`pnpm-lock.yaml`、`README.md`、`LICENSE`；**没有 `tsconfig.json`，也没有 `dependencies`** —— kit 自己不跑 `vue-tsc`，类型检查是业务侧 `vue-tsc` 顺着 `exports` 走进源码完成的。

`exports` 对外暴露的子路径（除 `kit/vue` 外都是子路径直引源码，无 `index.ts` 也能用）：

| 导入 | 指向 |
| --- | --- |
| `kit/vue` | `packages/vue/index.ts`：`foundation/*`、`services/*`、`types/*` 的入口 |
| `kit/vue/*` | `packages/vue/*`：组件（`.vue`）、`api/*`、`services/*` 等，**要写全文件名（含扩展名）** |
| `kit/vue/vite-plugin` | `packages/vue/vite-plugin.ts` |
| `kit/core/*` | `packages/core/*`，如 `kit/core/css/common.css` |
| `kit/javaScript/*` | `packages/javaScript/*`，如 `kit/javaScript/OSS/JSOSS` |

`miniProgram/`、`nuxt/` 暂未在 `exports` 中暴露。

> `exports` **不做扩展名与目录回退**：`kit/vue/api/common/AttachmentsApi` 解析不到，必须写成 `kit/vue/api/common/AttachmentsApi.ts`（`.vue`、`.css` 同理，因为它们本来就是带扩展名引入的）。只有像 `kit/vue/vite-plugin` 这种在 `exports` 里显式写了 `./packages/vue/vite-plugin.ts` 的单文件子路径，才能省扩展名。

---

## 一、业务端配置

### 1. 声明依赖

```jsonc
// package.json
{
  "dependencies": {
    "kit": "link:../ruyi-kit"
  }
}
```

这条依赖也可以用命令加上：`pnpm add kit@link:../ruyi-kit`（见「快速开始」第 3 步）。`pnpm install` 之后 `node_modules/kit` 会指向本仓库。`kit/vue`、`kit/core/*`、`kit/javaScript/*` 等子路径由本包的 `exports` 提供，**业务侧不需要为 kit 写 tsconfig paths**。

kit 把 `vue` / `vue-router` / `naive-ui` / `dayjs` / `vite` 全部声明成 `peerDependencies`（运行时只应存在一份，`vue` 与 `naive-ui` 尤其如此），所以这几项要由业务工程提供：本工程 `dayjs` 在 `dependencies`、`naive-ui` 在 `devDependencies`（app 会被打包，dev 依赖同样可用），`vue` / `vue-router` / `vite` 也都在。版本对得上即可，kit 不锁定它们。

### 2. vite 配置

```ts
import { kitPlugin } from 'kit/vue/vite-plugin'

export default defineConfig({
  plugins: [
    vue(),
    // ...其它插件
    kitPlugin()
  ]
})
```

`kitPlugin()` 处理了 `link:` 安装带来的三件事，缺一个都会踩坑：

| 做的事 | 不做的后果 |
| --- | --- |
| `resolve.dedupe: ['vue', 'vue-router', 'naive-ui']` | 业务与 kit 各解析到一份 `vue`/`naive-ui`，出现「双实例」：`useMessage()` 拿到 null、响应式失效、naive-ui 报错 |
| `server.fs.allow` 放行**业务工程根目录 + kit 真实目录** | dev server 报 `The request url ... is outside of Vite serving allow list`（403）。注意：显式写 `allow` 会覆盖 Vite 默认的「工作区根目录」，只放 kit 的话连工程自己的 `index.html` 都会被挡 |
| `server.watcher.add` 监听 kit 源码目录 | 改 kit 组件不触发热更新，要手动重启 dev server |

监听范围固定为 `packages/core`、`packages/javaScript`、`packages/vue` 三个目录，目前不需要传参：

```ts
kitPlugin(options?: KitPluginOptions)   // options 先保留，后续按需扩展
```

### 3. TypeScript（不需要为 kit 加任何配置）

`kit` 是源码直引，所以 `vite.config.ts` 里的 `import { kitPlugin } from 'kit/vue/vite-plugin'` 也会被 `vue-tsc` 检查。插件里 `import type { Plugin } from 'vite'` 所需的那份 vite 类型由 **kit 自己的 `devDependencies.vite`** 提供（`vite` 同时是 peer，运行时仍用业务工程那份），因此业务侧**不需要写 `paths` 把 `vite` 指过来**。

这一节里真正**必须做**的只有一件事，而且是在 kit 仓库里做：kit 自己装过一次依赖（`ruyi-kit/` 下 `pnpm install`），否则业务侧的 `vue-tsc` 会在插件源码处报 `找不到模块 "vite"`。

其余**推荐**顺手给 `tsconfig.node.json` 加一条 `outDir`（不加也能跑，只是编译产物会散落在源文件旁边）。它和「kit 有没有装依赖」无关，解决的是**产物落盘**：`tsconfig.node.json` 的 `include` 里有 `vite.config.*`，而它又 import 了 kit 源码，`composite` 构建会顺带为 kit 那份源码发射 `.js` / `.d.ts`，不指 `outDir` 就会写进 kit 仓库：

```jsonc
// tsconfig.node.json
{
  "compilerOptions": {
    // 产物统一丢进 node_modules，否则仓库里会多出 vite.config.js、vite-plugin.js、*.d.ts
    "outDir": "./node_modules/.tmp/tsconfig.node-out"
  }
}
```

业务端的 app 侧（`src/**`、`tsconfig.app.json`）同样**不需要任何 kit 相关配置**，直接用 `kit/vue` 就能获得类型提示。

---

## 二、常见问题

| 现象 | 原因与处理 |
| --- | --- |
| `is outside of Vite serving allow list`（403） | kit 通过 `link:` 安装、源码在业务工程之外。用 `kitPlugin()` 放行 `[工程根目录, kit 真实目录]`；若业务自己配置了 `server.fs.allow`，插件返回的值会与其**合并**（Vite 的 `mergeConfig` 对数组合并），不会互相覆盖 |
| naive-ui 报注入错误、`useMessage()` 返回 null、响应式不更新 | 出现两份 `vue` / `naive-ui`。这两者都是 kit 的 `peerDependencies`，业务侧要自己装并保持一份；`kitPlugin()` 的 `dedupe` 会把 kit 源码里的引用强制指回业务工程那份 |
| 修改 kit 组件不热更新 | `kitPlugin()` 已把 kit 源码加入 watcher；如果业务自定义了 `server.watch`，注意别把外部目录忽略掉 |
| 仓库里莫名多出 `vite.config.js`、`packages/vue/vite-plugin.js` 等文件 | `vue-tsc --build` 的编译产物，按上面第 3 步给 `tsconfig.node.json` 设置 `outDir`（并删掉已生成的残留文件） |
| `Cannot find module 'kit/vue/vite-plugin'` | 插件会自行定位 kit 包目录（同时兼容源码直载与被打包进业务 config 两种方式）。若仍报错，确认依赖确实装成了 `link:`，且 `node_modules/kit` 指向本仓库 |
| `Cannot find module 'kit/vue/api/common/AttachmentsApi'` | `exports` 不做扩展名与目录回退，子路径要写全文件名：`kit/vue/api/common/AttachmentsApi.ts`（`kit/vue/vite-plugin` 是 `exports` 里显式声明的，所以能省扩展名） |
| 业务侧 `vue-tsc` 在 kit 的 `vite-plugin.ts` 上报 `找不到模块 "vite"` | kit 的 vite 类型来自它自己的 `devDependencies.vite`，在 `ruyi-kit/` 下执行一次 `pnpm install` 即可；**不要**在业务侧用 `paths` 指过来 |
| 子路径导入没有类型提示 | 业务工程需要用 `vue-tsc` 做类型检查（纯 `tsc` 不解析 `.vue`）；`exports` 的 `./vue/*`、`./core/*`、`./javaScript/*` 都直接指向源码，类型来自源码本身 |
| `Cannot find module 'kit/javaScript/OSS/JSQCloudCOS'` 里报 `cos-js-sdk-v5` 找不到 | `JSQCloudCOS` 的类型依赖 `cos-js-sdk-v5`，业务工程要用它就自己装一份；只用 `JSOSS` 不受影响 |

---

## 三、维护约定（改 kit 时看这里）

1. **kit 没有构建步骤**，也不需要 `dist`：业务工程通过 `exports` 直引源码。新增文件后业务侧重启一次 dev server 即可。
2. **新增子包**：在 `package.json` 的 `exports` 加两条 —— `"./<子包>": { "types": "./packages/<子包>/index.ts", "import": "./packages/<子包>/index.ts" }`（需要 `index.ts` 存在）和 `"./<子包>/*": { "import": "./packages/<子包>/*" }`（子路径直引，如 `kit/core/css/common.css`）；**单文件子路径得在 `exports` 里显式写全**，如 `"./vue/vite-plugin": { "types": "./packages/vue/vite-plugin.ts", "import": "./packages/vue/vite-plugin.ts" }` —— `./vue/*` 通配不会补 `.ts`；HMR 监听固定在 `packages/core`、`packages/javaScript`、`packages/vue`，新增目录时在 `packages/vue/vite-plugin.ts` 的 `PACKAGES` 里补上。
3. **依赖分工**：kit 没有 `dependencies`，`vue` / `vue-router` / `naive-ui` / `dayjs` / `vite` 都是 `peerDependencies`，运行时实例由业务工程提供（`vue`、`naive-ui` 必须只有一份）；kit 的 `devDependencies` 里也各带一份，**仅供本仓库自身类型检查** —— 业务侧 `vue-tsc` 会顺着 `vite.config.ts` 走进 kit 源码，这些包必须能从 kit 目录解析到，其中 `vite` 只被 `packages/vue/vite-plugin.ts` 用作类型（`import type { Plugin } from 'vite'`）。改完依赖记得在 `ruyi-kit/` 下 `pnpm install`。新增第三方依赖时优先考虑 peer（业务侧已有），避免打包出第二份。
4. **全量与子路径**：`kit/vue` 只导出 `foundation/*`、`services/*`、`types/*`；组件走子路径，避免入口把所有组件都牵连进来。
5. **不要在 kit 里 import 业务工程代码**，方向只能是业务 → kit。
