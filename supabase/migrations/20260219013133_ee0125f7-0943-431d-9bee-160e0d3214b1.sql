
-- Add parent_agent_id for sub-agent hierarchy
ALTER TABLE public.agents ADD COLUMN parent_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL;

-- Add index for parent lookup
CREATE INDEX idx_agents_parent_agent_id ON public.agents(parent_agent_id);

-- Add index for branch lookup
CREATE INDEX idx_agents_branch_id ON public.agents(branch_id);
