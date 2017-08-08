from django.conf.urls import url
from django.contrib import admin
from django.contrib import auth
from . import views
urlpatterns = [
    url(r'^drawings$', views.DrawingsView.as_view(), name='drawings'),
    url(r'^drawings/(?P<pk>[0-9]+)$',views.DrawingParticipantDashboard.as_view(),name="drawing_dashboard"),
    url(r'^api/kiosk/tickets/add/(?P<username>[a-zA-Z0-9]+)$', views.create_ticket,name="submit_ticket"),
    url(r'^drawing/alltickets$',views.getTicketsMatchingLottery,name="drawing_all_tickets"),
    url(r'^manage$',views.AdminDashboard.as_view(),name="manage"),
    url(r'^manage/(?P<drawing_id>[0-9]+)$',views.LotteryAdmin.as_view(),name="manage_drawing"),
    url(r'^manage/(?P<drawing_id>[0-9]+)/barcodes$',views.generateBarcodeSetup,name="manage_drawing_barcodes"),
    url(r'^manage/(?P<drawing_id>[0-9]+)/barcodes/generate/r/(?P<num_regular>[0-9]+)/a/(?P<num_admin>[0-9]+)$',views.generateBarcodes,name="manage_drawing_display_generated_barcodes"),
    url(r'^api/manage/results/generate$',views.generateResultsForDrawing,name="generate_results"),
    url(r'^api/manage/results/(?P<drawing_id>[0-9]+)/check$',views.checkIfDrawingHasResults,name="check_for_results"),
    url(r'^api/kiosk/provision$',views.provisionKiosk,name="provision_kiosk"),
    url(r'^api/kiosk/saveName$',views.saveName,name="save_name"),
    url(r'^api/kiosk/(?P<username>[a-zA-Z0-9]+)/checkForName$',views.checkForName,name="check_for_name"),
    url(r'^api/kiosk/validateBarcode/(?P<barcode>[a-zA-Z0-9]+)$',views.validateBarcode,name="validateBarcode"),
    url(r'^kiosk/view/(?P<kiosk_id>[0-9]+)$',views.Kiosk.as_view(),name="kiosk"),
    url(r'^api/kiosk/(?P<username>[a-zA-Z0-9]+)/recentTickets/(?P<num>[0-9]+)$',views.getRecentTickets,name="get_recent_tickets_kiosk"),

]
