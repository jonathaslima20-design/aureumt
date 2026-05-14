import { supabase } from './supabase';

export type PlanLimits = {
  max_agents: number | null;
  max_messages_month: number | null;
  max_connections: number | null;
  max_knowledge_bases: number | null;
  plan_name: string;
};

const FALLBACK_FREE: PlanLimits = {
  max_agents: 1,
  max_messages_month: 500,
  max_connections: 1,
  max_knowledge_bases: 1,
  plan_name: 'Free',
};

export async function fetchUserPlanLimits(planId: string | null): Promise<PlanLimits> {
  if (!planId) return FALLBACK_FREE;
  const { data } = await supabase
    .from('plans')
    .select('name, max_agents, max_messages_month, max_connections, max_knowledge_bases')
    .eq('id', planId)
    .maybeSingle();
  if (!data) return FALLBACK_FREE;
  return {
    max_agents: data.max_agents,
    max_messages_month: data.max_messages_month,
    max_connections: data.max_connections,
    max_knowledge_bases: data.max_knowledge_bases,
    plan_name: data.name,
  };
}

export function isWithinLimit(currentCount: number, max: number | null): boolean {
  if (max === null) return true;
  return currentCount < max;
}

export const canCreateAgent = (count: number, max: number | null) => isWithinLimit(count, max);
export const canCreateConnection = (count: number, max: number | null) => isWithinLimit(count, max);
export const canCreateKnowledgeBase = (count: number, max: number | null) => isWithinLimit(count, max);
