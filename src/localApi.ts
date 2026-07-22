import type {
  ApiUser,
  BotRecord,
  CampaignRecord,
  CampaignSendResult,
  ContentFolderRecord,
  ContentItemRecord,
  ContentPoolOverview,
  CreateBotPayload,
  CreateCampaignPayload,
  CreateFlowPayload,
  DuplicateGroupRecord,
  FlowRecord,
  TelegramOverview,
  TelegramTestResult,
} from './api'

const LOCAL_STATE_KEY = 'fora_local_api_state_v3'

type LocalSubscription = {
  id: string
  subscriber_uid: string
  user_id: string
  bot_id: string
  started_at: string
  status: string
}

type LocalEvent = {
  id: string
  user_id: string
  bot_id: string
  action_type: string
  command: string | null
  created_at: string
}

type LocalNotification = {
  id: string
  user_id: string
  post_id: string
  status: string
  sent_at: string | null
}

type LocalContentItem = ContentItemRecord & {
  duplicate_group_key?: string | null
}

type LocalDuplicateGroup = DuplicateGroupRecord & {
  group_key?: string
}

type LocalState = {
  bots: BotRecord[]
  users: ApiUser[]
  subscriptions: LocalSubscription[]
  events: LocalEvent[]
  flows: FlowRecord[]
  campaigns: CampaignRecord[]
  notifications: LocalNotification[]
  folders: ContentFolderRecord[]
  items: LocalContentItem[]
  duplicate_groups: LocalDuplicateGroup[]
}

const nowIso = () => new Date().toISOString()

const makeId = (prefix: string) => {
  const randomPart =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(16).slice(2, 14).padEnd(12, '0')
  return `${prefix}_${randomPart}`
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const normalizeTitle = (value: string) =>
  value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^a-z0-9\s]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const similarityScore = (left: string, right: string) => {
  if (!left || !right) return 0
  if (left === right) return 96
  const leftWords = new Set(left.split(' ').filter(Boolean))
  const rightWords = new Set(right.split(' ').filter(Boolean))
  const shared = [...leftWords].filter((word) => rightWords.has(word)).length
  const total = new Set([...leftWords, ...rightWords]).size || 1
  return Math.round((shared / total) * 100)
}

const createSeedState = (): LocalState => {
  const createdAt = nowIso()
  const bots: BotRecord[] = [
    {
      id: 'bot_sponsor',
      name: 'FORAGRAMM Sponsor Bot',
      username: '@foragrammsponsorbot',
      category: 'Sports / Casino',
      status: 'online',
      is_active: true,
      created_at: createdAt,
      webhook_path: '/api/telegram/webhook/bot_sponsor',
    },
    {
      id: 'bot_bonus',
      name: 'FORAGRAMM Bonus Bot',
      username: '@foragrammbonusbot',
      category: 'Bonus',
      status: 'online',
      is_active: true,
      created_at: createdAt,
      webhook_path: '/api/telegram/webhook/bot_bonus',
    },
    {
      id: 'bot_vip',
      name: 'FORAGRAMM VIP Bot',
      username: '@foragrammvipbot',
      category: 'VIP',
      status: 'paused',
      is_active: false,
      created_at: createdAt,
      webhook_path: '/api/telegram/webhook/bot_vip',
    },
  ]

  const flows: FlowRecord[] = [
    {
      id: 'flow_welcome',
      bot_id: 'bot_sponsor',
      bot_name: 'FORAGRAMM Sponsor Bot',
      name: 'Yeni Uye Karsilama Akisi',
      status: 'published',
      nodes: [
        { id: 'trigger', type: 'trigger', label: '/start' },
        { id: 'welcome', type: 'message', label: 'Hos geldin' },
        { id: 'keyboard', type: 'inline_keyboard', label: 'Secenekler' },
      ],
      edges: [
        { id: 'edge_1', source: 'trigger', target: 'welcome' },
        { id: 'edge_2', source: 'welcome', target: 'keyboard' },
      ],
      created_at: createdAt,
      updated_at: createdAt,
    },
  ]

  return {
    bots,
    users: [],
    subscriptions: [],
    events: [],
    flows,
    campaigns: [
      {
        id: 'campaign_daily',
        bot_id: 'bot_sponsor',
        bot_name: 'FORAGRAMM Sponsor Bot',
        flow_id: 'flow_welcome',
        flow_name: 'Yeni Uye Karsilama Akisi',
        name: 'Gunluk Sponsor Duyurusu',
        audience: 'all active Telegram users',
        mode: 'test',
        status: 'draft',
        title: 'Gunluk Sponsor Duyurusu',
        message: 'Bugune ozel sponsor kampanyasi aktif.',
        buttons: [{ label: 'Kampanyaya git', type: 'url', value: 'https://foragramm.io/kampanya' }],
        filters: { work_hours: '09:00-18:00', weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'] },
        scheduled_at: null,
        sent_count: 0,
        clicked_count: 0,
        completed_count: 0,
        last_sent_at: null,
        created_at: createdAt,
      },
    ],
    notifications: [],
    folders: [
      { id: 'folder_damabet', name: 'Damabet', channel: '@damabetresmi', total_posts: 0, today_posts: 0, duplicates: 0, last_received_at: null },
      { id: 'folder_betoffice', name: 'Betoffice', channel: '@betofficevip', total_posts: 0, today_posts: 0, duplicates: 0, last_received_at: null },
      { id: 'folder_maxwin', name: 'Maxwin', channel: '@maxwinbonus', total_posts: 0, today_posts: 0, duplicates: 0, last_received_at: null },
    ],
    items: [],
    duplicate_groups: [],
  }
}

const saveState = (state: LocalState) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(state))
}

