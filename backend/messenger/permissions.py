from django.contrib.auth.models import AnonymousUser


def user_is_conversation_participant(user, conversation) -> bool:
    if isinstance(user, AnonymousUser) or not user.is_authenticated:
        return False
    return conversation.participants.filter(pk=user.pk).exists()
