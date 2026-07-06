# 公开版 Onboarding

这份 onboarding 面向想快速理解这一阶段工作的人，例如招聘方、工程同事或对 AI agent 产品工程感兴趣的读者。

## 先看什么

1. 先读 [README](README.md)，理解这个仓库的公开边界。
2. 再读 [阶段总结](SUMMARY.zh.md)，了解我在这一阶段解决的问题类型。
3. 然后读 [架构地图](ARCHITECTURE_MAP.zh.md)，建立系统分层。
4. 最后看 [脱敏说明](SECURITY_AND_SANITIZATION.md)，理解为什么没有公开完整代码图谱。

## 如何理解这段经历

不要把它理解成单一功能开发。更准确的描述是：围绕 AI 用户研究产品，把多个入口、多个运行时、多个交付物和多个验证系统收束到可持续的工程体系里。

这段经历的难点在于边界多：

- Web 产品入口
- Agent 工具入口
- CLI / skill / plugin 入口
- 语音会话 runtime
- 后端业务 API
- 报告 artifact
- 评测和 E2E
- preview / release / gateway 环境

真正的工程挑战是让这些边界之间的契约清楚、可验证、可回滚。

## 面试时可以展开的方向

- 如何设计 agent 工具契约，而不是只写 prompt
- 如何让 MCP/CLI/Skill 与后端 API 同步演进
- 如何处理 AI 报告的事实边界和可追溯性
- 如何把语音 runtime 和 SaaS 业务状态对齐
- 如何用 E2E / preview gate 验证复杂 AI workflow
- 如何在多仓、多环境、多产品域下做系统级排障

## 一句话总结

这一阶段让我从“实现 AI 功能”转向“交付可验证、可维护、可持续演进的 AI 产品系统”。
