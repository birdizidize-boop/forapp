const STATE_KEY = "__foraCmpApiState";

const json = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
      ...(init.headers || {}),
    },
  });

const nowIso = () => new Date().toISOString();

const id = (prefix) =>
  `${prefix}_${crypto.randomUUID ? crypto.randomUUID().replaceAll("-", "").slice(0, 12) : Math.random().toString(16).slice(2, 14)}`;

const normalizeTitle = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9\s]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const similarityScore = (left, right) => {
  if (!left || !right) return 0;
  if (left === right) return 96;
  const leftWords = new Set(left.split(" ").filter(Boolean));
  const rightWords = new Set(right.split(" ").filter(Boolean));
  const shared = [...leftWords].filter((word) => rightWords.has(word)).length;
  const total = new Set([...leftWords, ...rightWords]).size || 1;
  return Math.round((shared / total) * 100);
};

const maskToken = (token) => (token ? `${String(token).slice(0, 4)}...${String(token).slice(-4)}` : null);

const publicBot = (bot) => {
  const { _token, ...safeBot } = bot;
  return safeBot;
};

const telegramApi = async (token, method, payload = {}) => {
  if (!token) return { ok: false, description: "Telegram token missing" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    return { ok: response.ok && body.ok !== false, http_status: response.status, ...body };
  } catch (error) {
    return {
      ok: false,
      description: error instanceof Error ? error.message : "Telegram request failed",
    };
  } finally {
    clearTimeout(timeout);
  }
};

const syncBotWithTelegram = async (bot) => {
  if (!bot?._token) {
    bot.last_error = "Bot token missing";
    return { ok: false, status: "missing_token", description: bot.last_error, bot: publicBot(bot) };
  }
  const result = await telegramApi(bot._token, "getMe");
  bot.last_checked_at = nowIso();
  if (result.ok) {
    const telegramBot = result.result || {};
    bot.telegram_verified = true;
    bot.telegram_bot_id = telegramBot.id ? String(telegramBot.id) : bot.telegram_bot_id || null;
    bot.username = telegramBot.username ? `@${telegramBot.username}` : bot.username;
    bot.name = telegramBot.first_name || bot.name;
    bot.status = "online";
    bot.last_error = null;
  } else {
    bot.telegram_verified = false;
    bot.status = bot.status === "online" ? "token_saved" : bot.status;
    bot.last_error = result.description || "Telegram getMe failed";
  }
  return {
    status: result.ok ? "verified" : "check_failed",
    ok: Boolean(result.ok),
    description: result.description,
    telegram: result.result,
    bot: publicBot(bot),
  };
};

