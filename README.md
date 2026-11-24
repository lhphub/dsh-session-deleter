# dsh-session-deleter

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）Web 界面增加「删除会话」：在会话行点 **⋯** 或 **右键**，菜单中「归档会话」同一分组内出现「删除会话」，确认后永久删除该会话及其完整数据链路。

## 功能

- 删除会话日志（所有格式代际，含 `session.lock`）
- 删除投影缓存记录（`session_projcache`）
- 移出工作区记账（`workspace.json` 的 `sessionIds`，并清理归档/置顶登记）
- 删除前停止仍在运行的工作（turn、子代理、jobs、schedule 任务）
- 级联删除该会话的子代理会话（确认框会显示数量）
- 删除正在查看 / 已归档 / 已置顶的会话都可用
- 启动时做一次孤儿 GC：清理不存在的会话遗留的归档/置顶登记、投影缓存行与工作区记账

## 界面

- 入口位于会话行菜单（⋯ / 右键），与「归档会话」同一分隔组、排在其后。
- 确认框遵循 DSH Modal/Button 样式，使用 `--dsw-alias-*` 主题 token，自动适配浅色 / 深色 / 跟随系统。

## 安装

本插件是 DSH profile bundle（同时包含 Host 与 Client 半边）。**安装一次即可在该 profile 的所有工作区/项目中使用**，不需要按项目重复安装。

### 方式一：从 GitHub 安装（推荐给其他使用者）

```bash
dsh plugin --profile <profile> add github:lhphub/dsh-session-deleter
```

也可以在 dsh-market 中通过 GitHub 源 `lhphub/dsh-session-deleter` 安装；或者由 DSH 的 `plugin_manager` 使用 `github:lhphub/dsh-session-deleter` 作为安装 spec。

### 方式二：本地目录（开发/自用）

```bash
git clone https://github.com/lhphub/dsh-session-deleter
dsh plugin --profile <profile> add link:/absolute/path/to/dsh-session-deleter
```

也可以把本目录交给 DSH 的 `plugin_manager`，安装该目录的绝对路径。

### 其他 profile

不同 profile 相互独立：在哪个 profile 安装，该 profile 下的所有项目就都能用。若你有多个 profile，需要在每个 profile 中安装一次。

安装后在会话行菜单即可看到「删除会话」。如果菜单没有立即出现，重新加载 DSH 界面即可；插件本身不需要重启 DSH 才能启用。

## 清理范围与例外

| 数据 | 处理 |
| --- | --- |
| 会话日志（`$DSH_HOME/sessions/...`） | 删除整个会话目录 |
| 投影缓存（`session_projcache`） | 删除对应记录 |
| 工作区记账（`workspace.json`） | 移出 `sessionIds`，清理归档/置顶登记 |
| 运行中工作 | 先停止再删除 |
| 子代理会话 | 级联删除 |
| 标题 / goal / 反馈 | 随日志删除 |

不删除：内容寻址的附件对象（可能被其他会话共享）、请求图片缓存、file-api 时间映射、第三方全局用量账本、工作区目录/代码/worktree、已上报的远端遥测。普通 fork 出的会话是独立会话，不级联。

已知限制：DSH 没有给第三方插件的“逐会话销毁”接口，因此删除仍在内存中打开的会话时，日志/缓存/工作区归属会立即清理，而 `workspace.json` 里的归档登记会保留到会话销毁或下次启动的启动 GC（期间界面不可见）。

## 安全

- Host 半边只注册一个受 DSH 认证栅栏保护的 exact API 路由 `/api/session-deleter`，仅本机已认证 owner 浏览器可调用。
- 删除是幂等的，失败会返回具体步骤；不会自动重启 DSH，也不会改动其它插件。
- 客户端只使用槽位与 `ctx.contextMenus`，不导入任何 DSH Client 包。

## 兼容性

- 当前测试环境：DSH **0.2.3-alpha.2**（macOS 桌面版）。
- `engines.dsh`：`>=0.2.2-rc.1 <0.3.0 || >=0.2.3-alpha.0 <0.3.0`，覆盖 0.2.2-rc.1 起至 0.2.x（含 0.2.3 预发布）。
- 已按 0.2.2-rc.1 → 0.2.3-alpha.2 的升级项核对：
  - 路由认证迁移（rc.2）：仍通过 Connection 的已认证 exact Fetch 路由注册，未直接注册 WebServer 路由；
  - macOS 自定义浮层窗口区域（rc.1）：确认框已声明 `data-window-drag-exclude`；
  - Session 头部槽位迁移、`sessionQuery.inspectSession` 移除等变更与本插件无关（本插件不依赖这些接口）。
- 依赖 DSH 的 `contextMenus`、`sessionPersistence`、`workspaceRegistry`、`storageDomain`、`sessionQuery.readTitle` 与 `connection.fetch` 接口。

## 目录结构

```
index.js            Host：删除引擎、启动 GC、认证路由
client.js           Client：菜单项、确认框
cordis.patch.yml    bundle patch
locale/{zh,en}.json 插件管理器显示信息
icon.svg            图标
```

## License

MIT
