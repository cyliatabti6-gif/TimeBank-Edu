import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone

from messenger.constants import MAX_MESSAGE_LENGTH
from messenger.models import Conversation, Message
from messenger.permissions import user_is_conversation_participant

logger = logging.getLogger(__name__)


@database_sync_to_async
def _get_conversation(cid: int):
    try:
        return Conversation.objects.get(pk=cid)
    except Conversation.DoesNotExist:
        return None


@database_sync_to_async
def _create_message(conv: Conversation, user, text: str) -> Message:
    return Message.objects.create(conversation=conv, sender=user, text=text)


@database_sync_to_async
def _mark_message_read(message_id: int, reader_id: int) -> bool:
    try:
        m = Message.objects.select_related("conversation", "sender").get(pk=message_id)
    except Message.DoesNotExist:
        return False
    if m.sender_id == reader_id:
        return True
    if not m.conversation.participants.filter(pk=reader_id).exists():
        return False
    if not m.is_read:
        m.is_read = True
        m.save(update_fields=["is_read"])
    return True


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = int(self.scope["url_route"]["kwargs"]["conversation_id"])
        user = self.scope["user"]
        if isinstance(user, AnonymousUser):
            logger.warning("chat: connect rejected anonymous conversation_id=%s", self.conversation_id)
            await self.close(code=4401)
            return

        conv = await _get_conversation(self.conversation_id)
        if conv is None:
            await self.close(code=4404)
            return
        if not await database_sync_to_async(user_is_conversation_participant)(user, conv):
            logger.warning(
                "chat: connect rejected user_id=%s conversation_id=%s",
                user.pk,
                self.conversation_id,
            )
            await self.close(code=4403)
            return

        self.user_id = user.pk
        self.group_name = f"chat_{self.conversation_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info("chat: connect user_id=%s conversation_id=%s", self.user_id, self.conversation_id)

    async def disconnect(self, close_code):
        if getattr(self, "group_name", None):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        logger.info(
            "chat: disconnect user_id=%s conversation_id=%s code=%s",
            getattr(self, "user_id", None),
            getattr(self, "conversation_id", None),
            close_code,
        )

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return
        user = self.scope["user"]
        if isinstance(user, AnonymousUser):
            return
        try:
            payload = json.loads(text_data)
        except json.JSONDecodeError:
            return
        if not isinstance(payload, dict):
            return
        ptype = payload.get("type")
        if ptype == "message":
            await self._handle_message(payload)
        elif ptype == "typing":
            await self._handle_typing()
        elif ptype == "read":
            await self._handle_read(payload)

    async def _handle_message(self, payload):
        text = (payload.get("text") or "").strip()
        temp_id = payload.get("temp_id")
        if not text or len(text) > MAX_MESSAGE_LENGTH:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "error",
                        "code": "invalid_message",
                        "detail": "Message must be non-empty and within max length.",
                    }
                ),
            )
            return

        conv = await _get_conversation(self.conversation_id)
        if conv is None:
            return
        user = self.scope["user"]
        if not await database_sync_to_async(user_is_conversation_participant)(user, conv):
            return

        msg = await _create_message(conv, user, text)
        ts = msg.timestamp
        if timezone.is_naive(ts):
            ts_s = timezone.make_aware(ts, timezone.get_current_timezone()).isoformat()
        else:
            ts_s = ts.isoformat()

        ack = {"type": "message_ack", "message_id": msg.id}
        if temp_id is not None:
            ack["temp_id"] = str(temp_id)
        await self.send(text_data=json.dumps(ack))

        out = {
            "type": "message",
            "message_id": msg.id,
            "conversation_id": self.conversation_id,
            "sender_id": user.pk,
            "text": msg.text,
            "timestamp": ts_s,
        }
        await self.channel_layer.group_send(
            self.group_name,
            {"type": "chat_event", "payload": out},
        )

    async def _handle_typing(self):
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat_event",
                "payload": {"type": "typing", "user_id": self.user_id},
            },
        )

    async def _handle_read(self, payload):
        mid = payload.get("message_id")
        if mid is None:
            return
        try:
            mid = int(mid)
        except (TypeError, ValueError):
            return
        ok = await _mark_message_read(mid, self.user_id)
        if not ok:
            return
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat_event",
                "payload": {"type": "read", "message_id": mid, "user_id": self.user_id},
            },
        )

    async def chat_event(self, event):
        await self.send(text_data=json.dumps(event["payload"]))
