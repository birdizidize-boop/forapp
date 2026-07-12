const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api'

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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(body || `API request failed: ${response.status}`)
  }
  return response.json() as Promise<T>
}

export const getBots = () => apiFetch<BotRecord[]>('/bots')

export const createBot = (payload: CreateBotPayload) =>
  apiFetch<BotRecord>('/bots', { method: 'POST', body: JSON.stringify(payload) })

export const getUsers = () => apiFetch<ApiUser[]>('/users')

export const getTelegramOverview = () => apiFetch<TelegramOverview>('/telegram/overview')

export const getTelegramSchema = () => apiFetch<Record<string, string[]>>('/telegram/schema')

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
