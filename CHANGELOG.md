# Changelog

## v1.2.0

- 兼容 DSH 0.2.3-alpha.2（并覆盖 0.2.2-rc.1 起的 0.2.x），新增 `engines.dsh`。
- 确认框浮层声明 `data-window-drag-exclude`，满足 DSH 0.2.2-rc.1 起的 macOS 窗口区域规则。
- 核对 0.2.2-rc.1 → 0.2.3-alpha.2 升级项：路由认证迁移、Client 模块元信息、Session 头部槽位迁移、`sessionQuery.inspectSession` 移除等均不影响本插件。
- README 补充兼容性说明。

## v1.1.0

- 包名改为 `dsh-session-deleter`，移除 `private`，支持从 GitHub 安装。
- README 增加 GitHub / 本地目录 / 多 profile 安装说明。

## v1.0.0

- 首个公开版本：会话行「删除会话」，清理日志、投影缓存、工作区记账、归档/置顶登记与子代理会话，并带启动孤儿 GC。
