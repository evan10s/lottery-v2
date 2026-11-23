"""
ASGI config for lotto project
"""

import os
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application

from .routing import websocket_urlpatterns
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "lotto.settings")

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": URLRouter(websocket_urlpatterns) # This is where auth can be added around establishing websocket connections. For instance, in the future it might be good to require an API key here
})
