from django.conf.urls import url
from django.contrib import admin
from django.contrib import auth
from . import views
urlpatterns = [
    url(r'^drawings$', views.DrawingsView.as_view(), name='drawings'),
    url(r'^drawings/(?P<pk>[0-9]+)$',views.DrawingParticipantDashboard.as_view(),name="drawing_dashboard"),
    url(r'^tickets/add$', views.create_ticket,name="submit_ticket"),
    url(r'^drawing/alltickets$',views.getTicketsMatchingLottery,name="drawing_all_tickets"),
    url(r'^manage$',views.AdminDashboard.as_view(),name="manage"),
    url(r'^manage/(?P<drawing_id>[0-9]+)$',views.LotteryAdmin.as_view(),name="manage_drawing"),
    url(r'^api/manage/results/generate$',views.generateResultsForDrawing,name="generate_results"),
    url(r'^api/manage/results/(?P<drawing_id>[0-9]+)/check$',views.checkIfDrawingHasResults,name="check_for_results"),
    url(r'^api/kiosk/provision$',views.provisionKiosk,name="provision_kiosk"),
    url(r'^kiosk/view/(?P<kiosk_id>[0-9]+)$',views.Kiosk.as_view(),name="kiosk"),

]
