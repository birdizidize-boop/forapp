from __future__ import annotations

import hashlib
import json
import os
import re
import urllib.error
import urllib.request
from datetime import datetime, timedelta
from difflib import SequenceMatcher
from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request
from sqlalchemy import func

from app.extensions import db
from app.models.core import (
    Analytics,
    Bot,
    Campaign,
    ContentDuplicateGroup,
    ContentFolder,
    ContentPoolItem,
    Flow,
    FlowEdge,
    FlowNode,
    Notification,
    Post,
    SponsorChannel,
    Subscription,
    TelegramActionEvent,
    UserProfile,
)

api = Blueprint("api", __name__)
RUNTIME_BOT_TOKENS: dict[str, str] = {}


def tenant_id() -> str:
    return current_app.config.get("DEFAULT_TENANT_ID", "fora")


def now() -> datetime:
    return datetime.utcnow()


def normalize_title(value: str) -> str:
    value = value.lower()
    value = re.sub(r"https?://\S+", "", value)
    value = re.sub(r"[^a-z0-9ğüşöçıİĞÜŞÖÇ\s]+", " ", value, flags=re.IGNORECASE)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def mask_token(token: str | None) -> str | None:
    if not token:
        return None
    return f"{token[:4]}...{token[-4:]}"


def bot_token_env_names(bot: Bot) -> list[str]:
    safe_id = re.sub(r"[^A-Z0-9]+", "_", bot.id.upper()).strip("_")
    safe_username = re.sub(r"[^A-Z0-9]+", "_", bot.username.upper()).strip("_")
    return [
        f"TELEGRAM_BOT_TOKEN_{safe_id}",
        f"TELEGRAM_BOT_TOKEN_{safe_username}",
    ]


def resolve_bot_token(bot: Bot) -> str | None:
    token = RUNTIME_BOT_TOKENS.get(bot.id)
    if token:
        return token
    for env_name in bot_token_env_names(bot):
        token = os.getenv(env_name)
        if token:
            RUNTIME_BOT_TOKENS[bot.id] = token
            return token
    return None


def telegram_api(token: str | None, method: str, payload: dict | None = None) -> dict:
    if not token:
        return {"ok": False, "description": "Telegram token missing"}
    request = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/{method}",
        data=json.dumps(payload or {}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=6) as response:
            body = response.read().decode("utf-8")
            parsed = json.loads(body) if body else {}
            parsed.setdefault("ok", response.status < 400)
            parsed["http_status"] = response.status
            return parsed
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="ignore")
        try:
            parsed = json.loads(body) if body else {}
        except json.JSONDecodeError:
            parsed = {"description": body or str(error)}
        parsed["ok"] = False
        parsed["http_status"] = error.code
        return parsed
    except Exception as error:
        return {"ok": False, "description": str(error)}


def sync_bot_with_telegram(bot: Bot) -> dict:
    result = telegram_api(resolve_bot_token(bot), "getMe")
    if result.get("ok"):
        telegram_bot = result.get("result") or {}
        if telegram_bot.get("username"):
            bot.username = f"@{telegram_bot['username']}"
        if telegram_bot.get("first_name"):
            bot.name = telegram_bot["first_name"]
        bot.status = "online"
        bot.is_active = True
        db.session.commit()
    return {
        "status": "verified" if result.get("ok") else "check_failed",
        "ok": bool(result.get("ok")),
        "description": result.get("description"),
        "telegram": result.get("result"),
        "bot": bot_to_dict(bot),
    }


def inline_keyboard(buttons: list | None) -> dict | None:
    rows = []
    for button in buttons or []:
        label = str(button.get("label") or "").strip()
        value = str(button.get("value") or button.get("url") or button.get("target") or "").strip()
        if not label:
            continue
        if button.get("type") == "url" or re.match(r"^https?://", value, flags=re.IGNORECASE):
            rows.append([{"text": label, "url": value}])
        else:
            rows.append([{"text": label, "callback_data": value or label}])
    return {"inline_keyboard": rows} if rows else None


def bot_to_dict(bot: Bot) -> dict:
    token = resolve_bot_token(bot)
    return {
        "id": bot.id,
        "name": bot.name,
        "username": bot.username,
        "category": bot.category,
        "status": bot.status,
        "is_active": bot.is_active,
        "created_at": bot.created_at.isoformat() if bot.created_at else None,
        "webhook_path": f"/api/telegram/webhook/{bot.id}",
        "token_present": bool(token),
        "token_hint": mask_token(token),
        "telegram_verified": bot.status == "online" and bool(token),
    }


def user_to_dict(user: UserProfile) -> dict:
    subscriptions = Subscription.query.filter_by(tenant_id=user.tenant_id, user_id=user.id).count()
    events = TelegramActionEvent.query.filter_by(tenant_id=user.tenant_id, user_id=user.id).count()
    return {
        "id": user.id,
        "fora_user_id": user.fora_user_id,
        "telegram_id": user.telegram_id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "language": user.language,
        "joined_at": user.joined_at.isoformat() if user.joined_at else None,
        "last_seen_at": user.last_seen_at.isoformat() if user.last_seen_at else None,
        "first_seen_bot_id": user.first_seen_bot_id,
        "subscriptions": subscriptions,
        "events": events,
    }