const loadState = () => {
  if (typeof window === 'undefined') return createSeedState()
  const raw = window.localStorage.getItem(LOCAL_STATE_KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as LocalState
    } catch {
      window.localStorage.removeItem(LOCAL_STATE_KEY)
    }
  }
  const state = createSeedState()
  saveState(state)
  return state
}

const readBody = <T>(init?: RequestInit): T => {
  if (typeof init?.body !== 'string' || !init.body) return {} as T
  return JSON.parse(init.body) as T
}

const botName = (state: LocalState, botId: string | null | undefined) =>
  state.bots.find((bot) => bot.id === botId)?.name ?? null

const flowName = (state: LocalState, flowId: string | null | undefined) =>
  state.flows.find((flow) => flow.id === flowId)?.name ?? null

const overview = (state: LocalState): TelegramOverview => ({
  connected_bots: state.bots.length,
  active_campaigns: state.campaigns.filter((campaign) => ['draft', 'scheduled', 'running'].includes(campaign.status)).length,
  queued_notifications: state.notifications.filter((notification) => notification.status === 'queued').length,
  views: 184200 + state.events.length * 18,
  clicks: 28640 + state.notifications.length,
  joins: 6210 + state.users.length,
  deposits: 842 + state.campaigns.filter((campaign) => campaign.status === 'sent').length,
  users: state.users.length,
  subscriptions: state.subscriptions.length,
  events: state.events.length,
})

const schema = {
  users: ['id', 'fora_user_id', 'telegram_id', 'username', 'first_name', 'language', 'joined_at', 'first_seen_bot_id', 'last_seen_at'],
  bots: ['id', 'name', 'username', 'category', 'status'],
  subscriptions: ['id', 'subscriber_uid', 'user_id', 'bot_id', 'started_at', 'expires_at', 'status', 'last_action_at'],
  telegram_action_events: ['id', 'user_id', 'bot_id', 'subscription_id', 'telegram_update_id', 'action_type', 'command', 'payload', 'created_at'],
  posts: ['id', 'bot_id', 'title', 'content', 'image', 'created_at'],
  notifications: ['id', 'user_id', 'post_id', 'sent_at', 'status'],
  analytics: ['id', 'bot_id', 'views', 'clicks', 'joins', 'deposits', 'created_at'],
  flows: ['id', 'bot_id', 'name', 'status', 'created_at', 'updated_at'],
  nodes: ['id', 'flow_id', 'type', 'label', 'payload'],
  edges: ['id', 'flow_id', 'source_node_id', 'target_node_id', 'condition'],
  campaigns: ['id', 'bot_id', 'flow_id', 'name', 'audience', 'mode', 'status', 'title', 'message', 'buttons', 'filters', 'scheduled_at', 'sent_count', 'clicked_count', 'completed_count'],
}

