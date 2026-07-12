import { useMemo, type ReactNode } from 'react'
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { create } from 'zustand'
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock3,
  ClipboardList,
  Database,
  Fingerprint,
  Filter,
  FileText,
  FolderOpen,
  GitBranch,
  Globe2,
  Headphones,
  Layers3,
  Link2,
  LineChart,
  LockKeyhole,
  Megaphone,
  MessageCircle,
  MessageSquareText,
  MousePointerClick,
  PauseCircle,
  PlayCircle,
  Plus,
  Radio,
  Search,
  Send,
  Settings,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Tags,
  TimerReset,
  Trash2,
  Users,
  Workflow,
  Zap,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as ReLineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import clsx from 'clsx'

const brandLogo = '/foragramm-logo.png'

type View =
  | 'dashboard'
  | 'flows'
  | 'crm'
  | 'chat'
  | 'broadcast'
  | 'bots'
  | 'telegram'
  | 'content_pool'
  | 'analytics'
  | 'logs'
  | 'permissions'

type AppState = {
  view: View
  setView: (view: View) => void
}

type Metric = {
  label: string
  value: string
  change: string
  tone: 'green' | 'cyan' | 'amber' | 'rose'
  icon: typeof Users
}

type UserRecord = {
  name: string
  username: string
  telegramId: string
  tags: string[]
  city: string
  lastFlow: string
  status: 'active' | 'waiting' | 'blocked'
  value: string
}

type Campaign = {
  name: string
  audience: string
  mode: 'Test' | 'Real'
  sent: number
  clicked: number
  completed: number
  status: 'Running' | 'Scheduled' | 'Draft'
}

const useAppStore = create<AppState>((set) => ({
  view: 'dashboard',
  setView: (view) => set({ view }),
}))

const navItems: Array<{ view: View; label: string; icon: typeof Activity }> = [
  { view: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { view: 'flows', label: 'Flow Builder', icon: Workflow },
  { view: 'crm', label: 'User CRM', icon: Users },
  { view: 'chat', label: 'Live Chat', icon: Headphones },
  { view: 'broadcast', label: 'Broadcast', icon: Radio },
  { view: 'bots', label: 'Bot Manager', icon: Bot },
  { view: 'telegram', label: 'Telegram Panel', icon: Send },
  { view: 'content_pool', label: 'İçerik Havuzu', icon: FolderOpen },
  { view: 'analytics', label: 'Analytics', icon: LineChart },
  { view: 'logs', label: 'Event Logs', icon: ClipboardList },
  { view: 'permissions', label: 'Permissions', icon: LockKeyhole },
]

const wait = (ms = 180) => new Promise((resolve) => window.setTimeout(resolve, ms))

const fetchPlatformSnapshot = async () => {
  await wait()
  return {
    metrics: [
      { label: 'Aktif kullanıcı', value: '18,420', change: '+12.4%', tone: 'green', icon: Users },
      { label: 'Aktif sohbet', value: '1,284', change: '+8.1%', tone: 'cyan', icon: MessageCircle },
      { label: 'Günlük mesaj', value: '96,310', change: '+19.7%', tone: 'amber', icon: Send },
      { label: 'Tamamlanan akış', value: '7,842', change: '+5.3%', tone: 'green', icon: CheckCircle2 },
      { label: 'Yarım kalan akış', value: '312', change: '-3.8%', tone: 'rose', icon: PauseCircle },
      { label: 'Ortalama süre', value: '02:48', change: '-11 sn', tone: 'cyan', icon: TimerReset },
    ] satisfies Metric[],
    hourlyMessages: [
      { hour: '00:00', messages: 1600, users: 520 },
      { hour: '03:00', messages: 1180, users: 390 },
      { hour: '06:00', messages: 2480, users: 780 },
      { hour: '09:00', messages: 6200, users: 2180 },
      { hour: '12:00', messages: 8800, users: 3120 },
      { hour: '15:00', messages: 7900, users: 2940 },
      { hour: '18:00', messages: 10200, users: 4010 },
      { hour: '21:00', messages: 6900, users: 2480 },
    ],
    growth: [
      { day: 'Pzt', users: 3400, conversions: 820 },
      { day: 'Sal', users: 4200, conversions: 960 },
      { day: 'Çar', users: 5100, conversions: 1280 },
      { day: 'Per', users: 4800, conversions: 1190 },
      { day: 'Cum', users: 5900, conversions: 1520 },
      { day: 'Cmt', users: 6400, conversions: 1740 },
      { day: 'Paz', users: 6100, conversions: 1680 },
    ],
    lastUsers: [
      { name: 'Elif Kaya', tag: 'VIP', flow: 'Yeni Üye Karşılama', time: '2 dk önce' },
      { name: 'Mert Aksoy', tag: 'Lead', flow: 'Teklif Toplama', time: '6 dk önce' },
      { name: 'Nora Demir', tag: 'Support', flow: 'Canlı Operatör', time: '11 dk önce' },
      { name: 'Arda Yılmaz', tag: 'Trial', flow: 'Demo Talebi', time: '18 dk önce' },
    ],
  }
}

const users: UserRecord[] = [
  {
    name: 'Elif Kaya',
    username: '@elifkaya',
    telegramId: '742819002',
    tags: ['VIP', 'İstanbul'],
    city: 'İstanbul',
    lastFlow: 'Yeni Üye Karşılama',
    status: 'active',
    value: '₺12.840',
  },
  {
    name: 'Mert Aksoy',
    username: '@mertaks',
    telegramId: '118492003',
    tags: ['Lead', 'Demo'],
    city: 'Ankara',
    lastFlow: 'Demo Talebi',
    status: 'waiting',
    value: '₺4.200',
  },
  {
    name: 'Nora Demir',
    username: '@noradmr',
    telegramId: '928377120',
    tags: ['Support', 'Priority'],
    city: 'İzmir',
    lastFlow: 'Canlı Operatör',
    status: 'active',
    value: '₺8.910',
  },
  {
    name: 'Arda Yılmaz',
    username: '@arday',
    telegramId: '553802991',
    tags: ['Trial'],
    city: 'Bursa',
    lastFlow: 'Fiyat Bilgisi',
    status: 'blocked',
    value: '₺0',
  },
  {
    name: 'Selin Uçar',
    username: '@selinucar',
    telegramId: '221883772',
    tags: ['Campaign', 'Clicked'],
    city: 'Antalya',
    lastFlow: 'Yaz Kampanyası',
    status: 'active',
    value: '₺2.760',
  },
]

const campaigns: Campaign[] = [
  {
    name: 'Yaz indirimi segment yayını',
    audience: 'VIP + son 30 gün aktif',
    mode: 'Real',
    sent: 48200,
    clicked: 12640,
    completed: 6820,
    status: 'Running',
  },
  {
    name: 'Demo sonrası takip',
    audience: 'Demo talebi bırakanlar',
    mode: 'Test',
    sent: 820,
    clicked: 291,
    completed: 108,
    status: 'Scheduled',
  },
  {
    name: 'Uyuyan kullanıcı reaktivasyonu',
    audience: '60 gün sessiz kullanıcı',
    mode: 'Real',
    sent: 15300,
    clicked: 2410,
    completed: 990,
    status: 'Draft',
  },
]

const flowNodes: Node[] = [
  {
    id: 'start',
    type: 'fora',
    position: { x: 0, y: 120 },
    data: { label: 'Start', meta: 'Webhook geldi', icon: PlayCircle, tone: 'green' },
  },
  {
    id: 'welcome',
    type: 'fora',
    position: { x: 250, y: 20 },
    data: { label: 'Text Message', meta: 'Merhaba {{firstname}}', icon: MessageSquareText, tone: 'cyan' },
  },
  {
    id: 'keyboard',
    type: 'fora',
    position: { x: 520, y: 20 },
    data: { label: 'Inline Keyboard', meta: 'Demo / Fiyat / Destek', icon: Boxes, tone: 'amber' },
  },
  {
    id: 'condition',
    type: 'fora',
    position: { x: 790, y: 120 },
    data: { label: 'Condition', meta: 'tag == VIP', icon: GitBranch, tone: 'rose' },
  },
  {
    id: 'api',
    type: 'fora',
    position: { x: 520, y: 250 },
    data: { label: 'API Request', meta: 'CRM skorunu çek', icon: Globe2, tone: 'green' },
  },
  {
    id: 'operator',
    type: 'fora',
    position: { x: 1060, y: 60 },
    data: { label: 'Transfer Operator', meta: 'Satış ekibine aktar', icon: Headphones, tone: 'cyan' },
  },
  {
    id: 'finish',
    type: 'fora',
    position: { x: 1060, y: 260 },
    data: { label: 'Finish Flow', meta: 'Tamamlandı eventi', icon: CheckCircle2, tone: 'green' },
  },
]

const flowEdges: Edge[] = [
  { id: 'e1', source: 'start', target: 'welcome', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e2', source: 'welcome', target: 'keyboard', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e3', source: 'keyboard', target: 'condition', label: 'Fiyat', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e4', source: 'keyboard', target: 'api', label: 'Demo', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e5', source: 'api', target: 'condition', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e6', source: 'condition', target: 'operator', label: 'VIP', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e7', source: 'condition', target: 'finish', label: 'Standart', markerEnd: { type: MarkerType.ArrowClosed } },
]

const telegramFlowNodes: Node[] = [
  {
    id: 'tg-start',
    type: 'fora',
    position: { x: 0, y: 120 },
    data: { label: 'Telegram Update', meta: '/start, callback_query, message', icon: Send, tone: 'green' },
  },
  {
    id: 'tg-hours',
    type: 'fora',
    position: { x: 260, y: 20 },
    data: { label: 'Mesai filtresi', meta: '09:00-18:00 / Pzt-Cum', icon: Clock3, tone: 'amber' },
  },
  {
    id: 'tg-menu',
    type: 'fora',
    position: { x: 530, y: 20 },
    data: { label: 'Inline Button Menu', meta: 'URL veya akış hedefi', icon: MousePointerClick, tone: 'cyan' },
  },
  {
    id: 'tg-url',
    type: 'fora',
    position: { x: 820, y: -70 },
    data: { label: 'URL Button', meta: 'https://foragramm.io/kampanya', icon: Link2, tone: 'green' },
  },
  {
    id: 'tg-flow',
    type: 'fora',
    position: { x: 820, y: 120 },
    data: { label: 'Flow Button', meta: 'VIP kayıt akışına gönder', icon: Workflow, tone: 'cyan' },
  },
  {
    id: 'tg-fallback',
    type: 'fora',
    position: { x: 260, y: 260 },
    data: { label: 'Özel yanıt', meta: 'Mesai dışı fallback mesajı', icon: MessageSquareText, tone: 'rose' },
  },
  {
    id: 'tg-campaign',
    type: 'fora',
    position: { x: 1110, y: 20 },
    data: { label: 'Campaign Publish', meta: 'segment + schedule + throttle', icon: Megaphone, tone: 'amber' },
  },
  {
    id: 'tg-analytics',
    type: 'fora',
    position: { x: 1110, y: 250 },
    data: { label: 'Track Analytics', meta: 'views, clicks, joins, deposits', icon: BarChart3, tone: 'green' },
  },
]

const telegramFlowEdges: Edge[] = [
  { id: 'tg-e1', source: 'tg-start', target: 'tg-hours', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'tg-e2', source: 'tg-hours', target: 'tg-menu', label: 'uygun', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'tg-e3', source: 'tg-hours', target: 'tg-fallback', label: 'mesai dışı', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'tg-e4', source: 'tg-menu', target: 'tg-url', label: 'URL', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'tg-e5', source: 'tg-menu', target: 'tg-flow', label: 'Akış', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'tg-e6', source: 'tg-url', target: 'tg-campaign', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'tg-e7', source: 'tg-flow', target: 'tg-campaign', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'tg-e8', source: 'tg-fallback', target: 'tg-analytics', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'tg-e9', source: 'tg-campaign', target: 'tg-analytics', markerEnd: { type: MarkerType.ArrowClosed } },
]

const nodeTypes = { fora: ForaNode }

function App() {
  const view = useAppStore((state) => state.view)

  return (
    <div className="min-h-screen text-emerald-50">
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <Topbar />
          <div className="mx-auto w-full max-w-[1680px] px-4 pb-8 pt-4 sm:px-6 lg:px-8">
            {view === 'dashboard' && <Dashboard />}
            {view === 'flows' && <FlowBuilder />}
            {view === 'crm' && <Crm />}
            {view === 'chat' && <LiveChat />}
            {view === 'broadcast' && <Broadcast />}
            {view === 'bots' && <BotManager />}
            {view === 'telegram' && <TelegramPanel />}
            {view === 'content_pool' && <ContentPool />}
            {view === 'analytics' && <Analytics />}
            {view === 'logs' && <EventLogs />}
            {view === 'permissions' && <Permissions />}
          </div>
        </main>
      </div>
    </div>
  )
}

function Sidebar() {
  const view = useAppStore((state) => state.view)
  const setView = useAppStore((state) => state.setView)

  return (
    <aside className="hidden w-72 shrink-0 border-r border-emerald-400/10 bg-black/30 backdrop-blur-xl lg:block">
      <div className="flex h-full flex-col p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center overflow-hidden rounded-lg border border-emerald-300/30 bg-black">
            <img src={brandLogo} alt="FORAGRAMM" className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-wide">FORAGRAMM</p>
            <p className="text-xs text-emerald-100/55">Conversation Platform</p>
          </div>
        </div>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = view === item.view
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => setView(item.view)}
                className={clsx(
                  'flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition',
                  active
                    ? 'border border-emerald-300/25 bg-emerald-400/15 text-emerald-100 shadow-[0_0_28px_rgba(37,211,102,0.12)]'
                    : 'text-emerald-100/62 hover:bg-white/5 hover:text-emerald-50',
                )}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="mt-auto rounded-lg border border-emerald-400/15 bg-emerald-400/10 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles size={16} className="text-emerald-300" />
            Multi-tenant hazır
          </div>
          <p className="mt-2 text-xs leading-5 text-emerald-50/58">
            Telegram bugün; WhatsApp, Discord ve Instagram DM için aynı akış motoru yarın.
          </p>
        </div>
      </div>
    </aside>
  )
}

