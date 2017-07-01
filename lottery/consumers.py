from django.http import HttpResponse
from channels.handler import AsgiHandler
from channels import Group
from channels.sessions import channel_session
from channels.auth import channel_session_user, channel_session_user_from_http
from channels.security.websockets import allowed_hosts_only

@channel_session_user
def ws_message(message, kiosk_id):
    print(kiosk_id)
    Group("scan-%s" % kiosk_id).send({
        "text": message['text'],
    })

# Connected to websocket.disconnect
@channel_session
def ws_disconnect(message, kiosk_id):
    print(kiosk_id)
    Group("scan-%s" % kiosk_id).discard(message.reply_channel)

# # Connected to websocket.connect
# @allowed_hosts_only
# @channel_session_user_from_http
# def ws_add(message):
#     # Accept connection
#     message.reply_channel.send({"accept": True})
#     # Add them to the right group
#     Group("scan-%s" % message.user.username[0]).add(message.reply_channel)

# Connected to websocket.connect
@allowed_hosts_only
@channel_session_user_from_http
def ws_connect_kiosk(message, kiosk_id):
    print(kiosk_id)
    # Accept connection
    message.reply_channel.send({"accept": True})
    # Add them to the right group
    Group("scan-%s" % kiosk_id).add(message.reply_channel)
