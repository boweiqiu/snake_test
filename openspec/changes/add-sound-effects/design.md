## Context

当前游戏主逻辑集中在 `src/App.jsx` 的 `setInterval` 驱动循环中，吃食物、碰撞、复位等事件都已在同一状态机内可识别。项目未引入任何音频资源或音频库，因此最简方案是复用浏览器 Web Audio API，以代码方式生成短促提示音。

## Goals / Non-Goals

**Goals:**
- 为开始、吃食物、碰撞、结束事件提供可感知的短音效。
- 以低耦合方式接入，避免污染核心游戏算法。
- 提供可测试的事件到音效映射逻辑。

**Non-Goals:**
- 不实现复杂背景音乐或多轨混音。
- 不新增音量滑块、音效包下载、持久化配置。
- 不处理跨页面全局音频管理。

## Decisions

1. 新建 `src/soundEffects.js` 作为音效模块，暴露：
- 事件常量（start/eat/collision/gameOver）
- `createSoundEffects()` 工厂（便于测试注入假 `AudioContext`）
- `play(event)` 与 `setMuted(boolean)` 等方法

Rationale: 将音频细节从 `App.jsx` 抽离，降低组件复杂度，并方便单测验证映射。

2. 使用 Web Audio API 合成提示音，而非引入音频文件：
- 每个事件定义频率、时长、波形、包络
- 通过 `OscillatorNode + GainNode` 快速播放

Rationale: 无额外资源管理，提交体积小，跨环境兼容性高。

3. 仅在明确事件节点触发声音：
- 组件挂载后（或首次开始）触发 `start`
- 吃到食物触发 `eat`
- 检测到碰撞时触发 `collision`，若导致失败再触发 `gameOver`

Rationale: 保证音效与玩家感知事件一致，避免重复和噪音。

## Risks / Trade-offs

- [浏览器自动播放策略可能阻止首次播放] → 在首次用户按键时恢复 `AudioContext`，并在失败时静默降级。
- [高频事件导致声音重叠失真] → 每次事件使用短时包络并限制持续时间，确保即使重叠也可接受。
- [测试环境缺少真实 AudioContext] → 使用可注入工厂和 mock 对象测试，不依赖真实浏览器音频实现。
