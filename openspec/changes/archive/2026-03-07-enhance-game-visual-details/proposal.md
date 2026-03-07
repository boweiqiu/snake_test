## Why

当前贪吃蛇玩法已可用，但画面反馈较单一，状态变化（吃到食物、护盾消耗、危险碰撞）缺少可视化提示，导致游玩沉浸感和信息可读性不足。需要在不改变核心规则的前提下补充视觉细节，提升可玩性与观感。

## What Changes

- 为 3D 棋盘增加环境细节（边框发光、地面层次、动态背景粒子），提升场景质感。
- 为蛇头、蛇身、食物增加动态表现（脉冲/拖尾/高光），强化移动与目标识别。
- 增加关键事件视觉反馈：吃到食物闪光、护盾触发波纹、碰撞前后状态提示。
- 在 HUD 增加更清晰的状态展示（连击/金币变化提示、护盾高亮状态）。
- 保持现有玩法和经济系统逻辑不变，仅增强画面表现层。

## Capabilities

### New Capabilities
- `game-visual-details`: 定义游戏画面细节增强的表现要求，包括环境细节、实体动效与事件反馈。

### Modified Capabilities
- None.

## Impact

- Affected code: `src/App.jsx`, `src/App.css`
- Tests: 增加或更新与画面状态映射相关的单测（如新增的视觉状态辅助函数）
- Runtime dependencies: 无新增第三方依赖，复用现有 React + @react-three/fiber + three
- Risk: 主要为渲染层改动，需关注移动端性能与帧率
