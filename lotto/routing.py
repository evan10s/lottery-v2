# In routing.py
from channels.routing import route
from lottery.consumers import ws_message, ws_disconnect, ws_connect_kiosk
channel_routing = [
    route("websocket.connect", ws_connect_kiosk,path=r'^/kiosk/(?P<kiosk_id>[0-9]+)$'),
    route("websocket.receive", ws_message,path=r'^/kiosk/(?P<kiosk_id>[0-9]+)$'),
    route("websocket.disconnect", ws_disconnect,path=r"^/kiosk/(?P<kiosk_id>[0-9]+)$"),
]
