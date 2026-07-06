import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dashboardRoot = process.env.UNDERSTAND_ANYTHING_DASHBOARD_ROOT;
const docsDir = join(repoRoot, "docs");
const basePath = "/ai-agent-career-stage-summary/";

if (!dashboardRoot) {
  throw new Error(
    "Set UNDERSTAND_ANYTHING_DASHBOARD_ROOT to the local Understand-Anything dashboard package path.",
  );
}

const distDir = join(dashboardRoot, "dist");

function node(id, type, name, summary, tags, complexity = "moderate") {
  return { id, type, name, summary, tags, complexity };
}

function edge(source, target, type, description, weight = 0.75) {
  return { source, target, type, direction: "forward", description, weight };
}

const now = new Date().toISOString();

const nodes = [
  node(
    "domain:research-platform",
    "domain",
    "研究平台主域",
    "Study、招募、访谈、报告和 workspace 状态组成的核心产品链路。",
    ["study", "recruit", "interview", "report"],
    "complex",
  ),
  node(
    "domain:agent-interface",
    "domain",
    "Agent 接入域",
    "MCP、CLI、Skill 和插件把自然语言意图转成可验证产品操作。",
    ["mcp", "cli", "skill", "tools"],
  ),
  node(
    "domain:voice-runtime",
    "domain",
    "语音访谈运行域",
    "实时语音会话、房间状态、媒体流、中断处理和回放证据。",
    ["voice", "rtc", "live-session"],
  ),
  node(
    "domain:participant-supply",
    "domain",
    "参与者供给与激励域",
    "样本招募、容量控制、参与者机会、钱包和激励流程。",
    ["participants", "recruit", "incentives"],
  ),
  node(
    "domain:report-quality",
    "domain",
    "报告质量与评测域",
    "报告 artifact、事实锁定、可编辑交付物、benchmark 和回归信号。",
    ["report", "artifact", "benchmark"],
    "complex",
  ),
  node(
    "domain:growth-onboarding",
    "domain",
    "官网增长与 Onboarding 域",
    "官网、落地页、登录桥接、用户进入 SaaS 的增长和 onboarding 表面。",
    ["website", "growth", "onboarding"],
  ),
  node(
    "domain:infra-release",
    "domain",
    "基础设施与发布验证域",
    "Preview、E2E、gateway、环境隔离和 release gate 提供上线信心。",
    ["e2e", "preview", "release"],
    "complex",
  ),

  node("flow:study-to-report", "flow", "Study -> Report 主流程", "从研究设计到样本、访谈、素材、洞察报告的主业务流。", ["core-flow"], "complex"),
  node("flow:agent-tool-call", "flow", "Agent Tool Call 流程", "Agent 通过 skill/CLI/MCP 触发后端契约并拿到结构化结果。", ["agent-flow"]),
  node("flow:voice-session", "flow", "Voice Session 流程", "语音 runtime 把实时会话转回可追踪访谈事实和回放素材。", ["voice-flow"]),
  node("flow:report-eval", "flow", "Report Evaluation Loop", "报告交付物进入 benchmark、评测和回归，用于持续改进。", ["quality-flow"]),
  node("flow:release-gate", "flow", "Preview Release Gate", "发布前用真实 workflow smoke 和环境隔离降低线上风险。", ["release-flow"]),

  node("step:study-design", "step", "Study Design", "研究目标、问题、样本条件和访谈计划形成可执行配置。", ["study"]),
  node("step:recruit-targeting", "step", "Recruit Targeting", "把研究条件转成参与者筛选、配额和触达策略。", ["recruit"]),
  node("step:interview-orchestration", "step", "Interview Orchestration", "组织 AI/真人访谈、会话状态和素材采集。", ["interview"]),
  node("step:report-artifact", "step", "Report Artifact", "从访谈事实和结构化结果生成可交付报告。", ["report"]),
  node("step:agent-intent", "step", "Agent Intent", "自然语言请求被解析成明确、可审计的工具动作。", ["agent"]),
  node("step:mcp-cli-execution", "step", "MCP / CLI Execution", "本地或远端工具层调用产品 API 并管理返回结构。", ["mcp", "cli"]),
  node("step:structured-result", "step", "Structured Result", "工具结果返回为 agent 可读、用户可验证的结构化响应。", ["result"]),
  node("step:voice-room", "step", "Voice Room", "实时房间、媒体流、打断和用户状态构成语音 runtime 的核心。", ["voice"]),
  node("step:transcript-evidence", "step", "Transcript Evidence", "语音与文本素材被转成报告可以引用的事实证据。", ["evidence"]),
  node("step:benchmark-cases", "step", "Benchmark Cases", "代表性案例和历史报告形成质量评测基准。", ["benchmark"]),
  node("step:regression-signal", "step", "Regression Signal", "E2E、评分和人工信号共同判断报告质量是否退化。", ["regression"]),
  node("step:preview-smoke", "step", "Preview Smoke", "在 preview 环境跑真实路径，确认关键业务行为仍可用。", ["preview"]),
  node("step:release-confidence", "step", "Release Confidence", "把 CI、E2E、gateway 和环境状态收束成可发布证据。", ["release"]),

  node("service:web-product", "service", "Web Product Surface", "用户研究产品的主要交互界面，承载复杂 workflow 状态。", ["frontend", "workflow"]),
  node("service:backend-contract", "service", "Backend API Contract", "业务 API、权限、异步任务和数据模型是 agent 与 UI 共享的真相来源。", ["backend", "api"]),
  node("service:agent-tooling", "service", "Agent Tooling Layer", "Skill、CLI、MCP 和 plugin 共同组成 agent 入口层。", ["tools", "agent"]),
  node("service:voice-runtime", "service", "Voice Runtime Service", "实时语音 runtime 与产品状态解耦实现，但通过契约对齐。", ["voice", "runtime"]),
  node("service:report-pipeline", "service", "Report Pipeline", "报告生成、编辑、事实锁定和多格式 artifact 交付。", ["report", "artifact"]),
  node("service:e2e-harness", "service", "E2E Harness", "跨环境验证真实用户路径，用失败证据定位系统边界问题。", ["e2e", "validation"]),
  node("service:benchmark-loop", "service", "Benchmark Loop", "案例、导出、评分和训练/评测材料形成改进闭环。", ["benchmark", "quality"]),
];

