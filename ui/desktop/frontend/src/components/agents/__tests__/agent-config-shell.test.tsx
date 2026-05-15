import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AgentConfigShell, type AgentConfigSection } from '../agent-config-shell'

const sections: AgentConfigSection[] = [
  { id: 'identity-model', label: 'Identity & Model', description: 'Identity fields', content: <div>Identity panel</div> },
  { id: 'skills-mcp', label: 'Skills & MCP', description: 'Skills and MCP grants', content: <div>Skills panel</div> },
  { id: 'files', label: 'Files', description: 'Context files', content: <div>Files panel</div> },
]

describe('AgentConfigShell', () => {
  it('keeps Skills/MCP and Files reachable from section navigation', () => {
    const onSectionChange = vi.fn()

    render(
      <AgentConfigShell
        sections={sections}
        activeSection="identity-model"
        onSectionChange={onSectionChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /skills & mcp/i }))
    expect(onSectionChange).toHaveBeenCalledWith('skills-mcp')

    fireEvent.click(screen.getByRole('button', { name: /files/i }))
    expect(onSectionChange).toHaveBeenCalledWith('files')
    expect(screen.getByText('Identity panel')).toBeInTheDocument()
  })
})