function Topbar() {
  const view = useAppStore((state) => state.view)
  const setView = useAppStore((state) => state.setView)
  const title = navItems.find((item) => item.view === view)?.label ?? 'Dashboard'

  return (
    <header className="sticky top-0 z-20 border-b border-emerald-400/10 bg-[#050706]/88 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1680px] flex-wrap items-center gap-3">
        <select
          value={view}
          onChange={(event) => setView(event.target.value as View)}
          className="h-10 rounded-lg border border-emerald-400/15 bg-white/5 px-3 text-sm text-emerald-50 lg:hidden"
          aria-label="Modül seç"
        >
          {navItems.map((item) => (
            <option key={item.view} value={item.view} className="bg-[#07100d]">
              {item.label}
            </option>
          ))}
        </select>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.22em] text-emerald-300/70">FORAGRAMM Control Plane</p>
          <h1 className="truncate text-xl font-semibold text-emerald-50 sm:text-2xl">{title}</h1>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none">
          <label className="hidden h-10 w-72 items-center gap-2 rounded-lg border border-emerald-400/15 bg-white/[0.04] px-3 text-sm text-emerald-50/65 md:flex">
            <Search size={16} />
            <input
              className="min-w-0 flex-1 bg-transparent text-emerald-50 placeholder:text-emerald-50/42 focus:outline-none"
              placeholder="Kullanıcı, flow, kampanya ara"
            />
          </label>
          <IconButton label="Bildirimler" icon={Bell} />
          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-lg border border-emerald-400/15 bg-white/[0.04] px-3 text-sm text-emerald-50"
          >
            <span className="grid size-7 place-items-center overflow-hidden rounded-md bg-black">
              <img src={brandLogo} alt="FORAGRAMM" className="h-full w-full object-cover" />
            </span>
            <span className="hidden sm:inline">FORAGRAMM Admin</span>
            <ChevronDown size={15} />
          </button>
        </div>
      </div>
    </header>
  )
}