def folder_to_dict(folder: ContentFolder) -> dict:
    today_start = now().replace(hour=0, minute=0, second=0, microsecond=0)
    total = ContentPoolItem.query.filter_by(tenant_id=folder.tenant_id, folder_id=folder.id).count()
    today_count = ContentPoolItem.query.filter(
        ContentPoolItem.tenant_id == folder.tenant_id,
        ContentPoolItem.folder_id == folder.id,
        ContentPoolItem.received_at >= today_start,
    ).count()
    duplicates = ContentPoolItem.query.filter(
        ContentPoolItem.tenant_id == folder.tenant_id,
        ContentPoolItem.folder_id == folder.id,
        ContentPoolItem.status == "duplicate",
    ).count()
    last_item = (
        ContentPoolItem.query.filter_by(tenant_id=folder.tenant_id, folder_id=folder.id)
        .order_by(ContentPoolItem.received_at.desc())
        .first()
    )
    channel = folder.sponsor_channel
    return {
        "id": folder.id,
        "name": folder.name,
        "channel": channel.username or channel.telegram_channel_id if channel else "",
        "total_posts": total,
        "today_posts": today_count,
        "duplicates": duplicates,
        "last_received_at": last_item.received_at.isoformat() if last_item else None,
    }


def item_to_dict(item: ContentPoolItem) -> dict:
    return {
        "id": item.id,
        "folder": item.folder.name if item.folder else "",
        "title": item.title,
        "content": item.content,
        "media_type": item.media_type,
        "status": item.status,
        "excluded_reason": item.excluded_reason,
        "similarity_score": item.similarity_score,
        "received_at": item.received_at.isoformat() if item.received_at else None,
    }


def duplicate_group_to_dict(group: ContentDuplicateGroup) -> dict:
    return {
        "id": group.id,
        "folder": group.folder.name if group.folder else "",
        "title": group.canonical_title,
        "item_count": group.item_count,
        "similarity_score": group.max_similarity_score,
        "detected_at": group.detected_at.isoformat() if group.detected_at else None,
    }


def flow_to_dict(flow: Flow, include_graph: bool = True) -> dict:
    data = {
        "id": flow.id,
        "bot_id": flow.bot_id,
        "bot_name": flow.bot.name if flow.bot else None,
        "name": flow.name,
        "status": flow.status,
        "created_at": flow.created_at.isoformat() if flow.created_at else None,
        "updated_at": flow.updated_at.isoformat() if flow.updated_at else None,
    }
    if include_graph:
        nodes = FlowNode.query.filter_by(tenant_id=flow.tenant_id, flow_id=flow.id).all()
        edges = FlowEdge.query.filter_by(tenant_id=flow.tenant_id, flow_id=flow.id).all()
        data["nodes"] = [
            {
                "id": node.id,
                "type": node.type,
                "label": node.label,
                "payload": node.payload or {},
            }
            for node in nodes
        ]
        data["edges"] = [
            {
                "id": edge.id,
                "source": edge.source_node_id,
                "target": edge.target_node_id,
                "condition": edge.condition,
            }
            for edge in edges
        ]
    return data


def campaign_to_dict(campaign: Campaign) -> dict:
    return {
        "id": campaign.id,
        "bot_id": campaign.bot_id,
        "bot_name": campaign.bot.name if campaign.bot else None,
        "flow_id": campaign.flow_id,
        "flow_name": campaign.flow.name if campaign.flow else None,
        "name": campaign.name,
        "audience": campaign.audience,
        "mode": campaign.mode,
        "status": campaign.status,
        "title": campaign.title,
        "message": campaign.message,
        "buttons": campaign.buttons or [],
        "filters": campaign.filters or {},
        "scheduled_at": campaign.scheduled_at.isoformat() if campaign.scheduled_at else None,
        "sent_count": campaign.sent_count,
        "clicked_count": campaign.clicked_count,
        "completed_count": campaign.completed_count,
        "last_sent_at": campaign.last_sent_at.isoformat() if campaign.last_sent_at else None,
        "created_at": campaign.created_at.isoformat() if campaign.created_at else None,
    }


