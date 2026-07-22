import { localApiFetch } from './localApi'

const API_URL_STORAGE_KEY = 'fora_api_base_url'
const API_RUNTIME_MODE_KEY = 'fora_api_runtime_mode'
const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_URL ?? 'local://browser/api'

const normalizeApiBaseUrl = (value: string) => {
  const trimmed = value.trim().replace(/\/+$/, '')
  if (!trimmed) return normalizeApiBaseUrl(DEFAULT_API_BASE_URL)
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
}

const readStoredApiUrl = () => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(API_URL_STORAGE_KEY)
  } catch {
    return null
  }
}

export const getApiBaseUrl = () => normalizeApiBaseUrl(readStoredApiUrl() ?? DEFAULT_API_BASE_URL)

export const getApiRuntimeMode = () => {
  try {
    return typeof window === 'undefined' ? 'local' : window.localStorage.getItem(API_RUNTIME_MODE_KEY) ?? 'local'
  } catch {
    return 'local'
  }
}

export const setApiBaseUrl = (value: string) => {
  const normalized = normalizeApiBaseUrl(value)
  window.localStorage.setItem(API_URL_STORAGE_KEY, normalized)
  return normalized
}

export type BotRecord = {
  id: string
  name: string
  username: string
  category: string | null
  status: string
  is_active: boolean
  created_at: string | null
  webhook_path: string
}

export type CreateBotPayload = {
  name: string
  username: string
  category: string
  token: string
}

export type ApiUser = {
  id: string
  fora_user_id: string
  telegram_id: string
  username: string | null
  first_name: string | null
  last_name: string | null
  language: string | null
  joined_at: string | null
  last_seen_at: string | null
  subscriptions: number
  events: number
}

export type TelegramOverview = {
  connected_bots: number
  active_campaigns: number
  queued_notifications: number
  views: number
  clicks: number
  joins: number
  deposits: number
  users: number
  subscriptions: number
  events: number
}

export type TelegramTestResult = {
  status: string
  action_type: string
  subscriber_uid: string
  event_id: string
  user: ApiUser
}

export type FlowRecord = {
  id: string
  bot_id: string
  bot_name: string | null
  name: string
  status: string
  nodes?: Array<Record<string, unknown>>
  edges?: Array<Record<string, unknown>>
  created_at: string | null
  updated_at: string | null
}

export type CreateFlowPayload = {
  bot_id?: string
  name: string
  status: string
  nodes: Array<Record<string, unknown>>
  edges: Array<Record<string, unknown>>
}

export type CampaignRecord = {
  id: string
  bot_id: string | null
  bot_name: string | null
  flow_id: string | null
  flow_name: string | null
  name: string
  audience: string
  mode: string
  status: string
  title: string
  message: string
  buttons: Array<Record<string, unknown>>
  filters: Record<string, unknown>
  scheduled_at: string | null
  sent_count: number
  clicked_count: number
  completed_count: number
  last_sent_at: string | null
  created_at: string | null
}

export type CreateCampaignPayload = {
  bot_id?: string
  flow_id?: string
  name: string
  audience: string
  mode: string
  title: string
  message: string
  buttons?: Array<Record<string, unknown>>
  filters?: Record<string, unknown>
}

export type CampaignSendResult = {
  status: string
  queued_notifications: number
  campaign: CampaignRecord
}

export type ContentFolderRecord = {
  id: string
  name: string
  channel: string
  total_posts: number
  today_posts: number
  duplicates: number
  last_received_at: string | null
}

export type ContentItemRecord = {
  id: string
  folder: string
  title: string
  content: string
  media_type: string
  status: string
  excluded_reason: string | null
  similarity_score: number
  received_at: string | null
}

export type DuplicateGroupRecord = {
  id: string
  folder: string
  title: string
  item_count: number
  similarity_score: number
  detected_at: string | null
}

export type ContentPoolOverview = {
  folders: ContentFolderRecord[]
  items: ContentItemRecord[]
  duplicate_groups: DuplicateGroupRecord[]
  today: {
    incoming: number
    stored: number
    excluded_links: number
    excluded_stickers: number
    duplicate_groups: number
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiBaseUrl = getApiBaseUrl()
  if (apiBaseUrl.startsWith('local://')) {
    window.localStorage.setItem(API_RUNTIME_MODE_KEY, 'local')
    return localApiFetch<T>(path, init)
  }
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      ...init,
    })
    if (!response.ok) {
      const body = await response.text()
      throw new Error(body || `API request failed: ${response.status}`)
    }
    window.localStorage.setItem(API_RUNTIME_MODE_KEY, 'remote')
    return response.json() as Promise<T>
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('API request failed')) throw error
    window.localStorage.setItem(API_RUNTIME_MODE_KEY, 'local')
    return localApiFetch<T>(path, init)
  }
}

export const getBots = () => apiFetch<BotRecord[]>('/bots')

export const createBot = (payload: CreateBotPayload) =>
  apiFetch<BotRecord>('/bots', { method: 'POST', body: JSON.stringify(payload) })

export const getUsers = () => apiFetch<ApiUser[]>('/users')

export const getTelegramOverview = () => apiFetch<TelegramOverview>('/telegram/overview')

export const getTelegramSchema = () => apiFetch<Record<string, string[]>>('/telegram/schema')

export const getFlows = () => apiFetch<FlowRecord[]>('/flows')

export const createFlow = (payload: CreateFlowPayload) =>
  apiFetch<FlowRecord>('/flows', { method: 'POST', body: JSON.stringify(payload) })

export const publishFlow = (flowId: string) =>
  apiFetch<FlowRecord>(`/flows/${flowId}/publish`, { method: 'POST' })

export const getCampaigns = () => apiFetch<CampaignRecord[]>('/campaigns')

export const createCampaign = (payload: CreateCampaignPayload) =>
  apiFetch<CampaignRecord>('/campaigns', { method: 'POST', body: JSON.stringify(payload) })

export const sendCampaign = (campaignId: string) =>
  apiFetch<CampaignSendResult>(`/campaigns/${campaignId}/send`, { method: 'POST' })

export const runTelegramTestUpdate = (botId: string) =>
  apiFetch<TelegramTestResult>(`/telegram/test-update/${botId}`, {
    method: 'POST',
    body: JSON.stringify({
      telegram_id: Math.floor(900000000 + Math.random() * 999999),
      username: `fora_test_${Math.floor(Math.random() * 9999)}`,
      first_name: 'FORA Test',
      language: 'tr',
    }),
  })

export const getContentPoolOverview = () => apiFetch<ContentPoolOverview>('/content-pool/overview')

export const createContentChannel = () =>
  apiFetch<ContentFolderRecord>('/content-pool/channels', {
    method: 'POST',
    body: JSON.stringify({
      name: `Sponsor ${Math.floor(Math.random() * 999)}`,
      username: `@sponsor${Math.floor(Math.random() * 9999)}`,
    }),
  })

export const simulateContentPoolItem = () =>
  apiFetch<ContentItemRecord>('/content-pool/simulate', { method: 'POST' })

export const deleteDuplicateGroup = (groupId: string) =>
  apiFetch<{ status: string; deleted_items: number }>(`/content-pool/duplicates/${groupId}`, { method: 'DELETE' })
