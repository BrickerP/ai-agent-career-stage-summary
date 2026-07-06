# AI Agent 产品工程阶段总结

这是一个脱敏后的个人阶段总结，覆盖我在 AI agent、用户研究 SaaS、语音访谈、报告生成、MCP/CLI 接入、质量评测和发布验证方向上的一段集中工程实践。

它不是内部系统文档，也不是代码发布。公开版本只保留可以对外说明的工程主题、系统边界和方法论。

## 阶段主题

这一阶段的核心问题是：怎样把 AI agent 从单点 demo 变成可以被真实客户、运营流程和工程团队持续使用的产品系统。

我关注的不只是模型调用，而是模型之外的工程结构：

- 用户如何发起一个研究任务
- Agent 如何理解任务并调用工具
- 后端如何稳定承载 Study、Recruit、Interview、Report 等业务域
- 语音 runtime 如何和 SaaS 业务状态对齐
- 报告产物如何被验证、编辑、回归和评测
- Preview、E2E 和 release gate 如何降低线上风险
- CLI、MCP、Skill、插件如何成为真实的 agent 操作入口

## 我形成的工程判断

### 1. Agent 入口必须是产品契约，不只是 prompt

Agent 可以通过自然语言发起任务，但真正可靠的系统必须把语义入口落到稳定契约上。MCP、CLI、skill、plugin 的价值在于把用户意图映射成可追踪、可重试、可验证的操作。

这类入口需要和服务端 API 严格同步。文档写得像能力，不代表系统就拥有这个能力；只有服务端契约、权限、返回结构、错误处理和 E2E 全部对齐，agent 才能被当成产品能力交付。

### 2. 报告链路是信任链路

在用户研究产品里，报告不是一个普通导出功能。它承载了访谈事实、样本覆盖、引用证据、业务结论和最终交付物格式。

因此报告链路需要关注：

- transcript eligibility
- locked facts
- artifact edit
- markdown / html / slide / video 等多格式交付
- 事实引用和可追溯性
- benchmark 与 regression

AI 生成报告最容易看起来完整，但缺失事实边界。工程上必须让报告质量有明确检查点。

### 3. 语音 Agent 不是独立玩具

语音 runtime 可以独立处理实时会话、房间、媒体流和中断，但它最终还是要服务于业务链路：谁在访谈、访谈属于哪个 study、素材如何回放、状态如何同步、错误如何恢复。

我的判断是：语音层要和主 SaaS 解耦实现，但不能和业务契约脱节。实时体验和后端事实必须最终一致。

### 4. E2E 和发布闸是 AI 产品的基础设施

AI 产品的问题常常不是单个函数错了，而是多系统状态不一致：环境、cookie、权限、DB、队列、网关、模型返回、前端状态都可能导致失败。

所以我把验证重点放在端到端链路上：

- preview/dev/prod 环境分离
- 关键 workflow 的 smoke test
- 发布前 gate
- 失败原因归因，而不是只看最后一个错误
- 把真实用户路径纳入自动化验证

### 5. 研究数据和 benchmark 是产品改进闭环

如果报告、访谈和研究流程只停留在一次性生成，就很难持续改进。需要把案例、结果、评分、导出和模拟数据重新纳入 benchmark 或训练/评测材料。

这使产品从“能生成”走向“能比较、能回归、能解释为什么变好或变差”。

## 能力栈总结

- 产品系统：Study、Recruit、Interview、Report、Billing、Workspace 等复杂 SaaS 域建模
- Agent 接入：MCP、CLI、skill/plugin、工具调用、结构化返回、deep link
- 后端工程：API contract、queue/event、database schema、权限、错误边界
- 前端工程：复杂 workflow UI、报告展示、状态恢复、增长入口
- 语音系统：实时会话、RTC/LiveKit 类 runtime、数据通道、回放素材
- 质量工程：E2E、preview smoke、release gate、benchmark、artifact verification
- 基础设施：compose、gateway、CI/CD、环境隔离、部署验证

## 这一阶段留下的原则

1. 先定义可验证的产品契约，再让 agent 使用它。
2. 报告和研究结论必须保留事实来源。
3. 语音、CLI、MCP、Web UI 都应该进入同一套业务真相。
4. AI 产品的稳定性来自 workflow 级验证，不只是单测。
5. 对外暴露能力时，要比内部 API 更谨慎。
6. 工程总结可以公开，但内部图谱、代码路径和客户数据不应该公开。

## 公开版本边界

这个仓库只展示高层架构和个人工程反思。完整代码图谱、内部仓库名细节、服务端路径、私有 endpoint、环境变量、客户数据和底层 symbol map 均已排除。