const edges = [
  edge("domain:research-platform", "flow:study-to-report", "contains_flow", "研究平台主域承载从 Study 到 Report 的主流程。"),
  edge("flow:study-to-report", "step:study-design", "flow_step", "先定义研究目标和问题。"),
  edge("step:study-design", "step:recruit-targeting", "flow_step", "研究配置进入招募和样本供给。"),
  edge("step:recruit-targeting", "step:interview-orchestration", "flow_step", "合格参与者进入访谈编排。"),
  edge("step:interview-orchestration", "step:report-artifact", "flow_step", "访谈素材和结构化事实生成报告 artifact。"),
  edge("domain:participant-supply", "step:recruit-targeting", "contains_flow", "参与者供给域支撑招募策略和配额。"),
  edge("domain:voice-runtime", "flow:voice-session", "contains_flow", "语音运行域支撑实时访谈流程。"),
  edge("flow:voice-session", "step:voice-room", "flow_step", "实时房间和媒体流是语音会话入口。"),
  edge("step:voice-room", "step:transcript-evidence", "flow_step", "会话素材转成可引用证据。"),
  edge("step:transcript-evidence", "step:report-artifact", "cross_domain", "语音证据回到报告生成链路。"),
  edge("domain:agent-interface", "flow:agent-tool-call", "contains_flow", "Agent 接入域包含工具调用主流程。"),
  edge("flow:agent-tool-call", "step:agent-intent", "flow_step", "用户意图先被转成工具动作。"),
  edge("step:agent-intent", "step:mcp-cli-execution", "flow_step", "工具层执行产品契约。"),
  edge("step:mcp-cli-execution", "step:structured-result", "flow_step", "执行结果回到 agent 和用户。"),
  edge("step:mcp-cli-execution", "service:backend-contract", "depends_on", "工具层依赖稳定后端 API。"),
  edge("domain:report-quality", "flow:report-eval", "contains_flow", "报告质量域包含评测和回归闭环。"),
  edge("flow:report-eval", "step:benchmark-cases", "flow_step", "先准备代表性报告/研究案例。"),
  edge("step:benchmark-cases", "step:regression-signal", "flow_step", "评测结果变成质量退化信号。"),
  edge("step:regression-signal", "service:report-pipeline", "validates", "质量信号验证报告 pipeline。"),
  edge("domain:infra-release", "flow:release-gate", "contains_flow", "基础设施域包含发布闸流程。"),
  edge("flow:release-gate", "step:preview-smoke", "flow_step", "先在 preview 运行真实路径 smoke。"),
  edge("step:preview-smoke", "step:release-confidence", "flow_step", "验证证据形成发布信心。"),
  edge("service:e2e-harness", "step:preview-smoke", "triggers", "E2E harness 执行 preview smoke。"),
  edge("service:web-product", "domain:research-platform", "serves", "Web 产品表面承载研究平台操作。"),
  edge("service:backend-contract", "domain:research-platform", "serves", "后端契约是主业务真相来源。"),
  edge("service:agent-tooling", "domain:agent-interface", "serves", "工具层暴露 agent 入口。"),
  edge("service:voice-runtime", "domain:voice-runtime", "serves", "语音 runtime 支撑实时访谈。"),
  edge("service:report-pipeline", "domain:report-quality", "serves", "报告 pipeline 支撑质量敏感产物。"),
  edge("service:benchmark-loop", "domain:report-quality", "validates", "benchmark loop 验证报告质量。"),
  edge("domain:growth-onboarding", "service:web-product", "routes", "官网和 onboarding 把用户导入产品。"),
  edge("domain:infra-release", "service:e2e-harness", "depends_on", "发布信心依赖可重复验证。"),
  edge("domain:agent-interface", "domain:research-platform", "cross_domain", "Agent 工具最终进入研究平台业务契约。"),
  edge("domain:voice-runtime", "domain:report-quality", "cross_domain", "语音证据最终影响报告可信度。"),
  edge("domain:infra-release", "domain:research-platform", "cross_domain", "发布验证保护核心研究 workflow。"),
];