def ensure_demo_data() -> None:
    tid = tenant_id()
    if Bot.query.filter_by(tenant_id=tid).first():
        return

    bots = [
        Bot(
            tenant_id=tid,
            name="FORAGRAMM Sponsor Bot",
            username="@foragrammsponsorbot",
            category="Sports / Casino",
            status="online",
            token_hash=token_hash("demo-sponsor-token"),
        ),
        Bot(
            tenant_id=tid,
            name="FORAGRAMM Bonus Bot",
            username="@foragrammbonusbot",
            category="Bonus",
            status="online",
            token_hash=token_hash("demo-bonus-token"),
        ),
        Bot(
            tenant_id=tid,
            name="FORAGRAMM VIP Bot",
            username="@foragrammvipbot",
            category="VIP",
            status="paused",
            token_hash=token_hash("demo-vip-token"),
        ),
    ]
    db.session.add_all(bots)

    channels = [
        SponsorChannel(tenant_id=tid, name="Damabet", telegram_channel_id="-100100001", username="@damabetresmi"),
        SponsorChannel(tenant_id=tid, name="Betoffice", telegram_channel_id="-100100002", username="@betofficevip"),
        SponsorChannel(tenant_id=tid, name="Maxwin", telegram_channel_id="-100100003", username="@maxwinbonus"),
    ]
    db.session.add_all(channels)
    db.session.flush()
    folders = [ContentFolder(tenant_id=tid, sponsor_channel_id=channel.id, name=channel.name) for channel in channels]
    db.session.add_all(folders)

    db.session.add_all(
        [
            Analytics(tenant_id=tid, bot=bots[0], views=184200, clicks=28640, joins=6210, deposits=842),
            Analytics(tenant_id=tid, bot=bots[1], views=91200, clicks=13240, joins=2840, deposits=312),
            Analytics(tenant_id=tid, bot=bots[2], views=42600, clicks=7840, joins=1180, deposits=218),
        ]
    )
    db.session.flush()
    welcome_flow = Flow(tenant_id=tid, bot_id=bots[0].id, name="Yeni Uye Karsilama Akisi", status="published")
    db.session.add(welcome_flow)
    db.session.flush()
    db.session.add_all(
        [
            FlowNode(tenant_id=tid, id="trigger", flow_id=welcome_flow.id, type="trigger", label="/start", payload={"command": "/start"}),
            FlowNode(tenant_id=tid, id="welcome", flow_id=welcome_flow.id, type="message", label="Hos geldin", payload={"text": "FORAGRAMM ailesine hos geldin."}),
            FlowNode(tenant_id=tid, id="keyboard", flow_id=welcome_flow.id, type="inline_keyboard", label="Secenekler", payload={"buttons": [{"label": "Bonus", "target": "bonus_flow"}, {"label": "Destek", "target": "operator"}]}),
            FlowEdge(tenant_id=tid, flow_id=welcome_flow.id, source_node_id="trigger", target_node_id="welcome"),
            FlowEdge(tenant_id=tid, flow_id=welcome_flow.id, source_node_id="welcome", target_node_id="keyboard"),
        ]
    )
    campaign = Campaign(
        tenant_id=tid,
        bot_id=bots[0].id,
        flow_id=welcome_flow.id,
        name="Gunluk Sponsor Duyurusu",
        audience="all active Telegram users",
        mode="test",
        status="draft",
        title="FORAGRAMM kampanya",
        message="Bugune ozel sponsor kampanyasi aktif.",
        buttons=[{"label": "Kampanyaya git", "type": "url", "value": "https://foragramm.io/kampanya"}],
        filters={"work_hours": "09:00-18:00", "weekdays": ["mon", "tue", "wed", "thu", "fri"]},
    )
    db.session.add(campaign)
    db.session.commit()


def extract_telegram_actor(update: dict) -> tuple[dict, str | None, str]:
    callback = update.get("callback_query") or {}
    message = update.get("message") or callback.get("message") or {}
    actor = message.get("from") or callback.get("from") or {}
    text = message.get("text") or callback.get("data") or ""
    if callback:
        action_type = "callback_query"
    elif text.startswith("/start"):
        action_type = "start_command"
    else:
        action_type = "message"
    return actor, text, action_type


def upsert_telegram_identity(bot: Bot, update: dict) -> tuple[UserProfile, Subscription, TelegramActionEvent]:
    tid = tenant_id()
    actor, text, action_type = extract_telegram_actor(update)
    telegram_id = str(actor.get("id") or update.get("telegram_id") or f"local-{uuid4().hex[:8]}")
    user = UserProfile.query.filter_by(tenant_id=tid, telegram_id=telegram_id).first()

    if user is None:
        user = UserProfile(
            tenant_id=tid,
            telegram_id=telegram_id,
            username=actor.get("username"),
            first_name=actor.get("first_name"),
            last_name=actor.get("last_name"),
            language=actor.get("language_code") or update.get("language") or "tr",
            first_seen_bot_id=bot.id,
        )
        db.session.add(user)
        db.session.flush()
    else:
        user.username = actor.get("username") or user.username
        user.first_name = actor.get("first_name") or user.first_name
        user.last_name = actor.get("last_name") or user.last_name
        user.language = actor.get("language_code") or user.language
        user.last_seen_at = now()

    subscription = Subscription.query.filter_by(tenant_id=tid, user_id=user.id, bot_id=bot.id).first()
    if subscription is None:
        subscription = Subscription(tenant_id=tid, user_id=user.id, bot_id=bot.id)
        db.session.add(subscription)
        db.session.flush()
    else:
        subscription.last_action_at = now()
        subscription.status = "active"

    event = TelegramActionEvent(
        tenant_id=tid,
        user_id=user.id,
        bot_id=bot.id,
        subscription_id=subscription.id,
        telegram_update_id=str(update.get("update_id")) if update.get("update_id") is not None else None,
        action_type=action_type,
        command=text.split(" ", 1)[0] if text and text.startswith("/") else None,
        payload=update,
    )
    db.session.add(event)
    db.session.commit()
    return user, subscription, event


