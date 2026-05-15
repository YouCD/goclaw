import { describe, expect, it } from 'vitest'

import agentCrudSource from '../../hooks/use-agent-crud.ts?raw'
import agentListSource from '../agents/AgentList.tsx?raw'
import sidebarHeaderSource from '../layout/sidebar/SidebarHeader.tsx?raw'
import sidebarTeamsSource from '../layout/sidebar/SidebarTeams.tsx?raw'
import mcpServersSource from '../../hooks/use-mcp-servers.ts?raw'
import mcpListSource from '../mcp/McpServerList.tsx?raw'
import editionCompareSource from '../common/EditionCompareModal.tsx?raw'
import aboutSource from './AboutTab.tsx?raw'
import sidebarFooterSource from '../layout/sidebar/SidebarFooter.tsx?raw'
import sttProviderSource from '../builtin-tools/stt-provider-form.tsx?raw'
import skillListSource from '../skills/SkillList.tsx?raw'
import useSkillsSource from '../../hooks/use-skills.ts?raw'
import toolsEnSource from '../../i18n/locales/en/tools.json?raw'
import toolsViSource from '../../i18n/locales/vi/tools.json?raw'
import toolsZhSource from '../../i18n/locales/zh/tools.json?raw'

describe('desktop edition and channel cleanup guards', () => {
  it('removes visible product quota gates from agent, team, and MCP UI', () => {
    const source = [
      agentCrudSource,
      agentListSource,
      sidebarHeaderSource,
      sidebarTeamsSource,
      mcpServersSource,
      mcpListSource,
      editionCompareSource,
      aboutSource,
      skillListSource,
      useSkillsSource,
    ].join('\n')

    expect(source).not.toMatch(/MAX_AGENTS_LITE|MAX_TEAMS_LITE|MAX_MCP_LITE/)
    expect(source).not.toMatch(/Max 5|Max 1|max \{/)
    expect(source).not.toMatch(/disabled=\{atLimit\}|atLimit/)
  })

  it('removes the visible sidebar Channels shortcut and keeps STT tenant_id', () => {
    expect(sidebarFooterSource).not.toContain("openSettings('channels')")
    expect(sidebarFooterSource).not.toContain('usePendingPairingsCount')
    expect(sttProviderSource).toContain('tenant_id')
  })

  it('keeps visible fallback tool descriptions free of channel marketing copy', () => {
    const source = [toolsEnSource, toolsViSource, toolsZhSource].join('\n')
    expect(source).not.toMatch(/connected channel|all channels|Telegram|Discord|tất cả kênh|kênh đã kết nối|所有渠道|已连接渠道/)
  })
})
