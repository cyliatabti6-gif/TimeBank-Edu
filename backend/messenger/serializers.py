from django.contrib.auth import get_user_model
from rest_framework import serializers

from messenger.models import Conversation, Message

User = get_user_model()


class UserBriefSerializer(serializers.ModelSerializer):
    """Même logique que UserLectureSerializer : URL absolue si fichier présent."""

    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "name", "email", "avatar")

    def get_avatar(self, obj):
        f = getattr(obj, "avatar", None)
        if not f or not getattr(f, "name", None):
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(f.url)
        return f.url


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ("id", "conversation", "sender_id", "text", "timestamp", "is_read")
        read_only_fields = ("id", "conversation", "sender_id", "timestamp", "is_read")


class ConversationListSerializer(serializers.ModelSerializer):
    participants = UserBriefSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ("id", "participants", "created_at", "last_message")

    def get_last_message(self, obj):
        m = obj.messages.order_by("-timestamp", "-id").first()
        if not m:
            return None
        return {
            "id": m.id,
            "text": m.text[:200],
            "sender_id": m.sender_id,
            "timestamp": m.timestamp.isoformat(),
        }


class ConversationCreateSerializer(serializers.Serializer):
    """Create or return existing 1-to-1 conversation."""

    other_user_id = serializers.IntegerField(min_value=1)

    def validate_other_user_id(self, value):
        request = self.context["request"]
        if value == request.user.pk:
            raise serializers.ValidationError("Cannot start a conversation with yourself.")
        if not User.objects.filter(pk=value).exists():
            raise serializers.ValidationError("User does not exist.")
        return value