def store_content_item(folder: ContentFolder, payload: dict) -> ContentPoolItem:
    tid = tenant_id()
    title = payload.get("title") or (payload.get("content") or "Untitled")[:80]
    content = payload.get("content") or title
    media_type = payload.get("media_type") or "text"
    normalized = normalize_title(title)
    source_message_id = str(payload.get("source_message_id") or uuid4())
    has_text = bool(normalized)
    link_only = bool(re.fullmatch(r"\s*https?://\S+\s*", content or ""))
    excluded = link_only or media_type == "sticker" or not has_text
    status = "excluded" if excluded else "stored"
    excluded_reason = "link_only" if link_only else "sticker" if media_type == "sticker" else "empty" if not has_text else None
    duplicate_key = None
    score = 0

    if not excluded:
        today_start = now().replace(hour=0, minute=0, second=0, microsecond=0)
        same_day_items = ContentPoolItem.query.filter(
            ContentPoolItem.tenant_id == tid,
            ContentPoolItem.folder_id == folder.id,
            ContentPoolItem.received_at >= today_start,
            ContentPoolItem.status.in_(["stored", "duplicate"]),
        ).all()
        for item in same_day_items:
            ratio = int(SequenceMatcher(None, normalized, item.normalized_title).ratio() * 100)
            if ratio >= 80:
                status = "duplicate"
                duplicate_key = item.duplicate_group_key or item.normalized_title
                score = ratio
                item.duplicate_group_key = duplicate_key
                item.status = "duplicate"
                group = ContentDuplicateGroup.query.filter_by(
                    tenant_id=tid,
                    folder_id=folder.id,
                    group_key=duplicate_key,
                ).first()
                if group is None:
                    group = ContentDuplicateGroup(
                        tenant_id=tid,
                        folder_id=folder.id,
                        group_key=duplicate_key,
                        canonical_title=item.title,
                        item_count=1,
                    )
                    db.session.add(group)
                group.item_count += 1
                group.max_similarity_score = max(group.max_similarity_score, ratio)
                break

    item = ContentPoolItem(
        tenant_id=tid,
        folder_id=folder.id,
        source_message_id=source_message_id,
        title=title,
        normalized_title=normalized,
        content=content,
        media_type=media_type,
        status=status,
        excluded_reason=excluded_reason,
        duplicate_group_key=duplicate_key,
        similarity_score=score,
    )
    db.session.add(item)
    db.session.commit()
    return item


@api.before_app_request
def prepare_database():
    if current_app.config.get("AUTO_CREATE_DB", True) and not getattr(current_app, "_fora_db_ready", False):
        db.create_all()
        ensure_demo_data()
        current_app._fora_db_ready = True


@api.get("/health")
def health():
    return jsonify({"status": "ok", "service": "fora-cmp-api", "database": "ready"})


@api.get("/dashboard")
def dashboard():
    tid = tenant_id()
    bot_count = Bot.query.filter_by(tenant_id=tid).count()
    user_count = UserProfile.query.filter_by(tenant_id=tid).count()
    subscription_count = Subscription.query.filter_by(tenant_id=tid).count()
    event_count = TelegramActionEvent.query.filter_by(tenant_id=tid).count()
    analytics = db.session.query(
        func.coalesce(func.sum(Analytics.views), 0),
        func.coalesce(func.sum(Analytics.clicks), 0),
        func.coalesce(func.sum(Analytics.joins), 0),
        func.coalesce(func.sum(Analytics.deposits), 0),
    ).filter(Analytics.tenant_id == tid).one()
    return jsonify(
        {
            "connected_bots": bot_count,
            "active_users": user_count,
            "active_conversations": subscription_count,
            "daily_messages": event_count,
            "completed_flows": analytics[2],
            "average_conversation_seconds": 168,
            "campaigns": Campaign.query.filter_by(tenant_id=tid).count(),
            "queued_notifications": Notification.query.filter_by(tenant_id=tid, status="queued").count(),
            "views": analytics[0],
            "clicks": analytics[1],
            "joins": analytics[2],
            "deposits": analytics[3],
        }
    )


@api.get("/node-types")
def node_types():
    return jsonify(
        [
            "text",
            "image",
            "video",
            "audio",
            "sticker",
            "document",
            "location",
            "contact",
            "inline_keyboard",
            "reply_keyboard",
            "delay",
            "condition",
            "random",
            "api_request",
            "sql_query",
            "variable",
            "tag_user",
            "transfer_operator",
            "finish_flow",
        ]
    )


@api.get("/flows")
def list_flows():
    flows = Flow.query.filter_by(tenant_id=tenant_id()).order_by(Flow.updated_at.desc()).all()
    return jsonify([flow_to_dict(flow, include_graph=False) for flow in flows])


