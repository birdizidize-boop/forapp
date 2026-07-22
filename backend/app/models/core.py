from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db


class TenantMixin:
    tenant_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Bot(db.Model, TenantMixin):
    __tablename__ = "bots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    username: Mapped[str] = mapped_column(String(120), nullable=False)
    category: Mapped[str | None] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(40), default="online")
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Flow(db.Model, TenantMixin):
    __tablename__ = "flows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    bot_id: Mapped[str] = mapped_column(ForeignKey("bots.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="draft")
    bot = relationship("Bot")


class FlowNode(db.Model, TenantMixin):
    __tablename__ = "nodes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    flow_id: Mapped[str] = mapped_column(ForeignKey("flows.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(80), nullable=False)
    label: Mapped[str] = mapped_column(String(160), nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    flow = relationship("Flow")


class FlowEdge(db.Model, TenantMixin):
    __tablename__ = "edges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    flow_id: Mapped[str] = mapped_column(ForeignKey("flows.id"), nullable=False)
    source_node_id: Mapped[str] = mapped_column(ForeignKey("nodes.id"), nullable=False)
    target_node_id: Mapped[str] = mapped_column(ForeignKey("nodes.id"), nullable=False)
    condition: Mapped[str | None] = mapped_column(String(255))


class Campaign(db.Model, TenantMixin):
    __tablename__ = "campaigns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    bot_id: Mapped[str | None] = mapped_column(ForeignKey("bots.id"))
    flow_id: Mapped[str | None] = mapped_column(ForeignKey("flows.id"))
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    audience: Mapped[str] = mapped_column(String(180), default="all")
    mode: Mapped[str] = mapped_column(String(40), default="test")
    status: Mapped[str] = mapped_column(String(40), default="draft")
    title: Mapped[str] = mapped_column(String(180), default="FORAGRAMM duyuru")
    message: Mapped[str] = mapped_column(Text, default="")
    buttons: Mapped[list] = mapped_column(JSON, default=list)
    filters: Mapped[dict] = mapped_column(JSON, default=dict)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime)
    sent_count: Mapped[int] = mapped_column(Integer, default=0)
    clicked_count: Mapped[int] = mapped_column(Integer, default=0)
    completed_count: Mapped[int] = mapped_column(Integer, default=0)
    last_sent_at: Mapped[datetime | None] = mapped_column(DateTime)
    bot = relationship("Bot")
    flow = relationship("Flow")


class UserProfile(db.Model, TenantMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    fora_user_id: Mapped[str] = mapped_column(
        String(40),
        index=True,
        unique=True,
        default=lambda: f"FGM-{uuid4().hex[:12].upper()}",
    )
    telegram_id: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    username: Mapped[str | None] = mapped_column(String(120))
    first_name: Mapped[str | None] = mapped_column(String(120))
    last_name: Mapped[str | None] = mapped_column(String(120))
    language: Mapped[str | None] = mapped_column(String(12))
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    first_seen_bot_id: Mapped[str | None] = mapped_column(ForeignKey("bots.id"))
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    phone: Mapped[str | None] = mapped_column(String(40))
    variables: Mapped[dict] = mapped_column(JSON, default=dict)
    notes: Mapped[str | None] = mapped_column(Text)
    first_seen_bot = relationship("Bot")


class Subscription(db.Model, TenantMixin):
    __tablename__ = "subscriptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    subscriber_uid: Mapped[str] = mapped_column(
        String(48),
        index=True,
        unique=True,
        default=lambda: f"SUB-{uuid4().hex[:14].upper()}",
    )
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    bot_id: Mapped[str] = mapped_column(ForeignKey("bots.id"), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(40), default="active")
    last_action_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    user = relationship("UserProfile")
    bot = relationship("Bot")


class TelegramActionEvent(db.Model, TenantMixin):
    __tablename__ = "telegram_action_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    bot_id: Mapped[str] = mapped_column(ForeignKey("bots.id"), nullable=False)
    subscription_id: Mapped[str | None] = mapped_column(ForeignKey("subscriptions.id"))
    telegram_update_id: Mapped[str | None] = mapped_column(String(120), index=True)
    action_type: Mapped[str] = mapped_column(String(60), nullable=False)
    command: Mapped[str | None] = mapped_column(String(120))
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    user = relationship("UserProfile")
    bot = relationship("Bot")
    subscription = relationship("Subscription")


class Post(db.Model, TenantMixin):
    __tablename__ = "posts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    bot_id: Mapped[str] = mapped_column(ForeignKey("bots.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    image: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    bot = relationship("Bot")


class Notification(db.Model, TenantMixin):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    post_id: Mapped[str] = mapped_column(ForeignKey("posts.id"), nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(40), default="queued")
    user = relationship("UserProfile")
    post = relationship("Post")


class Analytics(db.Model, TenantMixin):
    __tablename__ = "analytics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    bot_id: Mapped[str] = mapped_column(ForeignKey("bots.id"), nullable=False)
    views: Mapped[int] = mapped_column(Integer, default=0)
    clicks: Mapped[int] = mapped_column(Integer, default=0)
    joins: Mapped[int] = mapped_column(Integer, default=0)
    deposits: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    bot = relationship("Bot")


class SponsorChannel(db.Model, TenantMixin):
    __tablename__ = "sponsor_channels"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    telegram_channel_id: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    username: Mapped[str | None] = mapped_column(String(120))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class ContentFolder(db.Model, TenantMixin):
    __tablename__ = "content_folders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    sponsor_channel_id: Mapped[str] = mapped_column(ForeignKey("sponsor_channels.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    sponsor_channel = relationship("SponsorChannel")


class ContentPoolItem(db.Model, TenantMixin):
    __tablename__ = "content_pool_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    folder_id: Mapped[str] = mapped_column(ForeignKey("content_folders.id"), nullable=False)
    source_message_id: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    normalized_title: Mapped[str] = mapped_column(String(220), index=True, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    media_type: Mapped[str] = mapped_column(String(40), default="text")
    status: Mapped[str] = mapped_column(String(40), default="stored")
    excluded_reason: Mapped[str | None] = mapped_column(String(80))
    duplicate_group_key: Mapped[str | None] = mapped_column(String(160), index=True)
    similarity_score: Mapped[int] = mapped_column(Integer, default=0)
    received_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    folder = relationship("ContentFolder")


class ContentDuplicateGroup(db.Model, TenantMixin):
    __tablename__ = "content_duplicate_groups"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    folder_id: Mapped[str] = mapped_column(ForeignKey("content_folders.id"), nullable=False)
    group_key: Mapped[str] = mapped_column(String(160), index=True, nullable=False)
    canonical_title: Mapped[str] = mapped_column(String(220), nullable=False)
    item_count: Mapped[int] = mapped_column(Integer, default=1)
    max_similarity_score: Mapped[int] = mapped_column(Integer, default=0)
    detected_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    folder = relationship("ContentFolder")
