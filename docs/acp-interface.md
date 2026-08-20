# OpenCode ACP (Agent Client Protocol) 接口文档

## 概述

OpenCode 实现了 [Agent Client Protocol (ACP)](https://agentclientprotocol.com)，通过 `opencode acp` 命令启动一个基于 **JSON-RPC 2.0** 的子进程，使用 **stdin/stdout** 进行 newline-delimited JSON 通信。

协议版本: `1`

---

## 传输层

- **协议**: JSON-RPC 2.0
- **传输**: Newline-delimited JSON (NDJSON) over stdio
- **方向**: 客户端 (编辑器) ↔ Agent (opencode acp)

每条消息以 `\n` 分隔，格式:

```json
// 请求 (Client → Agent)
{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {...}}

// 响应 (Agent → Client)
{"jsonrpc": "2.0", "id": 1, "result": {...}}

// 通知 (无 id，双向)
{"jsonrpc": "2.0", "method": "session/update", "params": {...}}
```

---

## 启动命令

```bash
opencode acp [--cwd <directory>] [--host <host>] [--port <port>]
```

| 参数     | 类型   | 默认值          | 说明                |
| -------- | ------ | --------------- | ------------------- |
| `--cwd`  | string | `process.cwd()` | 工作目录            |
| `--host` | string | (网络配置)      | HTTP 服务器绑定地址 |
| `--port` | number | (网络配置)      | HTTP 服务器端口     |

---

## Agent 能力声明

`initialize` 响应中声明以下能力:

```json
{
  "agentCapabilities": {
    "loadSession": true,
    "mcpCapabilities": { "http": true, "sse": true },
    "promptCapabilities": { "embeddedContext": true, "image": true },
    "sessionCapabilities": {
      "close": {},
      "fork": {},
      "list": {},
      "resume": {}
    }
  }
}
```

| 能力                                 | 说明                           |
| ------------------------------------ | ------------------------------ |
| `loadSession`                        | 支持加载已有会话               |
| `mcpCapabilities.http`               | 支持 HTTP MCP 服务器           |
| `mcpCapabilities.sse`                | 支持 SSE MCP 服务器            |
| `promptCapabilities.embeddedContext` | 支持嵌入上下文 (resource_link) |
| `promptCapabilities.image`           | 支持图片内容                   |
| `sessionCapabilities.close`          | 支持关闭会话                   |
| `sessionCapabilities.fork`           | 支持分叉会话 (unstable)        |
| `sessionCapabilities.list`           | 支持列出会话                   |
| `sessionCapabilities.resume`         | 支持恢复会话                   |

---

## 认证

OpenCode 提供一个认证方法:

| 字段          | 值                                              |
| ------------- | ----------------------------------------------- |
| `id`          | `"opencode-login"`                              |
| `name`        | `"Login with opencode"`                         |
| `description` | `"Run \`opencode auth login\` in the terminal"` |

当客户端支持 `terminal-auth` 能力时 (`clientCapabilities._meta["terminal-auth"] === true`)，认证方法会附带 `_meta`:

```json
{
  "_meta": {
    "terminal-auth": {
      "command": "opencode",
      "args": ["auth", "login"],
      "label": "OpenCode Login"
    }
  }
}
```

---

## 方法列表

### 1. `initialize` — 初始化连接

**方向**: Client → Agent

**请求参数** (`InitializeRequest`):

| 字段                       | 类型                                | 必填 | 说明                                       |
| -------------------------- | ----------------------------------- | ---- | ------------------------------------------ |
| `protocolVersion`          | `number`                            | ✅   | 协议版本，必须为 `1`                       |
| `clientInfo`               | `{ name: string, version: string }` | ✅   | 客户端信息                                 |
| `clientCapabilities`       | `object`                            | ❌   | 客户端能力声明                             |
| `clientCapabilities._meta` | `object`                            | ❌   | 扩展元数据，如 `{ "terminal-auth": true }` |

**响应** (`InitializeResponse`):

```json
{
  "protocolVersion": 1,
  "agentCapabilities": { ... },
  "authMethods": [
    {
      "id": "opencode-login",
      "name": "Login with opencode",
      "description": "Run `opencode auth login` in the terminal"
    }
  ],
  "agentInfo": {
    "name": "OpenCode",
    "version": "<installation-version>"
  }
}
```

---

### 2. `authenticate` — 认证

**方向**: Client → Agent

**请求参数** (`AuthenticateRequest`):

| 字段       | 类型     | 必填 | 说明                                       |
| ---------- | -------- | ---- | ------------------------------------------ |
| `methodId` | `string` | ✅   | 认证方法 ID，目前仅支持 `"opencode-login"` |

**响应** (`AuthenticateResponse`): `{}`

**错误**: `ACPUnknownAuthMethodError` — 未知的认证方法

---

### 3. `session/new` — 创建新会话

**方向**: Client → Agent

**请求参数** (`NewSessionRequest`):

| 字段         | 类型          | 必填 | 说明           |
| ------------ | ------------- | ---- | -------------- |
| `cwd`        | `string`      | ✅   | 工作目录       |
| `mcpServers` | `McpServer[]` | ❌   | MCP 服务器列表 |

**`McpServer` 类型**:

```typescript
// 本地 MCP 服务器
{
  name: string
  command: string
  args: string[]
  env: Array<{ name: string, value: string }>
}

// 远程 MCP 服务器
{
  name: string
  type: "remote"  // 通过 url 字段区分
  url: string
  headers: Array<{ name: string, value: string }>
}
```

**响应** (`NewSessionResponse`):

```json
{
  "sessionId": "string",
  "configOptions": [ ... ]
}
```

---

### 4. `session/load` — 加载已有会话

**方向**: Client → Agent

**请求参数** (`LoadSessionRequest`):

| 字段         | 类型          | 必填 | 说明           |
| ------------ | ------------- | ---- | -------------- |
| `sessionId`  | `string`      | ✅   | 会话 ID        |
| `cwd`        | `string`      | ✅   | 工作目录       |
| `mcpServers` | `McpServer[]` | ❌   | MCP 服务器列表 |

**响应** (`LoadSessionResponse`):

```json
{
  "configOptions": [ ... ]
}
```

加载后会通过 `session/update` 通知重放历史消息。

---

### 5. `session/list` — 列出会话

**方向**: Client → Agent

**请求参数** (`ListSessionsRequest`):

| 字段     | 类型     | 必填 | 说明           |
| -------- | -------- | ---- | -------------- |
| `cwd`    | `string` | ❌   | 按工作目录过滤 |
| `cursor` | `string` | ❌   | 分页游标       |

**响应** (`ListSessionsResponse`):

```json
{
  "sessions": [
    {
      "sessionId": "string",
      "cwd": "string",
      "title": "string",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "nextCursor": "string" // 可选，存在更多结果时返回
}
```

分页大小: 100 条/页，按 `updatedAt` 降序排列。

---

### 6. `session/resume` — 恢复会话

**方向**: Client → Agent

**请求参数** (`ResumeSessionRequest`):

| 字段         | 类型          | 必填 | 说明           |
| ------------ | ------------- | ---- | -------------- |
| `sessionId`  | `string`      | ✅   | 会话 ID        |
| `cwd`        | `string`      | ✅   | 工作目录       |
| `mcpServers` | `McpServer[]` | ❌   | MCP 服务器列表 |

**响应** (`ResumeSessionResponse`):

```json
{
  "configOptions": [ ... ]
}
```

恢复最近 20 条消息的历史记录。

---

### 7. `session/close` — 关闭会话

**方向**: Client → Agent

**请求参数** (`CloseSessionRequest`):

| 字段        | 类型     | 必填 | 说明    |
| ----------- | -------- | ---- | ------- |
| `sessionId` | `string` | ✅   | 会话 ID |

**响应** (`CloseSessionResponse`): `{}`

关闭会话时会中止底层正在运行的会话。

---

### 8. `session/fork` — 分叉会话 (Unstable)

**方向**: Client → Agent

**请求参数** (`ForkSessionRequest`):

| 字段         | 类型          | 必填 | 说明           |
| ------------ | ------------- | ---- | -------------- |
| `sessionId`  | `string`      | ✅   | 源会话 ID      |
| `cwd`        | `string`      | ✅   | 工作目录       |
| `mcpServers` | `McpServer[]` | ❌   | MCP 服务器列表 |

**响应** (`ForkSessionResponse`):

```json
{
  "sessionId": "string",
  "configOptions": [ ... ]
}
```

---

### 9. `session/prompt` — 发送提示

**方向**: Client → Agent

**请求参数** (`PromptRequest`):

| 字段        | 类型             | 必填 | 说明                |
| ----------- | ---------------- | ---- | ------------------- |
| `sessionId` | `string`         | ✅   | 会话 ID             |
| `prompt`    | `ContentBlock[]` | ✅   | 提示内容块数组      |
| `messageId` | `string`         | ❌   | 客户端指定的消息 ID |

**`ContentBlock` 类型**:

```typescript
// 文本
{ type: "text", text: string, annotations?: { audience?: Role[] } }

// 图片 (base64 或 URI)
{ type: "image", data?: string, mimeType?: string, uri?: string }

// 资源链接
{ type: "resource_link", uri: string, name: string, mimeType?: string }

// 内嵌资源
{ type: "resource", resource: { uri: string, mimeType?: string, text?: string, blob?: string } }
```

**支持的 URI scheme**:

- `file://` — 本地文件
- `zed://` — Zed 编辑器专用
- `data:` — Base64 内嵌数据
- `http://` / `https://` — 远程资源

**响应** (`PromptResponse`):

```json
{
  "stopReason": "end_turn",
  "usage": {
    "inputTokens": 100,
    "outputTokens": 50,
    "totalTokens": 200,
    "thoughtTokens": 30,
    "cachedReadTokens": 20
  },
  "userMessageId": "string"
}
```

**斜杠命令**: 当 prompt 文本以 `/` 开头时，会被解析为斜杠命令:

- `/compact` — 触发会话摘要压缩
- 其他已注册命令 — 通过 `sdk.session.command` 执行

---

### 10. `cancel` — 取消当前操作

**方向**: Client → Agent (通知)

**参数** (`CancelNotification`):

| 字段        | 类型     | 必填 | 说明    |
| ----------- | -------- | ---- | ------- |
| `sessionId` | `string` | ✅   | 会话 ID |

中止指定会话的底层执行。

---

### 11. `session/set_config_option` — 设置配置选项

**方向**: Client → Agent

**请求参数** (`SetSessionConfigOptionRequest`):

| 字段        | 类型     | 必填 | 说明                                         |
| ----------- | -------- | ---- | -------------------------------------------- |
| `sessionId` | `string` | ✅   | 会话 ID                                      |
| `configId`  | `string` | ✅   | 配置项 ID: `"model"` / `"effort"` / `"mode"` |
| `value`     | `string` | ✅   | 配置值                                       |

**`configId` 说明**:

| configId | value 格式                                                         | 说明         |
| -------- | ------------------------------------------------------------------ | ------------ |
| `model`  | `"{providerID}/{modelID}"` 或 `"{providerID}/{modelID}/{variant}"` | 切换模型     |
| `effort` | variant 名称 (如 `"low"`, `"default"`, `"high"`)                   | 切换推理强度 |
| `mode`   | mode ID (如 `"build"`, `"plan"`)                                   | 切换会话模式 |

**响应** (`SetSessionConfigOptionResponse`):

```json
{
  "configOptions": [ ... ]
}
```

---

### 12. `session/set_mode` — 设置会话模式

**方向**: Client → Agent

**请求参数** (`SetSessionModeRequest`):

| 字段        | 类型     | 必填 | 说明    |
| ----------- | -------- | ---- | ------- |
| `sessionId` | `string` | ✅   | 会话 ID |
| `modeId`    | `string` | ✅   | 模式 ID |

**响应** (`SetSessionModeResponse`): `{}`

---

### 13. `session/set_model` — 设置会话模型 (Unstable)

**方向**: Client → Agent

**请求参数** (`SetSessionModelRequest`):

| 字段        | 类型     | 必填 | 说明                                      |
| ----------- | -------- | ---- | ----------------------------------------- |
| `sessionId` | `string` | ✅   | 会话 ID                                   |
| `modelId`   | `string` | ✅   | 模型 ID，格式: `"{providerID}/{modelID}"` |

**响应** (`SetSessionModelResponse`): `{}`

---

## 通知 (Agent → Client)

Agent 通过 `session/update` 通知向客户端推送实时更新。所有通知的 `method` 为 `"session/update"`。

### sessionUpdate 类型

#### `agent_message_chunk` — Agent 消息文本块

```json
{
  "sessionId": "string",
  "update": {
    "sessionUpdate": "agent_message_chunk",
    "messageId": "string",
    "content": {
      "type": "text",
      "text": "string"
    }
  }
}
```

#### `agent_thought_chunk` — Agent 思考过程块

```json
{
  "sessionId": "string",
  "update": {
    "sessionUpdate": "agent_thought_chunk",
    "messageId": "string",
    "content": {
      "type": "text",
      "text": "string"
    }
  }
}
```

#### `user_message_chunk` — 用户消息块 (重放时)

```json
{
  "sessionId": "string",
  "update": {
    "sessionUpdate": "user_message_chunk",
    "messageId": "string",
    "content": { "type": "text", "text": "string" }
  }
}
```

#### `tool_call` — 工具调用开始

```json
{
  "sessionId": "string",
  "update": {
    "sessionUpdate": "tool_call",
    "toolCallId": "string",
    "title": "string",
    "kind": "execute | edit | read | search | fetch | think | other",
    "status": "pending",
    "locations": [],
    "rawInput": {}
  }
}
```

#### `tool_call_update` — 工具调用状态更新

**运行中**:

```json
{
  "sessionUpdate": "tool_call_update",
  "toolCallId": "string",
  "status": "in_progress",
  "kind": "execute",
  "title": "bash",
  "locations": [],
  "rawInput": { "command": "ls" },
  "content": [{ "type": "content", "content": { "type": "text", "text": "..." } }]
}
```

**完成**:

```json
{
  "sessionUpdate": "tool_call_update",
  "toolCallId": "string",
  "status": "completed",
  "kind": "edit",
  "title": "edit",
  "content": [
    { "type": "content", "content": { "type": "text", "text": "..." } },
    { "type": "diff", "path": "/path/to/file", "oldText": "...", "newText": "..." }
  ],
  "rawInput": { ... },
  "rawOutput": { "output": "...", "metadata": { ... } }
}
```

**失败**:

```json
{
  "sessionUpdate": "tool_call_update",
  "toolCallId": "string",
  "status": "failed",
  "kind": "execute",
  "title": "bash",
  "rawInput": { ... },
  "content": [{ "type": "content", "content": { "type": "text", "text": "error message" } }],
  "rawOutput": { "error": "error message" }
}
```

#### `usage_update` — 用量更新

```json
{
  "sessionId": "string",
  "update": {
    "sessionUpdate": "usage_update",
    "used": 1500,
    "size": 128000,
    "cost": { "amount": 0.05, "currency": "USD" }
  }
}
```

#### `available_commands_update` — 可用命令更新

```json
{
  "sessionId": "string",
  "update": {
    "sessionUpdate": "available_commands_update",
    "availableCommands": [{ "name": "compact", "description": "Summarize the conversation" }]
  }
}
```

---

## 权限请求 (Agent → Client)

Agent 通过 `requestPermission` 请求向客户端请求工具执行权限。

**请求** (`RequestPermissionRequest`):

```json
{
  "sessionId": "string",
  "toolCall": {
    "toolCallId": "string",
    "title": "string",
    "kind": "execute | edit | read | search | fetch | think | other",
    "status": "pending",
    "locations": [{ "path": "/path/to/file" }],
    "rawInput": { ... }
  },
  "options": [
    { "optionId": "once", "kind": "allow_once", "name": "Allow once" },
    { "optionId": "always", "kind": "allow_always", "name": "Always allow" },
    { "optionId": "reject", "kind": "reject_once", "name": "Reject" }
  ]
}
```

**响应** (`RequestPermissionResponse`):

```json
{
  "outcome": {
    "outcome": "selected",
    "optionId": "once"
  }
}
```

**编辑权限特殊处理**: 当权限请求对应 `edit` 工具时，Agent 会通过 `writeTextFile` 通知将提议的编辑内容写入客户端:

```json
{
  "sessionId": "string",
  "path": "/path/to/file",
  "content": "new file content after applying diff"
}
```

---

## Tool Kind 映射

| 工具名                                  | Kind      |
| --------------------------------------- | --------- |
| `bash`, `shell`                         | `execute` |
| `webfetch`                              | `fetch`   |
| `edit`, `apply_patch`, `patch`, `write` | `edit`    |
| `grep`, `glob`, `context`, `context7_*` | `search`  |
| `read`                                  | `read`    |
| `task`                                  | `think`   |
| 其他                                    | `other`   |

---

## ConfigOptions 结构

`configOptions` 在 `newSession`、`loadSession`、`resumeSession`、`forkSession`、`setSessionConfigOption` 的响应中返回。

```json
[
  {
    "id": "model",
    "name": "Model",
    "category": "model",
    "type": "select",
    "currentValue": "anthropic/claude-sonnet-4-20250514",
    "options": [
      { "value": "anthropic/claude-sonnet-4-20250514", "name": "Anthropic/Claude Sonnet 4" },
      { "value": "openai/gpt-4o", "name": "OpenAI/GPT-4o" }
    ]
  },
  {
    "id": "effort",
    "name": "Effort",
    "category": "thought_level",
    "type": "select",
    "currentValue": "default",
    "options": [
      { "value": "low", "name": "Low" },
      { "value": "default", "name": "Default" },
      { "value": "high", "name": "High" }
    ]
  },
  {
    "id": "mode",
    "name": "Session Mode",
    "category": "mode",
    "type": "select",
    "currentValue": "build",
    "options": [
      { "value": "build", "name": "build", "description": "Primary build mode" },
      { "value": "plan", "name": "plan", "description": "Planning mode" }
    ]
  }
]
```

---

## 错误类型

所有错误通过 JSON-RPC error response 返回:

| 错误标签                       | JSON-RPC Code    | 说明               |
| ------------------------------ | ---------------- | ------------------ |
| `ACPSessionNotFoundError`      | Invalid Params   | 会话不存在         |
| `ACPInvalidConfigOptionError`  | Invalid Params   | 未知的配置选项 ID  |
| `ACPInvalidModelError`         | Invalid Params   | 模型不存在         |
| `ACPInvalidEffortError`        | Invalid Params   | 推理强度不存在     |
| `ACPInvalidModeError`          | Invalid Params   | 模式不存在         |
| `ACPAuthRequiredError`         | Auth Required    | 需要 Provider 认证 |
| `ACPUnknownAuthMethodError`    | Invalid Params   | 未知的认证方法     |
| `ACPUnsupportedOperationError` | Method Not Found | 不支持的操作       |
| `ACPServiceFailureError`       | Internal Error   | 内部服务错误       |

---

## 典型交互流程

```
Client                              Agent
  |                                   |
  |--- initialize ------------------>|
  |<-- InitializeResponse -----------|
  |                                   |
  |--- authenticate ---------------->|  (可选，需要认证时)
  |<-- AuthenticateResponse ---------|
  |                                   |
  |--- session/new ----------------->|
  |<-- NewSessionResponse -----------|
  |                                   |
  |--- session/prompt -------------->|
  |<-- session/update (chunks) ------|  (多次)
  |<-- session/update (tool_call) ---|  (工具调用)
  |--- requestPermission ----------->|  (Agent 向 Client 请求权限)
  |<-- permission response ----------|
  |<-- session/update (tool_update)-|  (工具结果)
  |<-- session/update (usage) ------|  (用量)
  |<-- PromptResponse --------------|
  |                                   |
  |--- cancel ---------------------->|  (可选，中止)
  |                                   |
  |--- session/close --------------->|
  |<-- CloseSessionResponse ---------|
```

---

## 编辑器配置示例

### Zed

```json
{
  "agent_servers": {
    "OpenCode": {
      "command": "opencode",
      "args": ["acp"]
    }
  }
}
```

### JetBrains

```json
{
  "agent_servers": {
    "OpenCode": {
      "command": "/absolute/path/bin/opencode",
      "args": ["acp"]
    }
  }
}
```

### Neovim (Avante.nvim)

```lua
{
  acp_providers = {
    ["opencode"] = {
      command = "opencode",
      args = { "acp" }
    }
  }
}
```
