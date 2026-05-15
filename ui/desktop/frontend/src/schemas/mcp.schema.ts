import { z } from 'zod'

export const mcpFormSchema = z.object({
  name: z.string().min(1, 'Required'),
  displayName: z.string(),
  transport: z.enum(['stdio', 'sse', 'streamable-http']),
  command: z.string(),
  args: z.string(), // space-separated, split on submit
  url: z.string(),
  headers: z.record(z.string(), z.string()),
  env: z.record(z.string(), z.string()),
  toolPrefix: z.string(),
  timeoutSec: z.number().min(1),
  requireUserCredentials: z.boolean(),
  enabled: z.boolean(),
  scope: z.enum(['global', 'team', 'project']),
  teamId: z.string().optional(),
  projectId: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.scope === 'team' && !data.teamId?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['teamId'], message: 'Team is required' })
  }
  if (data.scope === 'project' && !data.projectId?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['projectId'], message: 'Project is required' })
  }
})

export type MCPFormData = z.infer<typeof mcpFormSchema>
