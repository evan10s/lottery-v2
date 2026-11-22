from lottery import consumers
from django.urls import re_path

websocket_urlpatterns = [
    re_path(r"^kiosk/(?P<kiosk_id>[0-9]+)$", consumers.KioskConsumer.as_asgi()),
]
