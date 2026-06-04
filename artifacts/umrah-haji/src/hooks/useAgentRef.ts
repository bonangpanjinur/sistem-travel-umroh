import { useEffect } from 'react';

const STORAGE_KEY_AGENT = 'vt_agent_ref';
const STORAGE_KEY_BRANCH = 'vt_branch_ref';
const STORAGE_KEY_TS = 'vt_ref_ts';
const REF_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari

export interface AgentRef {
  agentId?: string;
  agentSlug?: string;
  branchId?: string;
  branchSlug?: string;
}

export function saveAgentRef(ref: AgentRef) {
  try {
    if (ref.agentId) localStorage.setItem(STORAGE_KEY_AGENT, JSON.stringify({ id: ref.agentId, slug: ref.agentSlug }));
    if (ref.branchId) localStorage.setItem(STORAGE_KEY_BRANCH, JSON.stringify({ id: ref.branchId, slug: ref.branchSlug }));
    localStorage.setItem(STORAGE_KEY_TS, Date.now().toString());
  } catch (_) {}
}

export function getAgentRef(): AgentRef {
  try {
    const ts = parseInt(localStorage.getItem(STORAGE_KEY_TS) || '0', 10);
    if (Date.now() - ts > REF_TTL_MS) {
      clearAgentRef();
      return {};
    }
    const agentRaw = localStorage.getItem(STORAGE_KEY_AGENT);
    const branchRaw = localStorage.getItem(STORAGE_KEY_BRANCH);
    const agent = agentRaw ? JSON.parse(agentRaw) : null;
    const branch = branchRaw ? JSON.parse(branchRaw) : null;
    return {
      agentId: agent?.id,
      agentSlug: agent?.slug,
      branchId: branch?.id,
      branchSlug: branch?.slug,
    };
  } catch (_) {
    return {};
  }
}

export function clearAgentRef() {
  try {
    localStorage.removeItem(STORAGE_KEY_AGENT);
    localStorage.removeItem(STORAGE_KEY_BRANCH);
    localStorage.removeItem(STORAGE_KEY_TS);
  } catch (_) {}
}

export function buildBookingUrlWithRef(base: string, agentRef: AgentRef): string {
  const url = new URL(base, window.location.origin);
  if (agentRef.agentId) url.searchParams.set('agent_id', agentRef.agentId);
  if (agentRef.branchId) url.searchParams.set('branch_id', agentRef.branchId);
  return url.pathname + url.search;
}

export function useSaveAgentRef(ref: AgentRef) {
  useEffect(() => {
    const hasRef = ref.agentId || ref.branchId;
    if (hasRef) saveAgentRef(ref);
  }, [ref.agentId, ref.branchId]);
}