@api.post("/flows")
def create_flow():
    payload = request.get_json(silent=True) or {}
    tid = tenant_id()
    bot = Bot.query.filter_by(tenant_id=tid, id=payload.get("bot_id")).first()
    if bot is None:
        bot = Bot.query.filter_by(tenant_id=tid).order_by(Bot.created_at.asc()).first()
    if bot is None:
        return jsonify({"error": "create a bot before saving a flow"}), 400

    name = (payload.get("name") or "Yeni Telegram Akisi").strip()
    status = (payload.get("status") or "draft").strip().lower()
    flow = Flow(tenant_id=tid, bot_id=bot.id, name=name, status=status)
    db.session.add(flow)
    db.session.flush()

    nodes = payload.get("nodes") or []
    edges = payload.get("edges") or []
    if not nodes:
        nodes = [
            {"id": "trigger", "type": "trigger", "label": "/start", "payload": {"command": "/start"}},
            {"id": "message", "type": "message", "label": "Karsilama mesaji", "payload": {"text": payload.get("message") or "Hos geldin."}},
        ]
        edges = [{"id": "e1", "source": "trigger", "target": "message", "condition": None}]

    node_ids = set()
    client_node_ids: dict[str, str] = {}
    for index, node in enumerate(nodes):
        client_id = str(node.get("id") or f"node-{index + 1}")
        node_id = f"node-{uuid4().hex[:12]}"
        client_node_ids[client_id] = node_id
        node_ids.add(node_id)
        data = node.get("data") or {}
        db.session.add(
            FlowNode(
                tenant_id=tid,
                id=node_id,
                flow_id=flow.id,
                type=str(node.get("type") or data.get("type") or "message"),
                label=str(data.get("label") or node.get("label") or node_id),
                payload={**(node.get("payload") or data), "client_node_id": client_id},
            )
        )

    for index, edge in enumerate(edges):
        source = client_node_ids.get(str(edge.get("source") or edge.get("source_node_id") or ""))
        target = client_node_ids.get(str(edge.get("target") or edge.get("target_node_id") or ""))
        if source not in node_ids or target not in node_ids:
            continue
        db.session.add(
            FlowEdge(
                tenant_id=tid,
                id=f"edge-{uuid4().hex[:12]}",
                flow_id=flow.id,
                source_node_id=source,
                target_node_id=target,
                condition=edge.get("label") or edge.get("condition"),
            )
        )

    db.session.commit()
    return jsonify(flow_to_dict(flow)), 201


@api.get("/flows/<flow_id>")
def get_flow(flow_id):
    flow = Flow.query.filter_by(tenant_id=tenant_id(), id=flow_id).first()
    if flow is None:
        return jsonify({"error": "flow not found"}), 404
    return jsonify(flow_to_dict(flow))


@api.post("/flows/<flow_id>/publish")
def publish_flow(flow_id):
    flow = Flow.query.filter_by(tenant_id=tenant_id(), id=flow_id).first()
    if flow is None:
        return jsonify({"error": "flow not found"}), 404
    flow.status = "published"
    db.session.commit()
    return jsonify(flow_to_dict(flow))


@api.get("/campaigns")
def list_campaigns():
    campaigns = Campaign.query.filter_by(tenant_id=tenant_id()).order_by(Campaign.created_at.desc()).all()
    return jsonify([campaign_to_dict(campaign) for campaign in campaigns])


