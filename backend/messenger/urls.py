from django.urls import path

from messenger.views import ConversationListCreateView, MessageHistoryView, MessengerUserListView

urlpatterns = [
    path("messenger-users/", MessengerUserListView.as_view(), name="messenger-users"),
    path("conversations/", ConversationListCreateView.as_view(), name="messenger-conversations"),
    path(
        "messages/<int:conversation_id>/",
        MessageHistoryView.as_view(),
        name="messenger-messages",
    ),
]
