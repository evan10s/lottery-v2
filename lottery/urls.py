from django.urls import path
from django.contrib import admin
from django.contrib import auth
from django.views.generic import RedirectView
from . import views

urlpatterns = [
    path(r'', RedirectView.as_view(pattern_name='drawings', permanent=True)),
    path(r'drawings', views.DrawingsView.as_view(), name='drawings'),
    path(r'drawings/<int:pk>',views.DrawingParticipantDashboard.as_view(),name="drawing_dashboard"),
    path(r'api/kiosk/tickets/add/<str:username>', views.create_ticket,name="submit_ticket"),
    path(r'drawing/alltickets',views.getTicketsMatchingLottery,name="drawing_all_tickets"),
    path(r'manage',views.AdminDashboard.as_view(),name="manage"),
    path(r'manage/<int:drawing_id>',views.LotteryAdmin.as_view(),name="manage_drawing"),
    path(r'manage/<int:drawing_id>/barcodes',views.generateBarcodeSetup,name="manage_drawing_barcodes"),
    path(r'manage/<int:drawing_id>/barcodes/generate/r/<int:num_regular>/a/<int:num_admin>',views.generateBarcodes,name="manage_drawing_display_generated_barcodes"),
    path(r'api/manage/results/generate',views.generateResultsForDrawing,name="generate_results"),
    path(r'api/manage/results/<int:drawing_id>/check',views.checkIfDrawingHasResults,name="check_for_results"),
    path(r'api/kiosk/provision',views.provisionKiosk,name="provision_kiosk"),
    path(r'api/kiosk/saveName',views.saveName,name="save_name"),
    path(r'api/kiosk/<str:username>/checkForName',views.checkForName,name="check_for_name"),
    path(r'api/kiosk/validateBarcode/<str:barcode>',views.validateBarcode,name="validateBarcode"),
    path(r'kiosk/view/<int:kiosk_id>',views.Kiosk.as_view(),name="kiosk"),
    path(r'api/kiosk/<str:username>/recentTickets/<int:num>',views.getRecentTickets,name="get_recent_tickets_kiosk"),
    path(r'api/manage/results/<int:drawing_id>',views.getDrawingResults,name="get_results"),
    path(r'api/kiosk/checkAdmin/<str:barcode>',views.checkBarcodeAdmin,name="checkAdmin"),
    path(r'api/manage/reports/<int:drawing_id>/scores',views.generateScoreReports,name="generate_individual_score_reports"),
    path(r'api/kiosk/scratchoffs/add/<str:username>', views.create_scratchoff, name="submit_scratchoff"),
    path(r'manage/add-paper-tickets', views.addPaperTickets, name="add_paper_tickets"),
    path(r'api/manage/<int:drawing_id>/analytics/lottery/histogram', views.generate_lottery_analytics, name='lottery_analytics')
]
