# 多平台搜索引擎分析（海外）

## 当前实现

WEOPC 提供 `/toolbox/search-engines` 页面和以下 API：

- `GET /api/v1/search/platforms`：返回平台、可用状态和当前数据通道。
- `POST /api/v1/search/query`：需要登录，提交 `{ "query": "...", "platforms": ["bing", "duckduckgo"], "limit": 10 }`。

OpenSERP 主仓库：<https://github.com/karust/openserp>（MIT License，当前实现基于 main 提交 `29c7b0fbe09640160efcfc1f1e04e60e0fbe60e9` 核对）。它提供 Google、Yandex、Baidu、Bing、DuckDuckGo、Ecosia 的统一 JSON 搜索 API，并支持 `/engine/search` 和 `/mega/search` 端点。

调研结论：当前仓库是 Go 1.24 项目，HTTP 层使用 Fiber，结果解析依赖 goquery，并通过 go-rod、TLS client、SOCKS5 等组件处理浏览器渲染与代理场景；仓库自带 Go test、race、vet、OpenAPI lint、构建和 golangci-lint CI。许可证文件为 MIT，但搜索结果抓取仍需分别遵守目标搜索引擎的条款。主分支有持续提交和 CI，不代表对 WEOPC 提供 SLA；生产环境应固定经验证的 commit/tag，并保留平台失败降级。

## 部署

推荐单独运行 OpenSERP，再将地址写入 API 服务的环境变量：

```bash
docker run --rm -p 127.0.0.1:7000:7000 karust/openserp:latest serve -a 0.0.0.0 -p 7000
OPENSERP_BASE_URL=http://127.0.0.1:7000
```

WEOPC API 不把 OpenSERP 密钥发送给浏览器。使用托管 API 时，将密钥只配置在 `OPENSERP_API_KEY`。

未配置 `OPENSERP_BASE_URL` 时，Bing 和 DuckDuckGo 会显示为直连降级通道；Google、Yandex、Baidu、Ecosia 会置为未配置。搜索引擎可能触发验证码、限流或服务条款限制，单个平台失败不会阻断其他平台。

## 资源保护与安全

- 查询词限制为 1-100 个字符，每个平台返回 1-20 条。
- 每个平台请求超时默认为 8 秒；成功查询缓存 5 分钟。
- 每个 IP 的搜索接口默认 15 分钟最多 30 次。
- 平台白名单由服务端固定，错误响应不包含代理、密钥或内部堆栈。
- OpenSERP 抓取搜索结果可能受到目标平台 robots、Terms of Service、IP 封禁和地区策略影响。生产环境应优先使用经授权的搜索 API 或自建合规代理，并根据目标平台规则调整频率。

## 验证

```bash
pnpm --dir apps/api test -- --runInBand
pnpm --dir apps/api build
pnpm --dir apps/web build
```