const contentOverview = (state: LocalState): ContentPoolOverview => {
  const today = new Date().toISOString().slice(0, 10)
  const items = state.items
  const folders = state.folders.map((folder) => {
    const folderItems = items.filter((item) => item.folder === folder.name)
    const lastItem = [...folderItems].sort((left, right) => String(right.received_at).localeCompare(String(left.received_at)))[0]
    return {
      ...folder,
      total_posts: folderItems.length,
      today_posts: folderItems.filter((item) => item.received_at?.startsWith(today)).length,
      duplicates: folderItems.filter((item) => item.status === 'duplicate').length,
      last_received_at: lastItem?.received_at ?? null,
    }
  })
  const todayItems = items.filter((item) => item.received_at?.startsWith(today))
  return {
    folders,
    items: [...todayItems].sort((left, right) => String(right.received_at).localeCompare(String(left.received_at))).slice(0, 50),
    duplicate_groups: state.duplicate_groups.slice(0, 20),
    today: {
      incoming: todayItems.length,
      stored: todayItems.filter((item) => item.status === 'stored' || item.status === 'duplicate').length,
      excluded_links: todayItems.filter((item) => item.excluded_reason === 'link_only').length,
      excluded_stickers: todayItems.filter((item) => item.excluded_reason === 'sticker').length,
      duplicate_groups: state.duplicate_groups.length,
    },
  }
}

const ingestContentItem = (state: LocalState, folder: ContentFolderRecord, payload: Partial<ContentItemRecord>) => {
  const receivedAt = nowIso()
  const title = payload.title || payload.content?.slice(0, 80) || 'Untitled'
  const content = payload.content || title
  const mediaType = payload.media_type || 'text'
  const normalized = normalizeTitle(title)
  const linkOnly = /^\s*https?:\/\/\S+\s*$/.test(content)
  const excluded = linkOnly || mediaType === 'sticker' || !normalized
  let status: ContentItemRecord['status'] = excluded ? 'excluded' : 'stored'
  const excludedReason = linkOnly ? 'link_only' : mediaType === 'sticker' ? 'sticker' : !normalized ? 'empty' : null
  let duplicateGroupKey: string | null = null
  let score = 0

  if (!excluded) {
    const today = receivedAt.slice(0, 10)
    const sameDayItems = state.items.filter(
      (item) => item.folder === folder.name && item.received_at?.startsWith(today) && ['stored', 'duplicate'].includes(item.status),
    )
    const duplicateSource = sameDayItems
      .map((item) => ({ item, score: similarityScore(normalized, normalizeTitle(item.title)) }))
      .find((candidate) => candidate.score >= 80)
    if (duplicateSource) {
      status = 'duplicate'
      duplicateGroupKey = duplicateSource.item.duplicate_group_key || normalizeTitle(duplicateSource.item.title)
      duplicateSource.item.duplicate_group_key = duplicateGroupKey
      duplicateSource.item.status = 'duplicate'
      score = duplicateSource.score
      const group = state.duplicate_groups.find((entry) => entry.group_key === duplicateGroupKey && entry.folder === folder.name)
      if (group) {
        group.item_count += 1
        group.similarity_score = Math.max(group.similarity_score, score)
        group.detected_at = receivedAt
      } else {
        state.duplicate_groups.unshift({
          id: makeId('dupe'),
          folder: folder.name,
          title: duplicateSource.item.title,
          item_count: 2,
          similarity_score: score,
          detected_at: receivedAt,
          group_key: duplicateGroupKey,
        })
      }
    }
  }

  const item: LocalContentItem = {
    id: makeId('item'),
    folder: folder.name,
    title,
    content,
    media_type: mediaType,
    status,
    excluded_reason: excludedReason,
    similarity_score: score,
    received_at: receivedAt,
    duplicate_group_key: duplicateGroupKey,
  }
  state.items.unshift(item)
  return item
}

