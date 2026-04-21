from django.contrib.auth import get_user_model
from django.db.models import Count, DateTimeField, F, Max
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from messenger.models import Conversation, Message
from messenger.permissions import user_is_conversation_participant
from messenger.serializers import (
    ConversationCreateSerializer,
    ConversationListSerializer,
    MessageSerializer,
    UserBriefSerializer,
)

User = get_user_model()


class MessagePagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 100


class MessengerUserListView(APIView):
    """All platform users except the current user (for messenger sidebar)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = User.objects.exclude(pk=request.user.pk).order_by("name", "email")
        return Response(UserBriefSerializer(qs, many=True, context={"request": request}).data)


class ConversationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            Conversation.objects.filter(participants=request.user)
            .annotate(_last_ts=Max("messages__timestamp"))
            .annotate(
                _sort=Coalesce(F("_last_ts"), F("created_at"), output_field=DateTimeField()),
            )
            .order_by("-_sort", "-id")
        )
        ser = ConversationListSerializer(qs, many=True, context={"request": request})
        return Response(ser.data)

    def post(self, request):
        ser = ConversationCreateSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        other_id = ser.validated_data["other_user_id"]
        me = request.user

        dup = (
            Conversation.objects.annotate(pc=Count("participants", distinct=True))
            .filter(pc=2, participants=me, participants__id=other_id)
            .distinct()
            .first()
        )
        if dup:
            return Response(
                ConversationListSerializer(dup, context={"request": request}).data,
                status=status.HTTP_200_OK,
            )

        conv = Conversation.objects.create()
        conv.participants.add(me.pk, other_id)
        return Response(
            ConversationListSerializer(conv, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class MessageHistoryView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer
    pagination_class = MessagePagination

    def get_queryset(self):
        cid = self.kwargs["conversation_id"]
        conv = get_object_or_404(Conversation, pk=cid)
        if not user_is_conversation_participant(self.request.user, conv):
            return Message.objects.none()
        return Message.objects.filter(conversation_id=cid).order_by("-timestamp", "-id")

    def list(self, request, *args, **kwargs):
        cid = kwargs["conversation_id"]
        conv = get_object_or_404(Conversation, pk=cid)
        if not user_is_conversation_participant(request.user, conv):
            return Response({"detail": "Not a participant."}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *args, **kwargs)
