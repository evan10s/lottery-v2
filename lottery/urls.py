from django.conf.urls import url
from django.contrib import admin
from django.contrib import auth
from . import views
urlpatterns = [
    url(r'^drawings$', views.DrawingsView.as_view(), name='drawings'),
    url(r'^drawings/(?P<pk>[0-9]+)$',views.DrawingParticipantDashboard.as_view(),name="drawing_dashboard"),
    url(r'^tickets/add$', views.create_ticket,name="submit_ticket"),
    url(r'^manage$',views.AdminDashboard.as_view(),name="admin_dashboard"),
]