@api.post("/campaigns")
def create_campaign():
    payload = request.get_json(silent=True) or {}
    tid = tenant_id()
    name = (payload.get("name") or payload.get("title") or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400

    bot = Bot.query.filter_by(tenant_id=tid, id=payload.get("bot_id")).first()
    if bot is None:
        bot = Bot.query.filter_by(tenant_id=tid).order_by(Bot.created_at.asc()).first()
    flow = Flow.query.filter_by(tenant_id=tid, id=payload.get("flow_id")).first() if payload.get("flow_id") else None

    campaign = Campaign(
        tenant_id=tid,
        bot_id=bot.id if bot else None,
        flow_id=flow.id if flow else None,
        name=name,
        audience=(payload.get("audience") or "all").strip(),
        mode=(payload.get("mode") or "test").strip().lower(),
        status=(payload.get("status") or "draft").strip().lower(),
        title=(payload.get("title") or name).strip(),
        message=(payload.get("message") or "").strip(),
        buttons=payload.get("buttons") or [],
        filters=payload.get("filters") or {},
    )
    db.session.add(campaign)
    db.session.commit()
    return jsonify(campaign_to_dict(campaign)), 201


@api.post("/campaigns/<campaign_id>/send")
def send_campaign(campaign_id):
    tid = tenant_id()
    campaign = Campaign.query.filter_by(tenant_id=tid, id=campaign_id).first()
    if campaign is None:
        return jsonify({"error": "campaign not found"}), 404
    users = UserProfile.query.filter_by(tenant_id=tid).order_by(UserProfile.last_seen_at.desc()).all()
    if campaign.bot_id is None:
        bot = Bot.query.filter_by(tenant_id=tid).order_by(Bot.created_at.asc()).first()
        campaign.bot_id = bot.id if bot else None
    if campaign.bot_id is None:
        return jsonify({"error": "create a bot before sending a campaign"}), 400
    bot = Bot.query.filter_by(tenant_id=tid, id=campaign.bot_id).first()
    token = resolve_bot_token(bot) if bot else None
    if campaign.mode == "real" and not token:
        campaign.status = "blocked"
        db.session.commit()
        return jsonify({"error": "Telegram token missing for real broadcast", "campaign": campaign_to_dict(campaign)}), 400

    post = Post(
        tenant_id=tid,
        bot_id=campaign.bot_id,
        title=campaign.title,
        content=campaign.message or campaign.title,
    )
    db.session.add(post)
    db.session.flush()

    live_sent = 0
    live_failed = 0
    reply_markup = inline_keyboard(campaign.buttons)
    for user in users:
        notification = Notification(tenant_id=tid, user_id=user.id, post_id=post.id, status="queued")
        if campaign.mode == "real" and token:
            result = telegram_api(
                token,
                "sendMessage",
                {
                    "chat_id": user.telegram_id,
                    "text": campaign.message or campaign.title,
                    **({"reply_markup": reply_markup} if reply_markup else {}),
                },
            )
            if result.get("ok"):
                notification.status = "sent"
                notification.sent_at = now()
                live_sent += 1
            else:
                notification.status = "failed"
                live_failed += 1
        db.session.add(notification)

    campaign.status = "sent" if users else "ready"
    campaign.sent_count = len(users)
    campaign.last_sent_at = now()
    db.session.commit()
    return jsonify(
        {
            "status": campaign.status,
            "queued_notifications": len(users),
            "live_delivery_attempted": campaign.mode == "real",
            "live_sent": live_sent,
            "live_failed": live_failed,
            "delivery_status": "telegram_sendMessage" if campaign.mode == "real" else "queued_only",
            "campaign": campaign_to_dict(campaign),
        }
    )


@api.get("/bots")
def list_bots():
    bots = Bot.query.filter_by(tenant_id=tenant_id()).order_by(Bot.created_at.desc()).all()
    return jsonify([bot_to_dict(bot) for bot in bots])


@api.post("/bots")
def create_bot():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    username = (payload.get("username") or "").strip()
    token = (payload.get("token") or "").strip()
    if not name or not username or not token:
        return jsonify({"error": "name, username and token are required"}), 400
    if not username.startswith("@"):
        username = f"@{username}"

    bot = Bot(
        tenant_id=tenant_id(),
        name=name,
        username=username,
        category=(payload.get("category") or "General").strip(),
        status=(payload.get("status") or "token_saved").lower(),
        token_hash=token_hash(token),
        is_active=True,
    )
    db.session.add(bot)
    db.session.flush()
    RUNTIME_BOT_TOKENS[bot.id] = token
    if payload.get("verify", True):
        sync_bot_with_telegram(bot)
    db.session.commit()
    return jsonify(bot_to_dict(bot)), 201


@api.post("/telegram/bots/<bot_id>/check")
def check_telegram_bot(bot_id):
    bot = Bot.query.filter_by(tenant_id=tenant_id(), id=bot_id).first()
    if bot is None:
        return jsonify({"error": "bot not found"}), 404
    result = sync_bot_with_telegram(bot)
    return jsonify(result), 200 if result["ok"] else 400


@api.post("/telegram/bots/<bot_id>/set-webhook")
def set_telegram_webhook(bot_id):
    bot = Bot.query.filter_by(tenant_id=tenant_id(), id=bot_id).first()
    if bot is None:
        return jsonify({"error": "bot not found"}), 404
    token = resolve_bot_token(bot)
    if not token:
        return jsonify({"error": "Telegram token missing"}), 400
    payload = request.get_json(silent=True) or {}
    webhook_url = (payload.get("webhook_url") or "").strip()
    if not webhook_url.startswith("https://"):
        return jsonify({"error": "webhook_url must be https"}), 400
    result = telegram_api(token, "setWebhook", {"url": webhook_url})
    return (
        jsonify(
            {
                "status": "webhook_set" if result.get("ok") else "webhook_failed",
                "ok": bool(result.get("ok")),
                "webhook_url": webhook_url,
                "description": result.get("description"),
                "bot": bot_to_dict(bot),
            }
        ),
        200 if result.get("ok") else 400,
    )


@api.post("/telegram/bots/<bot_id>/send-test")
def send_telegram_test_message(bot_id):
    bot = Bot.query.filter_by(tenant_id=tenant_id(), id=bot_id).first()
    if bot is None:
        return jsonify({"error": "bot not found"}), 404
    token = resolve_bot_token(bot)
    if not token:
        return jsonify({"error": "Telegram token missing"}), 400
    payload = request.get_json(silent=True) or {}
    chat_id = str(payload.get("chat_id") or "").strip()
    if not chat_id:
        return jsonify({"error": "chat_id is required"}), 400
    result = telegram_api(token, "sendMessage", {"chat_id": chat_id, "text": payload.get("message") or "FORAGRAMM test mesaji"})
    return (
        jsonify(
            {
                "status": "sent" if result.get("ok") else "failed",
                "ok": bool(result.get("ok")),
                "chat_id": chat_id,
                "message_id": (result.get("result") or {}).get("message_id"),
                "description": result.get("description"),
            }
        ),
        200 if result.get("ok") else 400,
    )


@api.get("/users")
def list_users():
    users = UserProfile.query.filter_by(tenant_id=tenant_id()).order_by(UserProfile.last_seen_at.desc()).all()
    return jsonify([user_to_dict(user) for user in users])


@api.get("/telegram/events")
def list_telegram_events():
    events = (
        TelegramActionEvent.query.filter_by(tenant_id=tenant_id())
        .order_by(TelegramActionEvent.created_at.desc())
        .limit(50)
        .all()
    )
    return jsonify(
        [
            {
                "id": event.id,
                "user_id": event.user_id,
                "bot_id": event.bot_id,
                "action_type": event.action_type,
                "command": event.command,
                "created_at": event.created_at.isoformat() if event.created_at else None,
            }
            for event in events
        ]
    )


@api.get("/telegram/schema")
def telegram_schema():
    return jsonify(
        {
            "users": ["id", "fora_user_id", "telegram_id", "username", "first_name", "language", "joined_at", "first_seen_bot_id", "last_seen_at"],
            "bots": ["id", "name", "username", "category", "status"],
            "subscriptions": ["id", "subscriber_uid", "user_id", "bot_id", "started_at", "expires_at", "status", "last_action_at"],
            "telegram_action_events": ["id", "user_id", "bot_id", "subscription_id", "telegram_update_id", "action_type", "command", "payload", "created_at"],
            "posts": ["id", "bot_id", "title", "content", "image", "created_at"],
            "notifications": ["id", "user_id", "post_id", "sent_at", "status"],
            "analytics": ["id", "bot_id", "views", "clicks", "joins", "deposits", "created_at"],
            "flows": ["id", "bot_id", "name", "status", "created_at", "updated_at"],
            "nodes": ["id", "flow_id", "type", "label", "payload"],
            "edges": ["id", "flow_id", "source_node_id", "target_node_id", "condition"],
            "campaigns": ["id", "bot_id", "flow_id", "name", "audience", "mode", "status", "title", "message", "buttons", "filters", "scheduled_at", "sent_count", "clicked_count", "completed_count"],
        }
    )


@api.get("/telegram/overview")
def telegram_overview():
    tid = tenant_id()
    analytics = db.session.query(
        func.coalesce(func.sum(Analytics.views), 0),
        func.coalesce(func.sum(Analytics.clicks), 0),
        func.coalesce(func.sum(Analytics.joins), 0),
        func.coalesce(func.sum(Analytics.deposits), 0),
    ).filter(Analytics.tenant_id == tid).one()
    return jsonify(
        {
            "connected_bots": Bot.query.filter_by(tenant_id=tid).count(),
            "active_campaigns": Campaign.query.filter(Campaign.tenant_id == tid, Campaign.status.in_(["draft", "scheduled", "running"])).count(),
            "queued_notifications": Notification.query.filter_by(tenant_id=tid, status="queued").count(),
            "views": analytics[0],
            "clicks": analytics[1],
            "joins": analytics[2],
            "deposits": analytics[3],
            "users": UserProfile.query.filter_by(tenant_id=tid).count(),
            "subscriptions": Subscription.query.filter_by(tenant_id=tid).count(),
            "events": TelegramActionEvent.query.filter_by(tenant_id=tid).count(),
        }
    )


@api.get("/telegram/identity-rules")
def telegram_identity_rules():
    return jsonify(
        {
            "primary_lookup": "tenant_id + telegram_id",
            "created_user_id_format": "FGM-XXXXXXXXXXXX",
            "created_subscription_id_format": "SUB-XXXXXXXXXXXXXX",
            "tracked_actions": ["/start", "callback_query", "message", "campaign_click", "flow_step"],
            "behavior": [
                "If telegram_id exists, reuse the same user row.",
                "If the user enters a new bot, create a subscription row with subscriber_uid.",
                "Every command and button action is stored in telegram_action_events.",
            ],
        }
    )


@api.post("/telegram/webhook/<bot_id>")
def telegram_webhook(bot_id):
    bot = Bot.query.filter_by(tenant_id=tenant_id(), id=bot_id).first()
    if bot is None:
        return jsonify({"error": "bot not found"}), 404
    update = request.get_json(silent=True) or {}
    user, subscription, event = upsert_telegram_identity(bot, update)
    if event.command == "/start":
        telegram_api(
            resolve_bot_token(bot),
            "sendMessage",
            {
                "chat_id": user.telegram_id,
                "text": "FORAGRAMM ailesine hos geldin. Sana ozel kampanyalari buradan takip edebilirsin.",
            },
        )
    return jsonify(
        {
            "status": "accepted",
            "bot": bot_to_dict(bot),
            "user": user_to_dict(user),
            "subscription_id": subscription.id,
            "subscriber_uid": subscription.subscriber_uid,
            "event_id": event.id,
            "action_type": event.action_type,
        }
    ), 202


@api.post("/telegram/test-update/<bot_id>")
def telegram_test_update(bot_id):
    bot = Bot.query.filter_by(tenant_id=tenant_id(), id=bot_id).first()
    if bot is None:
        return jsonify({"error": "bot not found"}), 404
    payload = request.get_json(silent=True) or {}
    update = {
        "update_id": int(datetime.utcnow().timestamp()),
        "message": {
            "message_id": int(datetime.utcnow().timestamp()),
            "text": "/start codex-test",
            "date": int(datetime.utcnow().timestamp()),
            "from": {
                "id": payload.get("telegram_id", 900000001),
                "username": payload.get("username", "foragramm_test"),
                "first_name": payload.get("first_name", "FORA Test"),
                "language_code": payload.get("language", "tr"),
            },
        },
    }
    user, subscription, event = upsert_telegram_identity(bot, update)
    return jsonify(
        {
            "status": "accepted",
            "bot": bot_to_dict(bot),
            "user": user_to_dict(user),
            "subscription_id": subscription.id,
            "subscriber_uid": subscription.subscriber_uid,
            "event_id": event.id,
            "action_type": event.action_type,
        }
    ), 202


@api.get("/content-pool/overview")
def content_pool_overview():
    tid = tenant_id()
    today_start = now().replace(hour=0, minute=0, second=0, microsecond=0)
    folders = ContentFolder.query.filter_by(tenant_id=tid).order_by(ContentFolder.name.asc()).all()
    today_query = ContentPoolItem.query.filter(ContentPoolItem.tenant_id == tid, ContentPoolItem.received_at >= today_start)
    return jsonify(
        {
            "folders": [folder_to_dict(folder) for folder in folders],
            "items": [
                item_to_dict(item)
                for item in today_query.order_by(ContentPoolItem.received_at.desc()).limit(50).all()
            ],
            "duplicate_groups": [
                duplicate_group_to_dict(group)
                for group in ContentDuplicateGroup.query.filter_by(tenant_id=tid)
                .order_by(ContentDuplicateGroup.detected_at.desc())
                .limit(20)
                .all()
            ],
            "today": {
                "incoming": today_query.count(),
                "stored": today_query.filter(ContentPoolItem.status.in_(["stored", "duplicate"])).count(),
                "excluded_links": today_query.filter_by(excluded_reason="link_only").count(),
                "excluded_stickers": today_query.filter_by(excluded_reason="sticker").count(),
                "duplicate_groups": ContentDuplicateGroup.query.filter(
                    ContentDuplicateGroup.tenant_id == tid,
                    ContentDuplicateGroup.detected_at >= today_start,
                ).count(),
            },
        }
    )


@api.post("/content-pool/channels")
def create_content_channel():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    username = (payload.get("username") or "").strip()
    telegram_channel_id = (payload.get("telegram_channel_id") or username or f"local-{uuid4().hex[:8]}").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400
    channel = SponsorChannel(
        tenant_id=tenant_id(),
        name=name,
        username=username or None,
        telegram_channel_id=telegram_channel_id,
    )
    db.session.add(channel)
    db.session.flush()
    folder = ContentFolder(tenant_id=tenant_id(), sponsor_channel_id=channel.id, name=name)
    db.session.add(folder)
    db.session.commit()
    return jsonify(folder_to_dict(folder)), 201


@api.post("/content-pool/items")
def ingest_content_item():
    payload = request.get_json(silent=True) or {}
    folder_id = payload.get("folder_id")
    folder_name = payload.get("folder")
    folder = None
    if folder_id:
        folder = ContentFolder.query.filter_by(tenant_id=tenant_id(), id=folder_id).first()
    if folder is None and folder_name:
        folder = ContentFolder.query.filter_by(tenant_id=tenant_id(), name=folder_name).first()
    if folder is None:
        return jsonify({"error": "folder not found"}), 404
    item = store_content_item(folder, payload)
    return jsonify(item_to_dict(item)), 201


@api.post("/content-pool/simulate")
def simulate_content_pool():
    folders = ContentFolder.query.filter_by(tenant_id=tenant_id()).order_by(ContentFolder.name.asc()).all()
    if not folders:
        ensure_demo_data()
        folders = ContentFolder.query.filter_by(tenant_id=tenant_id()).order_by(ContentFolder.name.asc()).all()
    folder = folders[0]
    samples = [
        {"folder_id": folder.id, "title": "Gunun ozel yatirim bonusu aktif", "content": "Bugune ozel yatirim bonusu aktif.", "media_type": "text"},
        {"folder_id": folder.id, "title": "Günün özel yatırım bonusu aktif", "content": "Bugüne özel yatırım bonusu aktif.", "media_type": "text"},
        {"folder_id": folder.id, "title": "https://example.com/bonus", "content": "https://example.com/bonus", "media_type": "text"},
        {"folder_id": folder.id, "title": "Sticker post", "content": "", "media_type": "sticker"},
    ]
    item = store_content_item(folder, samples[int(datetime.utcnow().timestamp()) % len(samples)])
    return jsonify(item_to_dict(item)), 201


@api.get("/content-pool/rules")
def content_pool_rules():
    return jsonify(
        {
            "folder_strategy": "sponsor_channel_name",
            "exclude_media_types": ["link_only", "sticker"],
            "duplicate_detection": {
                "scope": "same_folder_same_day",
                "title_normalization": True,
                "message_similarity_threshold": 80,
            },
        }
    )


@api.delete("/content-pool/duplicates/<group_id>")
def delete_duplicate_group(group_id):
    group = ContentDuplicateGroup.query.filter_by(tenant_id=tenant_id(), id=group_id).first()
    if group is None:
        return jsonify({"error": "duplicate group not found"}), 404
    deleted = ContentPoolItem.query.filter_by(
        tenant_id=tenant_id(),
        folder_id=group.folder_id,
        duplicate_group_key=group.group_key,
        status="duplicate",
    ).delete(synchronize_session=False)
    db.session.delete(group)
    db.session.commit()
    return jsonify({"status": "deleted", "deleted_items": deleted})
