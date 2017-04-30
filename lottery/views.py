from django.shortcuts import render
from django.http import HttpResponse
from django.views import generic
from django.contrib.auth.mixins import UserPassesTestMixin,LoginRequiredMixin

from .models import Drawing, Ticket
# Create your views here.
class DrawingsView(generic.ListView):
    template_name = 'lottery/drawings.html'
    context_object_name = 'drawing_list'
    def get_queryset(self):
        return Drawing.objects.order_by('-end_date')[:5]


class DrawingParticipantDashboard(UserPassesTestMixin,generic.ListView):
    template_name = 'lottery/dashboard.html'
    context_object_name = 'drawing_info'
    login_url = '/login'
    def test_func(self):
        try:
            isStaff = self.request.user.is_staff
        except:
            email = False

        return isStaff
    def get_queryset(self):
        return Ticket.objects.filter(submitted_by=self.request.user).order_by("-timestamp")[:5]