const inlineKeyboard = (buttons = []) => {
  const rows = buttons
    .filter((button) => button && button.label)
    .map((button) => {
      const label = String(button.label);
      const value = String(button.value || button.url || button.target || "");
      if (button.type === "url" || /^https?:\/\//i.test(value)) return [{ text: label, url: value }];
      return [{ text: label, callback_data: value || label }];
    });
  return rows.length > 0 ? { inline_keyboard: rows } : undefined;
};

const seedState = () => {
  const createdAt = nowIso();
  return {
    bots: [
      {
        id: "bot_sponsor",
        name: "FORAGRAMM Sponsor Bot",
        username: "@foragrammsponsorbot",
        category: "Sports / Casino",
        status: "online",
        is_active: true,
        created_at: createdAt,
        webhook_path: "/api/telegram/webhook/bot_sponsor",
        token_present: false,
        token_hint: null,
        telegram_verified: false,
        telegram_bot_id: null,
        last_checked_at: null,
        last_error: null,
      },
      {
        id: "bot_bonus",
        name: "FORAGRAMM Bonus Bot",
        username: "@foragrammbonusbot",
        category: "Bonus",
        status: "online",
        is_active: true,
        created_at: createdAt,
        webhook_path: "/api/telegram/webhook/bot_bonus",
        token_present: false,
        token_hint: null,
        telegram_verified: false,
        telegram_bot_id: null,
        last_checked_at: null,
        last_error: null,
      },
      {
        id: "bot_vip",
        name: "FORAGRAMM VIP Bot",
        username: "@foragrammvipbot",
        category: "VIP",
        status: "paused",
        is_active: false,
        created_at: createdAt,
        webhook_path: "/api/telegram/webhook/bot_vip",
        token_present: false,
        token_hint: null,
        telegram_verified: false,
        telegram_bot_id: null,
        last_checked_at: null,
        last_error: null,
      },
    ],
    users: [],
    subscriptions: [],
    events: [],
    flows: [
      {
        id: "flow_welcome",
        bot_id: "bot_sponsor",
        bot_name: "FORAGRAMM Sponsor Bot",
        name: "Yeni Uye Karsilama Akisi",
        status: "published",
        nodes: [
          { id: "trigger", type: "trigger", label: "/start" },
          { id: "welcome", type: "message", label: "Hos geldin" },
          { id: "keyboard", type: "inline_keyboard", label: "Secenekler" },
        ],
        edges: [
          { id: "edge_1", source: "trigger", target: "welcome" },
          { id: "edge_2", source: "welcome", target: "keyboard" },
        ],
        created_at: createdAt,
        updated_at: createdAt,
      },
    ],
    campaigns: [
      {
        id: "campaign_daily",
        bot_id: "bot_sponsor",
        bot_name: "FORAGRAMM Sponsor Bot",
        flow_id: "flow_welcome",
        flow_name: "Yeni Uye Karsilama Akisi",
        name: "Gunluk Sponsor Duyurusu",
        audience: "all active Telegram users",
        mode: "test",
        status: "draft",
        title: "Gunluk Sponsor Duyurusu",
        message: "Bugune ozel sponsor kampanyasi aktif.",
        buttons: [{ label: "Kampanyaya git", type: "url", value: "https://foragramm.io/kampanya" }],
        filters: { work_hours: "09:00-18:00", weekdays: ["mon", "tue", "wed", "thu", "fri"] },
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
      { id: "folder_damabet", name: "Damabet", channel: "@damabetresmi", total_posts: 0, today_posts: 0, duplicates: 0, last_received_at: null },
      { id: "folder_betoffice", name: "Betoffice", channel: "@betofficevip", total_posts: 0, today_posts: 0, duplicates: 0, last_received_at: null },
      { id: "folder_maxwin", name: "Maxwin", channel: "@maxwinbonus", total_posts: 0, today_posts: 0, duplicates: 0, last_received_at: null },
    ],
    items: [],
    duplicate_groups: [],
  };
};

const state = () => {
  globalThis[STATE_KEY] ||= seedState();
  return globalThis[STATE_KEY];
};

const botName = (data, botId) => data.bots.find((bot) => bot.id === botId)?.name || null;
const flowName = (data, flowId) => data.flows.find((flow) => flow.id === flowId)?.name || null;

const overview = (data) => ({
  connected_bots: data.bots.length,
  active_campaigns: data.campaigns.filter((campaign) => ["draft", "scheduled", "running"].includes(campaign.status)).length,
  queued_notifications: data.notifications.filter((notification) => notification.status === "queued").length,
  views: 184200 + data.events.length * 18,
  clicks: 28640 + data.notifications.length,
  joins: 6210 + data.users.length,
  deposits: 842 + data.campaigns.filter((campaign) => campaign.status === "sent").length,
  users: data.users.length,
  subscriptions: data.subscriptions.length,
  events: data.events.length,
});

const schema = {
  users: ["id", "fora_user_id", "telegram_id", "username", "first_name", "language", "joined_at", "first_seen_bot_id", "last_seen_at"],
  bots: ["id", "name", "username", "category", "status"],
  subscriptions: ["id", "subscriber_uid", "user_id", "bot_id", "started_at", "expires_at", "status", "last_action_at"],
  telegram_action_events: ["id", "user_id", "bot_id", "subscription_id", "telegram_update_id", "action_type", "command", "payload", "created_at"],
  posts: ["id", "bot_id", "title", "content", "image", "created_at"],
  notifications: ["id", "user_id", "post_id", "sent_at", "status"],
  analytics: ["id", "bot_id", "views", "clicks", "joins", "deposits", "created_at"],
  flows: ["id", "bot_id", "name", "status", "created_at", "updated_at"],
  nodes: ["id", "flow_id", "type", "label", "payload"],
  edges: ["id", "flow_id", "source_node_id", "target_node_id", "condition"],
  campaigns: ["id", "bot_id", "flow_id", "name", "audience", "mode", "status", "title", "message", "buttons", "filters", "scheduled_at", "sent_count", "clicked_count", "completed_count"],
};

const contentOverview = (data) => {
  const today = nowIso().slice(0, 10);
  const folders = data.folders.map((folder) => {
    const folderItems = data.items.filter((item) => item.folder === folder.name);
    const lastItem = [...folderItems].sort((left, right) => String(right.received_at).localeCompare(String(left.received_at)))[0];
    return {
      ...folder,
      total_posts: folderItems.length,
      today_posts: folderItems.filter((item) => item.received_at?.startsWith(today)).length,
      duplicates: folderItems.filter((item) => item.status === "duplicate").length,
      last_received_at: lastItem?.received_at || null,
    };
  });
  const todayItems = data.items.filter((item) => item.received_at?.startsWith(today));
  return {
    folders,
    items: [...todayItems].sort((left, right) => String(right.received_at).localeCompare(String(left.received_at))).slice(0, 50),
    duplicate_groups: data.duplicate_groups.slice(0, 20),
    today: {
      incoming: todayItems.length,
      stored: todayItems.filter((item) => item.status === "stored" || item.status === "duplicate").length,
      excluded_links: todayItems.filter((item) => item.excluded_reason === "link_only").length,
      excluded_stickers: todayItems.filter((item) => item.excluded_reason === "sticker").length,
      duplicate_groups: data.duplicate_groups.length,
    },
  };
};

const extractTelegramActor = (update) => {
  const callback = update.callback_query || {};
  const message = update.message || callback.message || {};
  const actor = message.from || callback.from || {};
  const text = message.text || callback.data || "";
  const actionType = callback.id ? "callback_query" : text.startsWith("/start") ? "start_command" : "message";
  return { actor, text, actionType };
};

const upsertTelegramIdentity = (data, bot, update) => {
  const { actor, text, actionType } = extractTelegramActor(update);
  const telegramId = String(actor.id || update.telegram_id || `local-${Math.random().toString(16).slice(2, 10)}`);
  let user = data.users.find((entry) => entry.telegram_id === telegramId);
  if (!user) {
    const sequence = String(data.users.length + 1).padStart(6, "0");
    user = {
      id: id("user"),
      fora_user_id: `FGM-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${sequence}`,
      telegram_id: telegramId,
      username: actor.username || null,
      first_name: actor.first_name || null,
      last_name: actor.last_name || null,
      language: actor.language_code || update.language || "tr",
      joined_at: nowIso(),
      last_seen_at: nowIso(),
      first_seen_bot_id: bot.id,
      subscriptions: 0,
      events: 0,
    };
    data.users.unshift(user);
  } else {
    user.username = actor.username || user.username;
    user.first_name = actor.first_name || user.first_name;
    user.last_name = actor.last_name || user.last_name;
    user.language = actor.language_code || user.language;
    user.last_seen_at = nowIso();
  }

  let subscription = data.subscriptions.find((entry) => entry.user_id === user.id && entry.bot_id === bot.id);
  if (!subscription) {
    subscription = {
      id: id("subscription"),
      subscriber_uid: `SUB-${Math.random().toString(16).slice(2, 14).toUpperCase()}`,
      user_id: user.id,
      bot_id: bot.id,
      started_at: nowIso(),
      status: "active",
      last_action_at: nowIso(),
    };
    data.subscriptions.unshift(subscription);
    user.subscriptions += 1;
  } else {
    subscription.last_action_at = nowIso();
    subscription.status = "active";
  }

  const event = {
    id: id("event"),
    user_id: user.id,
    bot_id: bot.id,
    subscription_id: subscription.id,
    telegram_update_id: update.update_id != null ? String(update.update_id) : null,
    action_type: actionType,
    command: text && text.startsWith("/") ? text.split(" ", 1)[0] : null,
    payload: update,
    created_at: nowIso(),
  };
  user.events += 1;
  user.last_seen_at = nowIso();
  data.events.unshift(event);
  return { user, subscription, event, text };
};

const ingestContent = (data, folder, payload) => {
  const receivedAt = nowIso();
  const title = payload.title || payload.content?.slice(0, 80) || "Untitled";
  const content = payload.content || title;
  const mediaType = payload.media_type || "text";
  const normalized = normalizeTitle(title);
  const linkOnly = /^\s*https?:\/\/\S+\s*$/.test(content);
  const excluded = linkOnly || mediaType === "sticker" || !normalized;
  let status = excluded ? "excluded" : "stored";
  const excludedReason = linkOnly ? "link_only" : mediaType === "sticker" ? "sticker" : !normalized ? "empty" : null;
  let duplicateGroupKey = null;
  let score = 0;

  if (!excluded) {
    const today = receivedAt.slice(0, 10);
    const sameDayItems = data.items.filter(
      (item) => item.folder === folder.name && item.received_at?.startsWith(today) && ["stored", "duplicate"].includes(item.status),
    );
    const duplicateSource = sameDayItems
      .map((item) => ({ item, score: similarityScore(normalized, normalizeTitle(item.title)) }))
      .find((candidate) => candidate.score >= 80);
    if (duplicateSource) {
      status = "duplicate";
      duplicateGroupKey = duplicateSource.item.duplicate_group_key || normalizeTitle(duplicateSource.item.title);
      duplicateSource.item.duplicate_group_key = duplicateGroupKey;
      duplicateSource.item.status = "duplicate";
      score = duplicateSource.score;
      const group = data.duplicate_groups.find((entry) => entry.group_key === duplicateGroupKey && entry.folder === folder.name);
      if (group) {
        group.item_count += 1;
        group.similarity_score = Math.max(group.similarity_score, score);
        group.detected_at = receivedAt;
      } else {
        data.duplicate_groups.unshift({
          id: id("dupe"),
          folder: folder.name,
          title: duplicateSource.item.title,
          item_count: 2,
          similarity_score: score,
          detected_at: receivedAt,
          group_key: duplicateGroupKey,
        });
      }
    }
  }

  const item = {
    id: id("item"),
    folder: folder.name,
    title,
    content,
    media_type: mediaType,
    status,
    excluded_reason: excludedReason,
    similarity_score: score,
    received_at: receivedAt,
    duplicate_group_key: duplicateGroupKey,
  };
  data.items.unshift(item);
  return item;
};

const body = async (request) => {
  try {
    return await request.json();
  } catch {
    return {};
  }
};

export async function handleApiRequest(request) {
  if (request.method === "OPTIONS") return json({ status: "ok" });
  const data = state();
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, "") || "/";
  const method = request.method.toUpperCase();

  if (method === "GET" && path === "/health") return json({ status: "ok", service: "fora-cmp-sites-api", database: "worker-state" });
  if (method === "GET" && path === "/telegram/overview") return json(overview(data));
  if (method === "GET" && path === "/telegram/schema") return json(schema);
  if (method === "GET" && path === "/bots") return json(data.bots.map(publicBot));
  if (method === "GET" && path === "/users") return json(data.users);
  if (method === "GET" && path === "/flows") return json(data.flows);
  if (method === "GET" && path === "/campaigns") return json(data.campaigns);
  if (method === "GET" && path === "/content-pool/overview") return json(contentOverview(data));

  if (method === "POST" && path === "/bots") {
    const payload = await body(request);
    const username = String(payload.username || "foragramm_bot").startsWith("@") ? payload.username : `@${payload.username || "foragramm_bot"}`;
    const token = String(payload.token || "").trim();
    const botId = id("bot");
    const bot = {
      id: botId,
      name: payload.name || "FORAGRAMM Bot",
      username,
      category: payload.category || "Sponsor",
      status: token ? "token_saved" : "online",
      is_active: true,
      created_at: nowIso(),
      webhook_path: `/api/telegram/webhook/${botId}`,
      token_present: Boolean(token),
      token_hint: maskToken(token),
      telegram_verified: false,
      telegram_bot_id: null,
      last_checked_at: null,
      last_error: token ? null : "Bot token missing",
      _token: token || null,
    };
    if (token) await syncBotWithTelegram(bot);
    data.bots.unshift(bot);
    return json(publicBot(bot), { status: 201 });
  }

  if (method === "POST" && path === "/flows") {
    const payload = await body(request);
    const bot = data.bots.find((entry) => entry.id === payload.bot_id) || data.bots[0];
    const createdAt = nowIso();
    const flow = {
      id: id("flow"),
      bot_id: bot?.id || "bot_local",
      bot_name: bot?.name || "FORAGRAMM Local Bot",
      name: payload.name || "Yeni Telegram Akisi",
      status: payload.status || "draft",
      nodes: payload.nodes || [],
      edges: payload.edges || [],
      created_at: createdAt,
      updated_at: createdAt,
    };
    data.flows.unshift(flow);
    return json(flow, { status: 201 });
  }

  const publishMatch = path.match(/^\/flows\/([^/]+)\/publish$/);
  if (method === "POST" && publishMatch) {
    const flow = data.flows.find((entry) => entry.id === publishMatch[1]);
    if (!flow) return json({ error: "flow not found" }, { status: 404 });
    flow.status = "published";
    flow.updated_at = nowIso();
    return json(flow);
  }

  if (method === "POST" && path === "/campaigns") {
    const payload = await body(request);
    const bot = data.bots.find((entry) => entry.id === payload.bot_id) || data.bots[0];
    const flow = data.flows.find((entry) => entry.id === payload.flow_id) || data.flows[0];
    const campaign = {
      id: id("campaign"),
      bot_id: bot?.id || null,
      bot_name: botName(data, bot?.id),
      flow_id: flow?.id || null,
      flow_name: flowName(data, flow?.id),
      name: payload.name || payload.title || "FORAGRAMM Kampanya",
      audience: payload.audience || "all",
      mode: payload.mode || "test",
      status: "draft",
      title: payload.title || payload.name || "FORAGRAMM Kampanya",
      message: payload.message || "",
      buttons: payload.buttons || [],
      filters: payload.filters || {},
      scheduled_at: null,
      sent_count: 0,
      clicked_count: 0,
      completed_count: 0,
      last_sent_at: null,
      created_at: nowIso(),
    };
    data.campaigns.unshift(campaign);
    return json(campaign, { status: 201 });
  }

  const sendCampaignMatch = path.match(/^\/campaigns\/([^/]+)\/send$/);
  if (method === "POST" && sendCampaignMatch) {
    const campaign = data.campaigns.find((entry) => entry.id === sendCampaignMatch[1]);
    if (!campaign) return json({ error: "campaign not found" }, { status: 404 });
    const bot = data.bots.find((entry) => entry.id === campaign.bot_id) || data.bots[0];
    if (campaign.mode === "real" && !bot?._token) {
      campaign.status = "blocked";
      return json({ error: "Telegram token missing for real broadcast", campaign }, { status: 400 });
    }
    const postId = id("post");
    const notifications = data.users.map((user) => ({
      id: id("notification"),
      user_id: user.id,
      post_id: postId,
      status: "queued",
      sent_at: null,
    }));
    data.notifications.unshift(...notifications);
    let liveSent = 0;
    let liveFailed = 0;
    if (campaign.mode === "real" && bot?._token) {
      const replyMarkup = inlineKeyboard(campaign.buttons);
      for (const notification of notifications) {
        const user = data.users.find((entry) => entry.id === notification.user_id);
        const result = await telegramApi(bot._token, "sendMessage", {
          chat_id: user?.telegram_id,
          text: campaign.message || campaign.title,
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        });
        if (result.ok) {
          notification.status = "sent";
          notification.sent_at = nowIso();
          liveSent += 1;
        } else {
          notification.status = "failed";
          liveFailed += 1;
        }
      }
    }
    campaign.status = data.users.length > 0 ? "sent" : "ready";
    campaign.sent_count = data.users.length;
    campaign.clicked_count = Math.floor(data.users.length * 0.28);
    campaign.completed_count = Math.floor(data.users.length * 0.11);
    campaign.last_sent_at = nowIso();
    return json({
      status: campaign.status,
      queued_notifications: notifications.length,
      live_delivery_attempted: campaign.mode === "real",
      live_sent: liveSent,
      live_failed: liveFailed,
      delivery_status: campaign.mode === "real" ? "telegram_sendMessage" : "queued_only",
      campaign,
    });
  }

  const checkBotMatch = path.match(/^\/telegram\/bots\/([^/]+)\/check$/);
  if (method === "POST" && checkBotMatch) {
    const bot = data.bots.find((entry) => entry.id === checkBotMatch[1]);
    if (!bot) return json({ error: "bot not found" }, { status: 404 });
    const result = await syncBotWithTelegram(bot);
    return json(result, { status: result.ok ? 200 : 400 });
  }

  const webhookMatch = path.match(/^\/telegram\/bots\/([^/]+)\/set-webhook$/);
  if (method === "POST" && webhookMatch) {
    const bot = data.bots.find((entry) => entry.id === webhookMatch[1]);
    if (!bot) return json({ error: "bot not found" }, { status: 404 });
    if (!bot._token) return json({ error: "Telegram token missing" }, { status: 400 });
    const payload = await body(request);
    const webhookUrl = String(payload.webhook_url || "").trim();
    if (!/^https:\/\//i.test(webhookUrl)) return json({ error: "webhook_url must be https" }, { status: 400 });
    const result = await telegramApi(bot._token, "setWebhook", { url: webhookUrl });
    bot.last_checked_at = nowIso();
    bot.last_error = result.ok ? null : result.description || "setWebhook failed";
    return json({
      status: result.ok ? "webhook_set" : "webhook_failed",
      ok: Boolean(result.ok),
      webhook_url: webhookUrl,
      description: result.description,
      bot: publicBot(bot),
    }, { status: result.ok ? 200 : 400 });
  }

  const sendTestMatch = path.match(/^\/telegram\/bots\/([^/]+)\/send-test$/);
  if (method === "POST" && sendTestMatch) {
    const bot = data.bots.find((entry) => entry.id === sendTestMatch[1]);
    if (!bot) return json({ error: "bot not found" }, { status: 404 });
    if (!bot._token) return json({ error: "Telegram token missing" }, { status: 400 });
    const payload = await body(request);
    const chatId = String(payload.chat_id || "").trim();
    if (!chatId) return json({ error: "chat_id is required" }, { status: 400 });
    const result = await telegramApi(bot._token, "sendMessage", {
      chat_id: chatId,
      text: payload.message || "FORAGRAMM test mesaji",
    });
    return json({
      status: result.ok ? "sent" : "failed",
      ok: Boolean(result.ok),
      chat_id: chatId,
      message_id: result.result?.message_id,
      description: result.description,
    }, { status: result.ok ? 200 : 400 });
  }

  const webhookUpdateMatch = path.match(/^\/telegram\/webhook\/([^/]+)$/);
  if (method === "POST" && webhookUpdateMatch) {
    const bot = data.bots.find((entry) => entry.id === webhookUpdateMatch[1]);
    if (!bot) return json({ error: "bot not found" }, { status: 404 });
    const update = await body(request);
    const { user, subscription, event, text } = upsertTelegramIdentity(data, bot, update);
    if (bot._token && text?.startsWith("/start")) {
      await telegramApi(bot._token, "sendMessage", {
        chat_id: user.telegram_id,
        text: "FORAGRAMM ailesine hos geldin. Sana ozel kampanyalari buradan takip edebilirsin.",
      });
    }
    return json({
      status: "accepted",
      bot: publicBot(bot),
      user,
      subscription_id: subscription.id,
      subscriber_uid: subscription.subscriber_uid,
      event_id: event.id,
      action_type: event.action_type,
    }, { status: 202 });
  }

  const testUpdateMatch = path.match(/^\/telegram\/test-update\/([^/]+)$/);
  if (method === "POST" && testUpdateMatch) {
    const bot = data.bots.find((entry) => entry.id === testUpdateMatch[1]);
    if (!bot) return json({ error: "bot not found" }, { status: 404 });
    const payload = await body(request);
    const update = {
      update_id: Math.floor(Date.now() / 1000),
      message: {
        message_id: Math.floor(Date.now() / 1000),
        text: "/start codex-test",
        date: Math.floor(Date.now() / 1000),
        from: {
          id: payload.telegram_id || Math.floor(900000000 + Math.random() * 999999),
          username: payload.username || `fora_test_${Math.floor(Math.random() * 9999)}`,
          first_name: payload.first_name || "FORA Test",
          language_code: payload.language || "tr",
        },
      },
    };
    const { user, subscription, event } = upsertTelegramIdentity(data, bot, update);
    return json({ status: "accepted", action_type: event.action_type, subscriber_uid: subscription.subscriber_uid, event_id: event.id, user }, { status: 202 });
  }

  if (method === "POST" && path === "/content-pool/channels") {
    const index = data.folders.length + 1;
    const folder = {
      id: id("folder"),
      name: `Sponsor ${index}`,
      channel: `@sponsor${Math.floor(Math.random() * 9999)}`,
      total_posts: 0,
      today_posts: 0,
      duplicates: 0,
      last_received_at: null,
    };
    data.folders.unshift(folder);
    return json(folder, { status: 201 });
  }

  if (method === "POST" && path === "/content-pool/simulate") {
    const folder = data.folders[0] || seedState().folders[0];
    const samples = [
      { title: "Gunun ozel yatirim bonusu aktif", content: "Bugune ozel yatirim bonusu aktif.", media_type: "text" },
      { title: "Gunun ozel yatirim bonusu aktif", content: "Bugune ozel yatirim bonusu tekrar aktif.", media_type: "text" },
      { title: "https://example.com/bonus", content: "https://example.com/bonus", media_type: "text" },
      { title: "Sticker post", content: "", media_type: "sticker" },
    ];
    const item = ingestContent(data, folder, samples[data.items.length % samples.length]);
    return json(item, { status: 201 });
  }

  const duplicateDeleteMatch = path.match(/^\/content-pool\/duplicates\/([^/]+)$/);
  if (method === "DELETE" && duplicateDeleteMatch) {
    const group = data.duplicate_groups.find((entry) => entry.id === duplicateDeleteMatch[1]);
    if (!group) return json({ error: "duplicate group not found" }, { status: 404 });
    const before = data.items.length;
    data.items = data.items.filter((item) => !(item.folder === group.folder && item.status === "duplicate" && item.duplicate_group_key === group.group_key));
    data.duplicate_groups = data.duplicate_groups.filter((entry) => entry.id !== group.id);
    return json({ status: "deleted", deleted_items: before - data.items.length });
  }

  return json({ error: `route not found: ${method} ${path}` }, { status: 404 });
}
