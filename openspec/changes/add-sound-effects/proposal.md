## Why

当前贪吃蛇游戏只有视觉反馈，缺少声音提示，导致吃到食物、碰撞、开局/结束这些关键时刻反馈不够明确。增加基础音效可以提升操作反馈和游戏沉浸感，且实现范围小、收益高。

## What Changes

- 为游戏增加基础事件音效：开始、吃到食物、碰撞、游戏结束。
- 使用浏览器原生 Web Audio API 生成轻量音效，避免引入额外音频文件和依赖。
- 增加一个集中式音效控制器，负责初始化、播放与静音开关。
- 在 `App` 的游戏状态流转中接入音效触发，确保事件与声音一一对应。
- 增加针对音效映射和触发流程的单元测试。

## Capabilities

### New Capabilities
- `game-sound-effects`: 提供蛇游戏核心事件的基础音效反馈与可控播放行为。

### Modified Capabilities
- None.

## Impact

- Affected code: `src/App.jsx`, 新增 `src/soundEffects.js`，新增或修改测试文件。
- APIs: 使用浏览器 `AudioContext` / `OscillatorNode` / `GainNode`。
- Dependencies: 无新增第三方依赖。
- UX: 增强关键游戏事件反馈，默认启用音效。
