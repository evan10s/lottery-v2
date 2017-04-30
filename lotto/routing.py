# In routing.py
from channels.routing import route
from lottery.consumers import ws_message, ws_add, ws_disconnect
channel_routing = [
    route("websocket.connect", ws_add),
    route("websocket.receive", ws_message),
    route("websocket.disconnect", ws_disconnect),
]