export async function localApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase()
  const state = loadState()
  const cleanPath = path.replace(/^\/api/, '')

  if (method === 'GET' && cleanPath === '/health') {
    return clone({ status: 'ok', service: 'fora-cmp-local-api', database: 'browser-local-storage' }) as T
  }

  if (method === 'GET' && cleanPath === '/dashboard') {
    const info = overview(state)
    return clone({
      connected_bots: info.connected_bots,
      active_users: info.users,
      active_conversations: info.subscriptions,
      daily_messages: info.events,
      completed_flows: info.joins,
      average_conversation_seconds: 168,
      campaigns: state.campaigns.length,
      queued_notifications: info.queued_notifications,
      views: info.views,
      clicks: info.clicks,
      joins: info.joins,
      deposits: info.deposits,
    }) as T
  }

  if (method === 'GET' && cleanPath === '/bots') return clone(state.bots) as T

  if (method === 'POST' && cleanPath === '/bots') {
    const payload = readBody<CreateBotPayload>(init)
    const username = payload.username?.startsWith('@') ? payload.username : `@${payload.username || 'foragramm_bot'}`
    const bot: BotRecord = {
      id: makeId('bot'),
      name: payload.name || 'FORAGRAMM Bot',
      username,
      category: payload.category || 'Sponsor',
      status: 'online',
      is_active: true,
      created_at: nowIso(),
      webhook_path: `/api/telegram/webhook/${makeId('webhook')}`,
    }
    state.bots.unshift(bot)
    saveState(state)
    return clone(bot) as T
  }

  if (method === 'GET' && cleanPath === '/users') return clone(state.users) as T

  if (method === 'GET' && cleanPath === '/telegram/overview') return clone(overview(state)) as T

  if (method === 'GET' && cleanPath === '/telegram/schema') return clone(schema) as T

  if (method === 'GET' && cleanPath === '/flows') return clone(state.flows) as T

  if (method === 'POST' && cleanPath === '/flows') {
    const payload = readBody<CreateFlowPayload>(init)
    const bot = state.bots.find((entry) => entry.id === payload.bot_id) || state.bots[0]
    const createdAt = nowIso()
    const flow: FlowRecord = {
      id: makeId('flow'),
      bot_id: bot?.id ?? 'bot_local',
      bot_name: bot?.name ?? 'FORAGRAMM Local Bot',
      name: payload.name || 'Yeni Telegram Akisi',
      status: payload.status || 'draft',
      nodes: payload.nodes,
      edges: payload.edges,
      created_at: createdAt,
      updated_at: createdAt,
    }
    state.flows.unshift(flow)
    saveState(state)
    return clone(flow) as T
  }

  const publishMatch = cleanPath.match(/^\/flows\/([^/]+)\/publish$/)
  if (method === 'POST' && publishMatch) {
    const flow = state.flows.find((entry) => entry.id === publishMatch[1])
    if (!flow) throw new Error('flow not found')
    flow.status = 'published'
    flow.updated_at = nowIso()
    saveState(state)
    return clone(flow) as T
  }

  if (method === 'GET' && cleanPath === '/campaigns') return clone(state.campaigns) as T

  if (method === 'POST' && cleanPath === '/campaigns') {
    const payload = readBody<CreateCampaignPayload>(init)
    const bot = state.bots.find((entry) => entry.id === payload.bot_id) || state.bots[0]
    const flow = state.flows.find((entry) => entry.id === payload.flow_id) || state.flows[0]
    const campaign: CampaignRecord = {
      id: makeId('campaign'),
      bot_id: bot?.id ?? null,
      bot_name: botName(state, bot?.id),
      flow_id: flow?.id ?? null,
      flow_name: flowName(state, flow?.id),
      name: payload.name || payload.title || 'FORAGRAMM Kampanya',
      audience: payload.audience || 'all',
      mode: payload.mode || 'test',
      status: 'draft',
      title: payload.title || payload.name || 'FORAGRAMM Kampanya',
      message: payload.message || '',
      buttons: payload.buttons || [],
      filters: payload.filters || {},
      scheduled_at: null,
      sent_count: 0,
      clicked_count: 0,
      completed_count: 0,
      last_sent_at: null,
      created_at: nowIso(),
    }
    state.campaigns.unshift(campaign)
    saveState(state)
    return clone(campaign) as T
  }

  const sendCampaignMatch = cleanPath.match(/^\/campaigns\/([^/]+)\/send$/)
  if (method === 'POST' && sendCampaignMatch) {
    const campaign = state.campaigns.find((entry) => entry.id === sendCampaignMatch[1])
    if (!campaign) throw new Error('campaign not found')
    const postId = makeId('post')
    const notifications = state.users.map((user) => ({
      id: makeId('notification'),
      user_id: user.id,
      post_id: postId,
      status: 'queued',
      sent_at: null,
    }))
    state.notifications.unshift(...notifications)
    campaign.status = state.users.length > 0 ? 'sent' : 'ready'
    campaign.sent_count = state.users.length
    campaign.clicked_count = Math.floor(state.users.length * 0.28)
    campaign.completed_count = Math.floor(state.users.length * 0.11)
    campaign.last_sent_at = nowIso()
    saveState(state)
    return clone({ status: campaign.status, queued_notifications: notifications.length, campaign } satisfies CampaignSendResult) as T
  }

  const testUpdateMatch = cleanPath.match(/^\/telegram\/test-update\/([^/]+)$/)
  if (method === 'POST' && testUpdateMatch) {
    const bot = state.bots.find((entry) => entry.id === testUpdateMatch[1])
    if (!bot) throw new Error('bot not found')
    const payload = readBody<{ telegram_id?: number; username?: string; first_name?: string; language?: string }>(init)
    const telegramId = String(payload.telegram_id || Math.floor(900000000 + Math.random() * 999999))
    let user = state.users.find((entry) => entry.telegram_id === telegramId)
    if (!user) {
      const sequence = String(state.users.length + 1).padStart(6, '0')
      user = {
        id: makeId('user'),
        fora_user_id: `FGM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${sequence}`,
        telegram_id: telegramId,
        username: payload.username || `fora_test_${Math.floor(Math.random() * 9999)}`,
        first_name: payload.first_name || 'FORA Test',
        last_name: null,
        language: payload.language || 'tr',
        joined_at: nowIso(),
        last_seen_at: nowIso(),
        subscriptions: 0,
        events: 0,
      }
      state.users.unshift(user)
    }
    let subscription = state.subscriptions.find((entry) => entry.user_id === user.id && entry.bot_id === bot.id)
    if (!subscription) {
      subscription = {
        id: makeId('subscription'),
        subscriber_uid: `SUB-${Math.random().toString(16).slice(2, 14).toUpperCase()}`,
        user_id: user.id,
        bot_id: bot.id,
        started_at: nowIso(),
        status: 'active',
      }
      state.subscriptions.unshift(subscription)
      user.subscriptions += 1
    }
    const event: LocalEvent = {
      id: makeId('event'),
      user_id: user.id,
      bot_id: bot.id,
      action_type: 'start_command',
      command: '/start',
      created_at: nowIso(),
    }
    user.events += 1
    user.last_seen_at = nowIso()
    state.events.unshift(event)
    saveState(state)
    return clone({
      status: 'accepted',
      action_type: event.action_type,
      subscriber_uid: subscription.subscriber_uid,
      event_id: event.id,
      user,
    } satisfies TelegramTestResult) as T
  }

  if (method === 'GET' && cleanPath === '/content-pool/overview') return clone(contentOverview(state)) as T

  if (method === 'POST' && cleanPath === '/content-pool/channels') {
    const index = state.folders.length + 1
    const folder: ContentFolderRecord = {
      id: makeId('folder'),
      name: `Sponsor ${index}`,
      channel: `@sponsor${Math.floor(Math.random() * 9999)}`,
      total_posts: 0,
      today_posts: 0,
      duplicates: 0,
      last_received_at: null,
    }
    state.folders.unshift(folder)
    saveState(state)
    return clone(folder) as T
  }

  if (method === 'POST' && cleanPath === '/content-pool/simulate') {
    const folder = state.folders[0] || createSeedState().folders[0]
    const samples = [
      { title: 'Gunun ozel yatirim bonusu aktif', content: 'Bugune ozel yatirim bonusu aktif.', media_type: 'text' },
      { title: 'Gunun ozel yatirim bonusu aktif', content: 'Bugune ozel yatirim bonusu tekrar aktif.', media_type: 'text' },
      { title: 'https://example.com/bonus', content: 'https://example.com/bonus', media_type: 'text' },
      { title: 'Sticker post', content: '', media_type: 'sticker' },
    ]
    const item = ingestContentItem(state, folder, samples[state.items.length % samples.length])
    saveState(state)
    return clone(item) as T
  }

  const duplicateDeleteMatch = cleanPath.match(/^\/content-pool\/duplicates\/([^/]+)$/)
  if (method === 'DELETE' && duplicateDeleteMatch) {
    const group = state.duplicate_groups.find((entry) => entry.id === duplicateDeleteMatch[1])
    if (!group) throw new Error('duplicate group not found')
    const before = state.items.length
    state.items = state.items.filter(
      (item) => !(item.folder === group.folder && item.status === 'duplicate' && item.duplicate_group_key === group.group_key),
    )
    state.duplicate_groups = state.duplicate_groups.filter((entry) => entry.id !== group.id)
    const deletedItems = before - state.items.length
    saveState(state)
    return clone({ status: 'deleted', deleted_items: deletedItems }) as T
  }

  throw new Error(`Local API route not implemented: ${method} ${path}`)
}