function Dashboard() {
  const { data } = useQuery({ queryKey: ['snapshot'], queryFn: fetchPlatformSnapshot })

  if (!data) return <LoadingState />

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {data.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel
          title="Saatlik mesaj ve kullanıcı"
          eyebrow="Realtime"
          action={<StatusPill tone="green" label="WebSocket bağlı" />}
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.hourlyMessages}>
                <defs>
                  <linearGradient id="messages" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#25d366" stopOpacity={0.38} />
                    <stop offset="95%" stopColor="#25d366" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="users" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} />
                <XAxis dataKey="hour" stroke="#8bbda4" tickLine={false} axisLine={false} />
                <YAxis stroke="#8bbda4" tickLine={false} axisLine={false} width={44} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="messages" stroke="#25d366" fill="url(#messages)" strokeWidth={2} />
                <Area type="monotone" dataKey="users" stroke="#38bdf8" fill="url(#users)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Son giriş yapan kullanıcılar" eyebrow="CRM Live">
          <div className="space-y-3">
            {data.lastUsers.map((user) => (
              <div
                key={user.name}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.035] p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-emerald-50/50">{user.flow}</p>
                </div>
                <div className="text-right">
                  <StatusPill tone={user.tag === 'VIP' ? 'green' : 'cyan'} label={user.tag} />
                  <p className="mt-1 text-xs text-emerald-50/45">{user.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <Panel title="Haftalık büyüme" eyebrow="Acquisition">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.growth}>
                <CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} />
                <XAxis dataKey="day" stroke="#8bbda4" tickLine={false} axisLine={false} />
                <YAxis stroke="#8bbda4" tickLine={false} axisLine={false} width={40} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="users" radius={[6, 6, 0, 0]} fill="#25d366" />
                <Bar dataKey="conversions" radius={[6, 6, 0, 0]} fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Son kampanyalar" eyebrow="Broadcast">
          <CampaignList compact />
        </Panel>
        <Panel title="Platform sağlık durumu" eyebrow="Ops">
          <div className="space-y-4">
            {[
              ['Webhook gecikmesi', '42 ms', 86, 'green'],
              ['Redis kuyruk doluluğu', '18%', 18, 'cyan'],
              ['Celery worker yükü', '64%', 64, 'amber'],
              ['Mesaj hata oranı', '0.08%', 8, 'green'],
            ].map(([label, value, progress, tone]) => (
              <HealthRow key={label as string} label={label as string} value={value as string} progress={progress as number} tone={tone as string} />
            ))}
          </div>
        </Panel>
      </section>
    </div>
  )
}

