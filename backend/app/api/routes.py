from __future__ import annotations

import hashlib
import re
from datetime import datetime, timedelta
from difflib import SequenceMatcher
from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request
from sqlalchemy import func

from app.extensions import db
from app.models.core import (
    Analytics,
    Bot,
    ContentDuplicateGroup,
    ContentFolder,
    ContentPoolItem,
    SponsorChannel,
    Subscription,
    TelegramActionEvent,
    UserProfile,
)

api = Blueprint("api", __name__)


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


def bot_to_dict(bot: Bot) -> dict:
    return {
        "id": bot.id,
        "name": bot.name,
        "username": bot.username,
        "category": bot.category,
        "status": bot.status,
        "is_active": bot.is_active,
        "created_at": bot.created_at.isoformat() if bot.created_at else None,
        "webhook_path": f"/api/telegram/webhook/{bot.id}",
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
        status=(payload.get("status") or "online").lower(),
        token_hash=token_hash(token),
        is_active=True,
    )
    db.session.add(bot)
    db.session.commit()
    return jsonify(bot_to_dict(bot)), 201


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
            "active_campaigns": 0,
            "queued_notifications": 0,
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
