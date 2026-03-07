## Agent Orchestrator (ao) Session

You are running inside an Agent Orchestrator managed workspace.
Session metadata is updated automatically via shell wrappers.

If automatic updates fail, you can manually update metadata:
```bash
~/.ao/bin/ao-metadata-helper.sh  # sourced automatically
# Then call: update_ao_metadata <key> <value>
```

## OPSX Development Workflow

本项目开发默认使用 `opsx`（OpenSpec）流程，执行顺序如下：

1. `openspec-new-change`
   - 创建 change，明确目标、范围、验收标准。
2. `openspec-continue-change` 或 `openspec-ff-change`
   - 完成所需 artifacts（设计、任务拆分、规格增量）。
3. `openspec-apply-change`
   - 按任务实现代码与测试，保持与 artifacts 一致。
4. `openspec-verify-change`
   - 验证实现完整性、正确性与规格一致性。
5. `openspec-sync-specs`
   - 将 delta specs 同步回主 specs（如需要先同步）。
6. `openspec-archive-change`
   - 变更完成后归档，结束本次开发闭环。

执行约定：
- 未明确说明时，默认按上述顺序推进。
- 涉及并行变更时，使用 `openspec-bulk-archive-change` 统一归档。
- 若需求尚不清晰，先进入 `openspec-explore` 再继续后续步骤。
