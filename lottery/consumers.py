import json

from asgiref.sync import async_to_sync
from channels.generic.websocket import JsonWebsocketConsumer


class KioskConsumer(JsonWebsocketConsumer):
    def connect(self):
        print("Connection attempt")

        self.kiosk_id = self.scope["url_route"]["kwargs"]["kiosk_id"]
        self.room_group_name = f"scan-{self.kiosk_id}"

        # Add to room group
        async_to_sync(self.channel_layer.group_add)(
            self.room_group_name, self.channel_name
        )


        self.accept()

    def disconnect(self, close_code):
        # Leave room group
        async_to_sync(self.channel_layer.group_discard)(
            self.room_group_name, self.channel_name
        )

    def receive_json(self, content):
        """Receive message from WebSocket"""
        print(f"Received message: {content}")
        # Send message to room group
        async_to_sync(self.channel_layer.group_send)(
            self.room_group_name, {"type": "chat.message", "message": content}
        )

    def chat_message(self, event):
        """Receive message from room group"""
        message = event["message"]

        self.send_json(message)

# #@channel_session_user
# #@channel_session
# def ws_message(message, kiosk_id):
#     #print(kiosk_id)
#     Group("scan-%s" % kiosk_id).send({
#         "text": message['text'],
#     })

# # Connected to websocket.disconnect
# #@channel_session
# def ws_disconnect(message, kiosk_id):
#     #print(kiosk_id)
#     Group("scan-%s" % kiosk_id).discard(message.reply_channel)

# # # Connected to websocket.connect
# # @allowed_hosts_only
# # @channel_session_user_from_http
# # def ws_add(message):
# #     # Accept connection
# #     message.reply_channel.send({"accept": True})
# #     # Add them to the right group
# #     Group("scan-%s" % message.user.username[0]).add(message.reply_channel)

# # Connected to websocket.connect
# #@allowed_hosts_only
# #@channel_session_user_from_http
# @channel_session
# def ws_connect_kiosk(message, kiosk_id):
#     print(kiosk_id)
#     print("connecting")
#     # Accept connection
#     message.reply_channel.send({"accept": True})
#     # Add them to the right group
#     Group("scan-%s" % kiosk_id).add(message.reply_channel)