const layers = [
  {
    id: "layer:domains",
    name: "公开业务域",
    description: "脱敏后的产品和运行时高层边界。",
    nodeIds: nodes.filter((n) => n.type === "domain").map((n) => n.id),
  },
  {
    id: "layer:flows",
    name: "关键流程",
    description: "跨域 workflow 的高层流程。",
    nodeIds: nodes.filter((n) => n.type === "flow").map((n) => n.id),
  },
  {
    id: "layer:steps",
    name: "流程步骤",
    description: "不暴露内部实现的核心执行步骤。",
    nodeIds: nodes.filter((n) => n.type === "step").map((n) => n.id),
  },
  {
    id: "layer:services",
    name: "公开服务抽象",
    description: "对外可说明的服务/能力抽象，而非私有仓库或文件结构。",
    nodeIds: nodes.filter((n) => n.type === "service").map((n) => n.id),
  },
];

const tour = [
  {
    order: 1,
    title: "先看 Study -> Report 主链路",
    description: "研究平台的核心是从 study 设计、招募、访谈到报告 artifact 的业务闭环。",
    nodeIds: ["domain:research-platform", "flow:study-to-report", "step:study-design", "step:report-artifact"],
  },
  {
    order: 2,
    title: "理解 Agent 如何进入产品",
    description: "Agent 入口不是 prompt 本身，而是 MCP/CLI/Skill 对稳定后端契约的调用。",
    nodeIds: ["domain:agent-interface", "flow:agent-tool-call", "service:agent-tooling", "service:backend-contract"],
  },
  {
    order: 3,
    title: "理解语音 runtime 的边界",
    description: "语音系统独立处理实时会话，但访谈事实和证据最终要回到报告链路。",
    nodeIds: ["domain:voice-runtime", "flow:voice-session", "step:voice-room", "step:transcript-evidence"],
  },
  {
    order: 4,
    title: "看质量与发布闭环",
    description: "报告 benchmark、E2E、preview smoke 和 release gate 共同把 AI workflow 变成可维护系统。",
    nodeIds: ["domain:report-quality", "flow:report-eval", "domain:infra-release", "flow:release-gate"],
  },
];

const graph = {
  version: "1.0.0",
  kind: "codebase",
  project: {
    name: "AI Agent Product Engineering - Public Career Map",
    languages: ["zh", "typescript", "python", "markdown", "yaml"],
    frameworks: ["React", "MCP", "CLI", "Voice Runtime", "E2E", "GitHub Pages"],
    description:
      "脱敏公开版 Understand-Anything dashboard：展示 AI agent 产品工程阶段总结的高层业务域、流程、服务抽象和质量闭环。",
    analyzedAt: now,
    gitCommitHash: "public-sanitized-summary",
  },
  nodes,
  edges,
  layers,
  tour,
};

const meta = {
  lastAnalyzedAt: now,
  gitCommitHash: "public-sanitized-summary",
  version: "1.0.0",
  analyzedFiles: nodes.length,
  theme: { presetId: "dark-ocean", accentId: "ocean" },
};

const config = {
  autoUpdate: false,
  outputLanguage: "zh",
};

const build = spawnSync(
  "pnpm",
  ["exec", "vite", "build", "--config", "vite.config.demo.ts", "--base", basePath],
  { cwd: dashboardRoot, stdio: "inherit" },
);

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

if (!existsSync(distDir)) {
  throw new Error(`Dashboard dist was not created: ${distDir}`);
}

rmSync(docsDir, { recursive: true, force: true });
mkdirSync(docsDir, { recursive: true });
cpSync(distDir, docsDir, { recursive: true });

writeFileSync(join(docsDir, ".nojekyll"), "");
writeFileSync(join(docsDir, "knowledge-graph.json"), JSON.stringify(graph, null, 2));
writeFileSync(join(docsDir, "domain-graph.json"), JSON.stringify(graph, null, 2));
writeFileSync(join(docsDir, "meta.json"), JSON.stringify(meta, null, 2));
writeFileSync(join(docsDir, "config.json"), JSON.stringify(config, null, 2));
writeFileSync(
  join(docsDir, "README.txt"),
  [
    "Public sanitized Understand-Anything dashboard build.",
    "This directory intentionally contains only high-level public graph data.",
    "Do not add private knowledge-graph exports, source code, internal paths, endpoints, or customer data.",
    "",
  ].join("\n"),
);

console.log(
  JSON.stringify(
    {
      docsDir,
      basePath,
      nodes: nodes.length,
      edges: edges.length,
      layers: layers.length,
      tour: tour.length,
    },
    null,
    2,
  ),
);