function FlowBuilder() {
  return (
    <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
      <Panel title="Node paleti" eyebrow="Drag modules">
        <div className="space-y-2">
          {[
            ['Text', MessageSquareText],
            ['Image / Video / Audio', Layers3],
            ['Inline Keyboard', Boxes],
            ['Condition / Random', GitBranch],
            ['API Request', Globe2],
            ['SQL Query', Database],
            ['Variable Actions', Tags],
            ['Transfer Operator', Headphones],
            ['Finish Flow', CheckCircle2],
          ].map(([label, Icon]) => (
            <button
              key={label as string}
              type="button"
              className="flex h-11 w-full items-center gap-3 rounded-lg border border-white/8 bg-white/[0.035] px-3 text-left text-sm text-emerald-50/78 hover:border-emerald-300/25 hover:bg-emerald-400/10"
            >
              <Icon size={17} className="text-emerald-300" />
              {label as string}
            </button>
          ))}
        </div>
      </Panel>

      <Panel
        title="Yeni Üye Karşılama Akışı"
        eyebrow="React Flow canvas"
        action={
          <div className="flex items-center gap-2">
            <IconButton label="Undo" icon={PauseCircle} />
            <IconButton label="Publish" icon={PlayCircle} active />
          </div>
        }
      >
        <div className="h-[620px] overflow-hidden rounded-lg border border-emerald-400/15 bg-[#06100c]">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{
              style: { stroke: '#25d366', strokeWidth: 2 },
              labelStyle: { fill: '#dfffee', fontWeight: 600 },
              labelBgStyle: { fill: 'rgba(5,7,6,.86)' },
            }}
          >
            <Background color="rgba(37,211,102,.18)" gap={22} />
            <Controls />
            <MiniMap pannable zoomable nodeColor="#25d366" maskColor="rgba(0,0,0,.48)" />
          </ReactFlow>
        </div>
      </Panel>

      <Panel title="Node ayarları" eyebrow="Selected">
        <div className="space-y-4">
          <Field label="Node tipi" value="Inline Keyboard" />
          <Field label="Beklenen cevap" value="Button / Regex / Serbest mesaj" />
          <Field label="Regex" value="^(demo|fiyat|destek)$" />
          <Field label="Kayıt değişkeni" value="{{last_message}}" />
          <div>
            <p className="mb-2 text-xs text-emerald-50/48">Butonlar</p>
            <div className="grid grid-cols-2 gap-2">
              {['Demo', 'Fiyat', 'Destek', 'Operatör'].map((button) => (
                <button
                  key={button}
                  type="button"
                  className="h-10 rounded-lg border border-emerald-400/15 bg-emerald-400/10 text-sm text-emerald-50"
                >
                  {button}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 font-semibold text-[#042012]"
          >
            <Plus size={17} />
            Node ekle
          </button>
        </div>
      </Panel>
    </div>
  )
}

function Crm() {
  const columns = useMemo<ColumnDef<UserRecord>[]>(
    () => [
      {
        header: 'Kullanıcı',
        accessorKey: 'name',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-emerald-50">{row.original.name}</p>
            <p className="text-xs text-emerald-50/45">
              {row.original.username} · {row.original.telegramId}
            </p>
          </div>
        ),
      },
      {
        header: 'Etiketler',
        accessorKey: 'tags',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.tags.map((tag) => (
              <StatusPill key={tag} tone={tag === 'VIP' ? 'green' : 'cyan'} label={tag} />
            ))}
          </div>
        ),
      },
      { header: 'Şehir', accessorKey: 'city' },
      { header: 'Son akış', accessorKey: 'lastFlow' },
      {
        header: 'Durum',
        accessorKey: 'status',
        cell: ({ row }) => (
          <StatusPill
            tone={row.original.status === 'active' ? 'green' : row.original.status === 'waiting' ? 'amber' : 'rose'}
            label={row.original.status}
          />
        ),
      },
      { header: 'Değer', accessorKey: 'value' },
    ],
    [],
  )
  const table = useReactTable({ data: users, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Panel
        title="Kullanıcı CRM"
        eyebrow="Profiles, tags, variables"
        action={
          <button type="button" className="flex h-10 items-center gap-2 rounded-lg bg-emerald-400 px-3 text-sm font-semibold text-[#042012]">
            <Plus size={16} />
            Kullanıcı ekle
          </button>
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {['Bot', 'Operatör', 'Etiket', 'Son mesaj', 'Bekleme süresi', 'Durum'].map((filter) => (
            <button
              key={filter}
              type="button"
              className="flex h-9 items-center gap-2 rounded-lg border border-white/8 bg-white/[0.035] px-3 text-sm text-emerald-50/70"
            >
              <Filter size={14} />
              {filter}
            </button>
          ))}
        </div>
        <DataTable table={table} />
      </Panel>

      <Panel title="Elif Kaya profili" eyebrow="Timeline">
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-400/15 bg-emerald-400/10 p-4">
            <p className="text-lg font-semibold">Elif Kaya</p>
            <p className="text-sm text-emerald-50/55">@elifkaya · 742819002</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {['VIP', 'İstanbul', 'Campaign', 'Clicked'].map((tag) => (
                <StatusPill key={tag} tone="green" label={tag} />
              ))}
            </div>
          </div>
          {[
            ['Buton tıkladı', 'Yaz indirimi / Satın al'],
            ['Variable güncellendi', '{{campaign}} = summer_26'],
            ['Operatör notu', 'Yarın tekrar aranacak'],
            ['Dosya gönderdi', 'dekont_7428.pdf'],
          ].map(([title, detail]) => (
            <TimelineItem key={title} title={title} detail={detail} />
          ))}
        </div>
      </Panel>
    </div>
  )
}

function LiveChat() {
  return (
    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
      <Panel title="Aktif sohbetler" eyebrow="Queue">
        <div className="space-y-2">
          {users.slice(0, 4).map((user, index) => (
            <button
              key={user.telegramId}
              type="button"
              className={clsx(
                'w-full rounded-lg border p-3 text-left transition',
                index === 0
                  ? 'border-emerald-300/30 bg-emerald-400/12'
                  : 'border-white/8 bg-white/[0.035] hover:border-emerald-300/20',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{user.name}</p>
                <span className="text-xs text-emerald-50/48">03:{index + 2} bekliyor</span>
              </div>
              <p className="mt-1 truncate text-sm text-emerald-50/52">Son mesaj: Demo fiyatını öğrenmek istiyorum.</p>
            </button>
          ))}
        </div>
      </Panel>

      <Panel
        title="Elif Kaya"
        eyebrow="Telegram live session"
        action={
          <div className="flex gap-2">
            <IconButton label="Devral" icon={Headphones} active />
            <IconButton label="Kapat" icon={CheckCircle2} />
          </div>
        }
      >
        <div className="flex h-[620px] flex-col">
          <div className="flex-1 space-y-4 overflow-auto rounded-lg border border-white/8 bg-black/18 p-4">
            <ChatBubble side="left" text="Merhaba, fiyat bilgisini alabilir miyim?" time="14:08" />
            <ChatBubble side="right" text="Tabii Elif Hanım. Hangi paketle ilgileniyorsunuz?" time="14:09" />
            <ChatBubble side="left" text="CRM ve broadcast modülleri olan paket." time="14:10" />
            <ChatBubble side="right" text="Size uygun enterprise teklifi hazırlıyorum. Demo linkini de gönderebilirim." time="14:11" />
            <p className="px-2 text-xs text-emerald-300/70">Elif yazıyor...</p>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className="h-11 min-w-0 flex-1 rounded-lg border border-emerald-400/15 bg-white/[0.045] px-3 text-sm text-emerald-50 placeholder:text-emerald-50/38"
              placeholder="Mesaj yaz veya hazır cevap seç"
            />
            <button type="button" className="grid size-11 place-items-center rounded-lg bg-emerald-400 text-[#042012]" aria-label="Gönder">
              <Send size={18} />
            </button>
          </div>
        </div>
      </Panel>

      <Panel title="Operatör araçları" eyebrow="Context">
        <div className="space-y-4">
          <Field label="Atanan operatör" value="FORAGRAMM Admin" />
          <Field label="Hazır cevap" value="Demo linki + fiyat özeti" />
          <Field label="İç not" value="Enterprise ilgisi yüksek" />
          <div>
            <p className="mb-2 text-xs text-emerald-50/48">Hızlı aksiyon</p>
            <div className="grid gap-2">
              {['Operatör değiştir', 'Sohbeti kapat', 'Etiket ekle', 'Bildirim gönder'].map((action) => (
                <button key={action} type="button" className="h-10 rounded-lg border border-white/8 bg-white/[0.035] text-sm text-emerald-50/72">
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  )
}

function Broadcast() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel
        title="Broadcast kampanyaları"
        eyebrow="Test and real send"
        action={
          <button type="button" className="flex h-10 items-center gap-2 rounded-lg bg-emerald-400 px-3 text-sm font-semibold text-[#042012]">
            <Plus size={16} />
            Kampanya oluştur
          </button>
        }
      >
        <CampaignList />
      </Panel>
      <Panel title="Gönderim kurulumu" eyebrow="Composer">
        <div className="space-y-4">
          <Field label="Gönderim tipi" value="Text + Photo + Inline Keyboard" />
          <Field label="Segment" value="VIP, son 30 gün aktif, İstanbul" />
          <Field label="Planlama" value="15 Temmuz 2026, 10:30" />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="h-11 rounded-lg border border-emerald-400/25 bg-emerald-400/10 text-sm font-medium text-emerald-100">
              Test Broadcast
            </button>
            <button type="button" className="h-11 rounded-lg bg-emerald-400 text-sm font-semibold text-[#042012]">
              Real Broadcast
            </button>
          </div>
        </div>
      </Panel>
    </div>
  )
}

function BotManager() {
  const bots = [
    ['FORAGRAMM Main Bot', '@foragrammainbot', 'Online', 'Yeni Üye Karşılama', '96.3K mesaj'],
    ['FORAGRAMM Support', '@foragramsupportbot', 'Online', 'Canlı Operatör', '21.8K mesaj'],
    ['FORAGRAMM Campaign', '@foragramcampaignbot', 'Paused', 'Yaz Kampanyası', '48.2K mesaj'],
  ]

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      {bots.map(([name, handle, status, flow, volume]) => (
        <Panel key={name} title={name} eyebrow={handle}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <StatusPill tone={status === 'Online' ? 'green' : 'amber'} label={status} />
              <IconButton label="Ayarlar" icon={Settings} />
            </div>
            <Field label="Webhook" value="https://api.foragramm.io/webhook/telegram" />
            <Field label="Aktif akış" value={flow} />
            <Field label="Günlük hacim" value={volume} />
            <div className="grid grid-cols-3 gap-2">
              {['Flow', 'Campaign', 'Operator'].map((item) => (
                <button key={item} type="button" className="h-10 rounded-lg border border-white/8 bg-white/[0.035] text-sm text-emerald-50/72">
                  {item}
                </button>
              ))}
            </div>
          </div>
        </Panel>
      ))}
    </div>
  )
}

function TelegramPanel() {
  const telegramBots = [
    ['FORAGRAMM Sponsor Bot', '@foragrammsponsorbot', 'Sports / Casino', 'Online', '12 akış', '4 kampanya'],
    ['FORAGRAMM Bonus Bot', '@foragrammbonusbot', 'Bonus', 'Online', '8 akış', '2 kampanya'],
    ['FORAGRAMM VIP Bot', '@foragrammvipbot', 'VIP', 'Paused', '5 akış', '1 kampanya'],
  ]

  const schema = [
    ['users', ['id', 'fora_user_id', 'telegram_id', 'username', 'first_name', 'language', 'joined_at']],
    ['bots', ['id', 'name', 'username', 'category', 'status']],
    ['subscriptions', ['id', 'subscriber_uid', 'user_id', 'bot_id', 'started_at', 'expires_at']],
    ['telegram_action_events', ['id', 'user_id', 'bot_id', 'action_type', 'command', 'payload', 'created_at']],
    ['posts', ['id', 'bot_id', 'title', 'content', 'image', 'created_at']],
    ['notifications', ['id', 'user_id', 'post_id', 'sent_at', 'status']],
    ['analytics', ['id', 'bot_id', 'views', 'clicks', 'joins', 'deposits', 'created_at']],
  ]

  const rules = [
    ['Mesai saatleri', '09:00-18:00', 'Mesai dışı yanıt: Şu an çevrim dışıyız.'],
    ['Haftanın günleri', 'Pzt-Cum', 'Hafta sonu özel kampanya akışı'],
    ['Dil filtresi', 'tr / en / ru', 'Yanıt metni otomatik seçilir'],
    ['Abonelik durumu', 'Aktif / süresi dolmuş', 'Yenileme akışına yönlendir'],
  ]

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_420px]">
        <div className="relative min-h-[280px] overflow-hidden rounded-lg border border-emerald-400/15 bg-black">
          <img
            src={brandLogo}
            alt="FORAGRAMM"
            className="absolute inset-0 h-full w-full object-contain p-8 opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/45 to-black/20" />
          <div className="relative flex min-h-[280px] max-w-2xl flex-col justify-end p-5 sm:p-7">
            <p className="text-xs uppercase tracking-[0.24em] text-lime-300">Telegram Only Control</p>
            <h2 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">FORAGRAMM Telegram Bot Panel</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MiniStat label="Bağlı bot" value="3" />
              <MiniStat label="Aktif kampanya" value="7" />
              <MiniStat label="Bugün deposit" value="842" />
            </div>
          </div>
        </div>

        <Panel title="Bot bağlantısı" eyebrow="Telegram API">
          <div className="space-y-4">
            <Field label="Bot token" value="7841***:AAH***_masked" />
            <Field label="Webhook" value="https://api.foragramm.io/telegram/webhook" />
            <Field label="BotFather username" value="@foragrammsponsorbot" />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="h-11 rounded-lg border border-emerald-400/25 bg-emerald-400/10 text-sm font-medium text-emerald-100">
                Test et
              </button>
              <button type="button" className="h-11 rounded-lg bg-emerald-400 text-sm font-semibold text-[#042012]">
                Bağla
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Ping" value="38 ms" />
              <MiniStat label="Queue" value="214" />
              <MiniStat label="Fail" value="0.06%" />
            </div>
            <div className="rounded-lg border border-lime-300/15 bg-lime-300/10 p-3 text-xs leading-5 text-emerald-50/64">
              Widget loader, chat aside ve analytics scriptleri ayrı health sinyalleri olarak izlenir; gerçek yayına sadece token + webhook testi geçerse izin verilir.
            </div>
          </div>
        </Panel>
      </section>

      <section className="tg-constructor-shell rounded-lg border border-emerald-400/12 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-emerald-400 text-[#042012]">
              <Workflow size={18} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">FORAGRAMM Telegram Constructor</p>
              <p className="truncate text-xs text-emerald-50/48">Akış düzenleme, önizleme, segment ve yayın araçları aynı çalışma alanında.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Önizle', 'Geri al', 'Test gönder', 'Publish'].map((action, index) => (
              <button
                key={action}
                type="button"
                className={clsx(
                  'h-9 rounded-lg border px-3 text-sm',
                  index === 3
                    ? 'border-emerald-300/25 bg-emerald-400 font-semibold text-[#042012]'
                    : 'border-white/8 bg-white/[0.045] text-emerald-50/72',
                )}
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Panel title="Abone kimliklendirme" eyebrow="/start and action identity">
          <div className="space-y-4">
            <div className="rounded-lg border border-lime-300/15 bg-lime-300/10 p-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-lime-300 text-[#092011]">
                  <Fingerprint size={19} />
                </div>
                <div>
                  <p className="font-semibold">FORAGRAMM ID üretimi</p>
                  <p className="text-sm text-emerald-50/55">Örnek: FGM-20260712-00018420</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-5 text-emerald-50/58">
                Kullanıcı hangi bot üzerinden gelirse gelsin `telegram_id` önce aranır; yoksa yeni `fora_user_id` oluşturulur. Aynı kullanıcı ikinci botta görünürse aynı ana kimliğe bağlanır.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Tekil kimlik" value="18.420" />
              <MiniStat label="Bot aboneliği" value="27.944" />
            </div>
          </div>
        </Panel>

        <Panel title="Aksiyon yakalama" eyebrow="Telegram update router">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              ['/start', 'Kullanıcıyı oluştur veya eşleştir, subscription başlat.'],
              ['callback_query', 'Buton tıklamasını kullanıcı ve bot kimliğiyle kaydet.'],
              ['message', 'Serbest mesajı conversation event olarak bağla.'],
              ['campaign_click', 'Kampanya etkileşimini analytics ve kullanıcı timelineına yaz.'],
            ].map(([action, detail]) => (
              <div key={action} className="rounded-lg border border-white/8 bg-white/[0.035] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-lime-300" />
                  <p className="font-mono text-sm font-semibold">{action}</p>
                </div>
                <p className="text-sm leading-5 text-emerald-50/52">{detail}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
        <Panel title="Telegram node paleti" eyebrow="Flow blocks">
          <div className="space-y-2">
            {[
              ['Mesaj', MessageSquareText],
              ['Inline buton', MousePointerClick],
              ['URL butonu', Link2],
              ['Akış butonu', Workflow],
              ['Mesai filtresi', Clock3],
              ['Gün filtresi', CalendarDays],
              ['Özel fallback', GitBranch],
              ['Kampanya yayınla', Megaphone],
            ].map(([label, Icon]) => (
              <button
                key={label as string}
                type="button"
                className="flex h-11 w-full items-center gap-3 rounded-lg border border-white/8 bg-white/[0.035] px-3 text-left text-sm text-emerald-50/78 hover:border-emerald-300/25 hover:bg-emerald-400/10"
              >
                <Icon size={17} className="text-lime-300" />
                {label as string}
              </button>
            ))}
          </div>
        </Panel>

        <Panel
          title="Sponsor kampanya akışı"
          eyebrow="Drag and connect"
          action={
            <div className="flex gap-2">
              <IconButton label="Kaydet" icon={CheckCircle2} />
              <IconButton label="Yayınla" icon={PlayCircle} active />
            </div>
          }
        >
          <div className="h-[620px] overflow-hidden rounded-lg border border-emerald-400/15 bg-[#06100c]">
            <ReactFlow
              nodes={telegramFlowNodes}
              edges={telegramFlowEdges}
              nodeTypes={nodeTypes}
              fitView
              proOptions={{ hideAttribution: true }}
              defaultEdgeOptions={{
                style: { stroke: '#a3e635', strokeWidth: 2 },
                labelStyle: { fill: '#f7fee7', fontWeight: 600 },
                labelBgStyle: { fill: 'rgba(5,7,6,.86)' },
              }}
            >
              <Background color="rgba(163,230,53,.18)" gap={22} />
              <Controls />
              <MiniMap pannable zoomable nodeColor="#a3e635" maskColor="rgba(0,0,0,.48)" />
            </ReactFlow>
          </div>
        </Panel>

        <Panel title="Buton ve filtre ayarı" eyebrow="Selected node">
          <div className="space-y-4">
            <Field label="Buton etiketi" value="Bonusları Gör" />
            <Field label="Hedef tipi" value="URL veya mevcut akış" />
            <Field label="URL hedefi" value="https://foragramm.io/bonus" />
            <Field label="Akış hedefi" value="VIP Deposit Flow" />
            <div>
              <p className="mb-2 text-xs text-emerald-50/48">Aktif filtreler</p>
              <div className="flex flex-wrap gap-2">
                {['Mesai 09-18', 'Pzt-Cum', 'TR dil', 'VIP segment'].map((filter) => (
                  <StatusPill key={filter} tone="green" label={filter} />
                ))}
              </div>
            </div>
            <Field label="Filtre dışı yanıt" value="Şu an uygun kampanya yok. En yakın fırsatı sana bildireceğiz." />
            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 font-semibold text-[#042012]"
            >
              <Plus size={17} />
              Kural ekle
            </button>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)_360px]">
        <Panel title="Telegram önizleme" eyebrow="Message preview">
          <TelegramPreview />
        </Panel>

        <Panel title="Referans desenleri" eyebrow="Used patterns">
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ['Searchable select', 'Segment ve bot seçimi için kompakt, aramalı seçim paterni.'],
              ['Flow side panel', 'Node seçilince sağ ayar paneli açılır ve canvas yerinde kalır.'],
              ['Inline button rows', 'Telegram butonları URL, akış ve callback hedefleriyle ayrışır.'],
              ['Preview-first publish', 'Yayından önce telefon önizlemesi, test gönderimi ve health check.'],
            ].map(([title, detail]) => (
              <div key={title} className="rounded-lg border border-white/8 bg-white/[0.035] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-lime-300" />
                  <p className="font-medium">{title}</p>
                </div>
                <p className="text-sm leading-5 text-emerald-50/54">{detail}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Loader ve izleme" eyebrow="Runtime health">
          <div className="space-y-3">
            {[
              ['Widget loader', 'Loaded', 'green'],
              ['Flow bundle', 'Version pinned', 'cyan'],
              ['Clarity / analytics', 'Masked fields active', 'amber'],
              ['Aside chat', 'Collapsed on canvas', 'green'],
            ].map(([label, value, tone]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.035] p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{label}</p>
                  <p className="truncate text-xs text-emerald-50/45">{value}</p>
                </div>
                <StatusPill tone={tone} label="ok" />
              </div>
            ))}
            <div className="tg-flow-loading relative h-2 overflow-hidden rounded-full bg-white/8" />
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel title="Telegram botları" eyebrow="Settings and flows">
          <div className="grid gap-3 lg:grid-cols-3">
            {telegramBots.map(([name, username, category, status, flows, campaigns]) => (
              <div key={name} className="rounded-lg border border-white/8 bg-white/[0.035] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{name}</p>
                    <p className="text-sm text-emerald-50/50">{username}</p>
                  </div>
                  <StatusPill tone={status === 'Online' ? 'green' : 'amber'} label={status} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <MiniStat label="Kategori" value={category} />
                  <MiniStat label="Akış" value={flows} />
                  <MiniStat label="Kampanya" value={campaigns} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Yayın kuyruğu" eyebrow="Campaigns">
          <div className="space-y-3">
            {[
              ['Hafta içi sponsor yayını', 'Pzt-Cum 10:30', '42.800 hedef'],
              ['Mesai dışı fallback', 'Her gün 18:01', '12.400 hedef'],
              ['VIP deposit reminder', 'Pazar 20:00', '3.120 hedef'],
            ].map(([title, schedule, audience]) => (
              <div key={title} className="rounded-lg border border-white/8 bg-white/[0.035] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{title}</p>
                  <StatusPill tone="cyan" label="scheduled" />
                </div>
                <p className="mt-2 text-sm text-emerald-50/52">{schedule} · {audience}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Panel title="Filtre kuralları" eyebrow="Routing">
          <div className="space-y-3">
            {rules.map(([name, condition, fallback]) => (
              <div key={name} className="rounded-lg border border-white/8 bg-white/[0.035] p-4">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-lime-300" />
                  <p className="font-medium">{name}</p>
                </div>
                <p className="mt-2 text-sm text-emerald-50/60">{condition}</p>
                <p className="mt-1 text-sm text-emerald-50/42">{fallback}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Veri modeli" eyebrow="Telegram tables">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {schema.map(([table, fields]) => (
              <div key={table as string} className="rounded-lg border border-white/8 bg-white/[0.035] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Database size={16} className="text-emerald-300" />
                  <p className="font-mono text-sm font-semibold text-emerald-100">{table as string}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(fields as string[]).map((field) => (
                    <span key={field} className="rounded-md border border-emerald-400/12 bg-black/18 px-2 py-1 font-mono text-xs text-emerald-50/62">
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  )
}

function TelegramPreview() {
  return (
    <div className="mx-auto max-w-[310px] rounded-[28px] border border-emerald-300/20 bg-[#050706] p-3 shadow-[0_24px_80px_rgba(0,0,0,.36)]">
      <div className="overflow-hidden rounded-[22px] border border-white/8 bg-[#121b20]">
        <div className="flex items-center gap-3 bg-[#172c37] px-4 py-3">
          <div className="grid size-9 place-items-center overflow-hidden rounded-full bg-black">
            <img src={brandLogo} alt="FORAGRAMM" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">FORAGRAMM Sponsor Bot</p>
            <p className="text-xs text-emerald-50/45">online · Telegram</p>
          </div>
          <CircleDot size={16} className="text-lime-300" />
        </div>
        <div className="space-y-3 bg-[radial-gradient(circle_at_top_left,rgba(37,211,102,.12),transparent_42%),#0c1519] p-4">
          <div className="tg-message-in max-w-[92%] rounded-2xl rounded-bl-md bg-white/10 px-3 py-2 text-sm text-emerald-50/86">
            Merhaba {'{{first_name}}'}, bugün için aktif sponsor fırsatları hazır.
          </div>
          <div className="tg-message-in relative ml-auto max-w-[90%] rounded-2xl rounded-br-md border border-emerald-300/18 bg-emerald-400/18 px-3 py-2 text-sm text-emerald-50 tg-message-tail">
            Mesai filtresi uygun. Kampanya butonlarını gösterebilirim.
          </div>
          <div className="tg-message-in space-y-2">
            {[
              ['Bonusları Gör', 'URL'],
              ['VIP Akışına Git', 'FLOW'],
              ['Operatöre Bağlan', 'CALLBACK'],
            ].map(([label, type]) => (
              <button
                key={label}
                type="button"
                className="flex h-9 w-full items-center justify-between rounded-xl border border-sky-300/24 bg-sky-400/10 px-3 text-sm text-sky-100"
              >
                <span>{label}</span>
                <span className="font-mono text-[10px] text-sky-100/55">{type}</span>
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-amber-300/15 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100/76">
            Filtre dışı yanıt: Şu an kampanya kapalı, en yakın uygun zamanda tekrar bildirilecek.
          </div>
        </div>
      </div>
    </div>
  )
}

function ContentPool() {
  const sponsorFolders = [
    ['Damabet', '@damabetresmi', 42, 8, 3, 'Bugün 14:20'],
    ['Betoffice', '@betofficevip', 28, 4, 1, 'Bugün 13:58'],
    ['Maxwin', '@maxwinbonus', 31, 6, 2, 'Bugün 12:46'],
    ['Royalbet', '@royalbetduyuru', 17, 2, 0, 'Dün 22:10'],
  ]

  const incomingPosts = [
    ['Damabet', 'Günün özel yatırım bonusu aktif', 'Metin + görsel', '12:04', 'temiz'],
    ['Damabet', 'Gunun ozel yatirim bonusu aktif', 'Benzer başlık', '12:09', 'benzer'],
    ['Damabet', 'VIP kullanıcılar için çevrimsiz fırsat', 'Metin', '13:18', 'temiz'],
    ['Betoffice', 'Hafta sonu kayıp bonusu duyurusu', 'Metin + görsel', '10:44', 'temiz'],
    ['Maxwin', 'Telegram özel freespin kampanyası', 'Metin + link', '11:20', 'hariç'],
    ['Royalbet', 'Yeni turnuva duyurusu', 'Sticker', '11:51', 'hariç'],
  ]

  const duplicateGroups = [
    ['Damabet', 'Günün özel yatırım bonusu aktif', '4 benzer mesaj', '92% benzerlik'],
    ['Maxwin', 'Telegram özel freespin kampanyası', '3 benzer mesaj', '88% benzerlik'],
    ['Betoffice', 'Hafta sonu kayıp bonusu duyurusu', '2 benzer mesaj', '81% benzerlik'],
  ]

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel
          title="İçerik Havuzu"
          eyebrow="Sponsor channel intake"
          action={
            <button type="button" className="flex h-10 items-center gap-2 rounded-lg bg-emerald-400 px-3 text-sm font-semibold text-[#042012]">
              <Plus size={16} />
              Kanal bağla
            </button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {sponsorFolders.map(([name, channel, total, today, duplicates, last]) => (
              <div key={name as string} className="rounded-lg border border-emerald-400/12 bg-white/[0.035] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid size-11 place-items-center rounded-lg border border-lime-300/20 bg-lime-300/10 text-lime-200">
                    <FolderOpen size={20} />
                  </div>
                  <StatusPill tone={duplicates === 0 ? 'green' : 'amber'} label={`${duplicates} benzer`} />
                </div>
                <p className="mt-4 text-lg font-semibold">{name}</p>
                <p className="text-sm text-emerald-50/48">{channel}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <MiniStat label="Toplam post" value={`${total}`} />
                  <MiniStat label="Bugün gelen" value={`${today}`} />
                </div>
                <p className="mt-3 text-xs text-emerald-50/40">Son ekleme: {last}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Toplama kuralları" eyebrow="Noise control">
          <div className="space-y-3">
            {[
              ['Klasörleme', 'Kanal adı sponsor klasörü olur: Damabet -> Damabet klasörü.', FolderOpen, 'green'],
              ['Link hariç', 'Sadece linkten oluşan veya link ağırlıklı postlar havuza alınmaz.', ShieldX, 'rose'],
              ['Çıkartma hariç', 'Sticker, emoji-only ve çıkartma mesajları otomatik dışarıda kalır.', ShieldX, 'rose'],
              ['Benzerlik filtresi', 'Aynı gün benzer başlık ve mesajlar tek grupta toplanır.', Filter, 'amber'],
            ].map(([title, detail, Icon, tone]) => (
              <div key={title as string} className="flex gap-3 rounded-lg border border-white/8 bg-white/[0.035] p-3">
                <div className={clsx('grid size-9 shrink-0 place-items-center rounded-lg', toneClass(tone as string, 'soft'))}>
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{title as string}</p>
                  <p className="mt-1 text-xs leading-5 text-emerald-50/52">{detail as string}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel
          title="Bugün gelen içerikler"
          eyebrow="Links and stickers excluded"
          action={
            <div className="flex gap-2">
              <button type="button" className="flex h-10 items-center gap-2 rounded-lg border border-white/8 bg-white/[0.045] px-3 text-sm text-emerald-50/72">
                <Filter size={15} />
                Benzerleri göster
              </button>
              <button type="button" className="flex h-10 items-center gap-2 rounded-lg border border-rose-300/20 bg-rose-400/10 px-3 text-sm text-rose-100">
                <Trash2 size={15} />
                Seçilenleri sil
              </button>
            </div>
          }
        >
          <div className="overflow-hidden rounded-lg border border-white/8">
            <div className="grid gap-3 bg-white/[0.045] px-4 py-3 text-xs uppercase tracking-[0.14em] text-emerald-50/46 md:grid-cols-[150px_1fr_150px_90px_100px]">
              <span>Klasör</span>
              <span>Başlık</span>
              <span>Tip</span>
              <span>Saat</span>
              <span>Durum</span>
            </div>
            {incomingPosts.map(([folder, title, type, time, status], index) => (
              <div
                key={`${folder}-${title}-${time}`}
                className={clsx(
                  'grid gap-3 px-4 py-3 text-sm md:grid-cols-[150px_1fr_150px_90px_100px]',
                  index !== incomingPosts.length - 1 && 'border-b border-white/8',
                )}
              >
                <span className="flex items-center gap-2 font-medium text-emerald-50">
                  <FolderOpen size={15} className="text-lime-300" />
                  {folder}
                </span>
                <span className="min-w-0 truncate text-emerald-50/78">{title}</span>
                <span className="text-emerald-50/52">{type}</span>
                <span className="font-mono text-emerald-300">{time}</span>
                <StatusPill
                  tone={status === 'temiz' ? 'green' : status === 'benzer' ? 'amber' : 'rose'}
                  label={status}
                />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Günlük özet" eyebrow="Dedup actions">
          <div className="grid grid-cols-2 gap-3">
            <BigNumber label="Bugün gelen" value="20" icon={FileText} />
            <BigNumber label="Havuza giren" value="14" icon={FolderOpen} />
            <BigNumber label="Link hariç" value="4" icon={ShieldX} />
            <BigNumber label="Sticker hariç" value="2" icon={ShieldX} />
          </div>
          <div className="mt-4 rounded-lg border border-amber-300/15 bg-amber-300/10 p-4">
            <p className="font-medium text-amber-100">Benzer mesaj kontrolü</p>
            <p className="mt-2 text-sm leading-5 text-amber-100/68">
              Aynı sponsor klasöründe, aynı gün içinde başlık normalize edilir; küçük yazım farkı, emoji farkı ve tekrar eden bonus metinleri tek grupta gösterilir.
            </p>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Panel title="Benzer başlık grupları" eyebrow="Review before delete">
          <div className="space-y-3">
            {duplicateGroups.map(([folder, title, count, score]) => (
              <div key={`${folder}-${title}`} className="rounded-lg border border-white/8 bg-white/[0.035] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{title}</p>
                    <p className="mt-1 text-sm text-emerald-50/50">{folder} · {count}</p>
                  </div>
                  <StatusPill tone="amber" label={score} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" className="h-10 rounded-lg border border-white/8 bg-white/[0.035] text-sm text-emerald-50/72">
                    İncele
                  </button>
                  <button type="button" className="h-10 rounded-lg border border-rose-300/20 bg-rose-400/10 text-sm text-rose-100">
                    Tekrarları sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="İçerik işleme akışı" eyebrow="Pipeline">
          <div className="grid gap-3 md:grid-cols-5">
            {[
              ['Kanal dinle', 'Sponsor Telegram kanalları izlenir.'],
              ['Tip ayıkla', 'Link ve sticker mesajları ayrılır.'],
              ['Klasöre ekle', 'Post sponsor adıyla klasörlenir.'],
              ['Benzerlik bul', 'Başlık ve metin normalize edilir.'],
              ['Temizle', 'Seçili tekrarlar silinir.'],
            ].map(([title, detail], index) => (
              <div key={title} className="rounded-lg border border-emerald-400/12 bg-white/[0.035] p-4">
                <div className="mb-3 grid size-8 place-items-center rounded-lg bg-emerald-400 text-sm font-bold text-[#042012]">
                  {index + 1}
                </div>
                <p className="font-medium">{title}</p>
                <p className="mt-2 text-sm leading-5 text-emerald-50/50">{detail}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  )
}

function Analytics() {
  const heatmap = [
    { name: 'Start', value: 100 },
    { name: 'Text', value: 82 },
    { name: 'Keyboard', value: 68 },
    { name: 'API', value: 44 },
    { name: 'Operator', value: 27 },
  ]

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <Panel title="Node başarı oranı" eyebrow="Flow analytics">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ReLineChart data={heatmap}>
              <CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} />
              <XAxis dataKey="name" stroke="#8bbda4" tickLine={false} axisLine={false} />
              <YAxis stroke="#8bbda4" tickLine={false} axisLine={false} width={38} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="value" stroke="#25d366" strokeWidth={3} dot={{ fill: '#25d366' }} />
            </ReLineChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <Panel title="En çok kullanılan cevaplar" eyebrow="Intent signals">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={heatmap} dataKey="value" nameKey="name" outerRadius={112} innerRadius={62} paddingAngle={4}>
                {heatmap.map((entry, index) => (
                  <Cell key={entry.name} fill={['#25d366', '#38bdf8', '#f59e0b', '#fb7185', '#a78bfa'][index]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <Panel title="Conversion Rate" eyebrow="Campaign to flow">
        <div className="grid gap-3 sm:grid-cols-3">
          <BigNumber label="Cevap veren" value="31.4%" icon={MessageCircle} />
          <BigNumber label="Buton tıklayan" value="26.2%" icon={CircleDot} />
          <BigNumber label="Akışı bitiren" value="14.1%" icon={CheckCircle2} />
        </div>
      </Panel>
      <Panel title="Flow heatmap" eyebrow="Drop-off">
        <div className="space-y-3">
          {heatmap.map((node, index) => (
            <HealthRow
              key={node.name}
              label={`${index + 1}. ${node.name}`}
              value={`${node.value}%`}
              progress={node.value}
              tone={index < 2 ? 'green' : index < 4 ? 'amber' : 'rose'}
            />
          ))}
        </div>
      </Panel>
    </div>
  )
}

function EventLogs() {
  const logs = [
    ['14:22:10', 'Button clicked', '@elifkaya', 'Yaz kampanyası / Satın al'],
    ['14:21:44', 'API called', 'FORAGRAMM Main Bot', 'crm-score/v2'],
    ['14:20:09', 'Node changed', '@mertaks', 'Text Message -> Inline Keyboard'],
    ['14:18:31', 'SQL executed', 'Operator: FORAGRAMM Admin', 'user_segments.active_30d'],
    ['14:16:02', 'Webhook received', '@foragrammainbot', 'message.photo'],
    ['14:12:54', 'Operator joined', '@noradmr', 'Canlı destek'],
  ]

  return (
    <Panel title="Event Logs" eyebrow="Audit stream">
      <div className="overflow-hidden rounded-lg border border-white/8">
        {logs.map(([time, event, actor, detail], index) => (
          <div
            key={`${time}-${event}`}
            className={clsx(
              'grid gap-3 px-4 py-3 text-sm md:grid-cols-[100px_180px_180px_1fr]',
              index !== logs.length - 1 && 'border-b border-white/8',
            )}
          >
            <span className="font-mono text-emerald-300">{time}</span>
            <span>{event}</span>
            <span className="text-emerald-50/56">{actor}</span>
            <span className="text-emerald-50/72">{detail}</span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function Permissions() {
  const roles = ['Super Admin', 'Admin', 'Operator', 'Moderator', 'Analyst', 'Viewer']
  const modules = ['Dashboard', 'Flow Builder', 'CRM', 'Live Chat', 'Broadcast', 'Analytics', 'Settings']

  return (
    <Panel title="Rol ve izin matrisi" eyebrow="RBAC">
      <div className="overflow-auto rounded-lg border border-white/8">
        <table className="min-w-[840px] w-full border-collapse text-sm">
          <thead className="bg-white/[0.045] text-left text-emerald-50/60">
            <tr>
              <th className="px-4 py-3 font-medium">Rol</th>
              {modules.map((module) => (
                <th key={module} className="px-4 py-3 font-medium">{module}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map((role, roleIndex) => (
              <tr key={role} className="border-t border-white/8">
                <td className="px-4 py-3 font-medium text-emerald-50">{role}</td>
                {modules.map((module, moduleIndex) => {
                  const allowed =
                    roleIndex < 2 ||
                    (role === 'Operator' && ['CRM', 'Live Chat'].includes(module)) ||
                    (role === 'Analyst' && ['Dashboard', 'Analytics'].includes(module)) ||
                    (role === 'Viewer' && moduleIndex < 1)
                  return (
                    <td key={module} className="px-4 py-3">
                      <span
                        className={clsx(
                          'inline-flex size-7 items-center justify-center rounded-lg border',
                          allowed
                            ? 'border-emerald-300/25 bg-emerald-400/15 text-emerald-200'
                            : 'border-white/8 bg-white/[0.025] text-emerald-50/24',
                        )}
                      >
                        <ShieldCheck size={15} />
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function ForaNode({ data }: NodeProps) {
  const { label, meta, icon: Icon, tone } = data as {
    label: string
    meta: string
    icon: typeof MessageSquareText
    tone: 'green' | 'cyan' | 'amber' | 'rose'
  }

  return (
    <div className="w-56 p-3">
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-3">
        <div className={clsx('grid size-9 place-items-center rounded-lg', toneClass(tone, 'soft'))}>
          <Icon size={17} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{label}</p>
          <p className="truncate text-xs text-emerald-50/48">{meta}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon
  return (
    <div className="rounded-lg border border-emerald-400/12 bg-white/[0.045] p-4 shadow-[0_18px_60px_rgba(0,0,0,.18)] backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <div className={clsx('grid size-10 place-items-center rounded-lg', toneClass(metric.tone, 'soft'))}>
          <Icon size={18} />
        </div>
        <StatusPill tone={metric.tone} label={metric.change} />
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight">{metric.value}</p>
      <p className="mt-1 text-sm text-emerald-50/52">{metric.label}</p>
    </div>
  )
}

function Panel({
  title,
  eyebrow,
  action,
  children,
}: {
  title: string
  eyebrow?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-lg border border-emerald-400/12 bg-white/[0.045] p-4 shadow-[0_18px_70px_rgba(0,0,0,.20)] backdrop-blur-xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/58">{eyebrow}</p>}
          <h2 className="truncate text-lg font-semibold text-emerald-50">{title}</h2>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  )
}

function StatusPill({ label, tone }: { label: string; tone: 'green' | 'cyan' | 'amber' | 'rose' | string }) {
  return (
    <span className={clsx('inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium', toneClass(tone, 'pill'))}>
      {label}
    </span>
  )
}

function IconButton({ label, icon: Icon, active = false }: { label: string; icon: typeof Bell; active?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={clsx(
        'grid size-10 place-items-center rounded-lg border transition',
        active
          ? 'border-emerald-300/25 bg-emerald-400 text-[#042012]'
          : 'border-emerald-400/15 bg-white/[0.04] text-emerald-50/72 hover:bg-white/[0.07]',
      )}
    >
      <Icon size={18} />
    </button>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs text-emerald-50/48">{label}</span>
      <input
        readOnly
        value={value}
        className="h-10 w-full rounded-lg border border-emerald-400/15 bg-white/[0.045] px-3 text-sm text-emerald-50"
      />
    </label>
  )
}

function HealthRow({
  label,
  value,
  progress,
  tone,
}: {
  label: string
  value: string
  progress: number
  tone: string
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-emerald-50/72">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/8">
        <div className={clsx('h-full rounded-full', toneClass(tone, 'bar'))} style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

function BigNumber({ label, value, icon: Icon }: { label: string; value: string; icon: typeof MessageCircle }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.035] p-4">
      <Icon size={19} className="text-emerald-300" />
      <p className="mt-4 text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-emerald-50/52">{label}</p>
    </div>
  )
}

function CampaignList({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-3">
      {campaigns.map((campaign) => (
        <div key={campaign.name} className="rounded-lg border border-white/8 bg-white/[0.035] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium">{campaign.name}</p>
              <p className="mt-1 text-sm text-emerald-50/50">{campaign.audience}</p>
            </div>
            <div className="flex gap-2">
              <StatusPill tone={campaign.mode === 'Real' ? 'green' : 'cyan'} label={campaign.mode} />
              <StatusPill tone={campaign.status === 'Running' ? 'green' : campaign.status === 'Scheduled' ? 'amber' : 'rose'} label={campaign.status} />
            </div>
          </div>
          {!compact && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniStat label="Gönderildi" value={campaign.sent.toLocaleString('tr-TR')} />
              <MiniStat label="Buton tıklayan" value={campaign.clicked.toLocaleString('tr-TR')} />
              <MiniStat label="Tamamlayan" value={campaign.completed.toLocaleString('tr-TR')} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/16 p-3">
      <p className="text-xs text-emerald-50/45">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  )
}

function DataTable<T>({ table }: { table: ReturnType<typeof useReactTable<T>> }) {
  return (
    <div className="overflow-auto rounded-lg border border-white/8">
      <table className="min-w-[900px] w-full border-collapse text-sm">
        <thead className="bg-white/[0.045] text-left text-emerald-50/60">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-4 py-3 font-medium">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-t border-white/8">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 text-emerald-50/72">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TimelineItem({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 grid size-8 shrink-0 place-items-center rounded-lg border border-emerald-400/20 bg-emerald-400/10">
        <Zap size={14} className="text-emerald-300" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="truncate text-sm text-emerald-50/50">{detail}</p>
      </div>
    </div>
  )
}

function ChatBubble({ side, text, time }: { side: 'left' | 'right'; text: string; time: string }) {
  return (
    <div className={clsx('flex', side === 'right' ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'max-w-[78%] rounded-lg border px-4 py-3 text-sm',
          side === 'right'
            ? 'border-emerald-300/25 bg-emerald-400/15 text-emerald-50'
            : 'border-white/8 bg-white/[0.055] text-emerald-50/82',
        )}
      >
        <p>{text}</p>
        <p className="mt-1 text-right text-xs text-emerald-50/42">{time}</p>
      </div>
    </div>
  )
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-emerald-400/15 bg-[#07100d]/95 p-3 text-sm shadow-xl">
      <p className="mb-2 font-medium text-emerald-50">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="text-emerald-50/72">
          <span style={{ color: item.color }}>●</span> {item.name}: {item.value.toLocaleString('tr-TR')}
        </p>
      ))}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="grid min-h-[420px] place-items-center rounded-lg border border-emerald-400/12 bg-white/[0.045]">
      <div className="flex items-center gap-3 text-emerald-50/70">
        <Activity className="animate-pulse text-emerald-300" size={20} />
        Platform verileri yükleniyor
      </div>
    </div>
  )
}

function toneClass(tone: string, target: 'soft' | 'pill' | 'bar') {
  const map = {
    green: {
      soft: 'bg-emerald-400/15 text-emerald-200 border border-emerald-300/20',
      pill: 'bg-emerald-400/12 text-emerald-200 border-emerald-300/20',
      bar: 'bg-emerald-400',
    },
    cyan: {
      soft: 'bg-cyan-400/12 text-cyan-200 border border-cyan-300/20',
      pill: 'bg-cyan-400/12 text-cyan-200 border-cyan-300/20',
      bar: 'bg-cyan-400',
    },
    amber: {
      soft: 'bg-amber-400/12 text-amber-200 border border-amber-300/20',
      pill: 'bg-amber-400/12 text-amber-200 border-amber-300/20',
      bar: 'bg-amber-400',
    },
    rose: {
      soft: 'bg-rose-400/12 text-rose-200 border border-rose-300/20',
      pill: 'bg-rose-400/12 text-rose-200 border-rose-300/20',
      bar: 'bg-rose-400',
    },
  }
  return (map[tone as keyof typeof map] ?? map.green)[target]
}

export default App
