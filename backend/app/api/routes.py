from flask import Blueprint, jsonify, request

api = Blueprint("api", __name__)


@api.get("/health")
def health():
    return jsonify({"status": "ok", "service": "fora-cmp-api"})


@api.get("/dashboard")
def dashboard():
    return jsonify(
        {
            "active_users": 18420,
            "active_conversations": 1284,
            "daily_messages": 96310,
            "completed_flows": 7842,
            "average_conversation_seconds": 168,
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
    return jsonify(
        {
            "connected_bots": 3,
            "active_campaigns": 7,
            "queued_notifications": 214,
            "views": 184200,
            "clicks": 28640,
            "joins": 6210,
            "deposits": 842,
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
    update = request.get_json(silent=True) or {}
    message = update.get("message") or update.get("callback_query", {}).get("message") or {}
    text = message.get("text", "")
    action_type = "start_command" if text.startswith("/start") else "telegram_update"
    if "callback_query" in update:
        action_type = "callback_query"

    return jsonify(
        {
            "status": "accepted",
            "bot_id": bot_id,
            "action_type": action_type,
            "identity_pipeline": [
                "extract telegram user",
                "upsert users by telegram_id",
                "assign fora_user_id if new",
                "upsert subscriptions by user_id + bot_id",
                "write telegram_action_events row",
            ],
        }
    ), 202


@api.get("/content-pool/overview")
def content_pool_overview():
    return jsonify(
        {
            "folders": [
                {"name": "Damabet", "channel": "@damabetresmi", "total_posts": 42, "today_posts": 8, "duplicates": 3},
                {"name": "Betoffice", "channel": "@betofficevip", "total_posts": 28, "today_posts": 4, "duplicates": 1},
                {"name": "Maxwin", "channel": "@maxwinbonus", "total_posts": 31, "today_posts": 6, "duplicates": 2},
            ],
            "today": {
                "incoming": 20,
                "stored": 14,
                "excluded_links": 4,
                "excluded_stickers": 2,
                "duplicate_groups": 3,
            },
        }
    )


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
