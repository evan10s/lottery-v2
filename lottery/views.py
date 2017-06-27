from django.shortcuts import render
from django.http import HttpResponse
from django.views import generic
from django.contrib.auth.mixins import UserPassesTestMixin,LoginRequiredMixin
from django.views.generic import TemplateView
import json,datetime
from .models import Drawing, Ticket,Number
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
        return not self.request.user.is_anonymous

    def get_queryset(self):
        return Ticket.objects.filter(submitted_by=self.request.user).order_by("-timestamp")[:5]

class AdminDashboard(UserPassesTestMixin,TemplateView):
    template_name = 'lottery/admin_dashboard.html'
    context_object_name = 'adm'
    login_url = '/login'
    def test_func(self):
            try:
                isStaff = self.request.user.is_staff
            except:
                isStaff = False
            return isStaff

def create_ticket(request):
    print("called")
    if request.method == "POST" and request.user.is_authenticated:

        one_hour_ago = datetime.datetime.now() - datetime.timedelta(hours=1) # Getting time one hour prior to now from https://stackoverflow.com/questions/7582333/python-get-datetime-of-last-hour
        num_tickets_last_hr = len(Ticket.objects.filter(submitted_by=request.user,
                                                    timestamp__gte=one_hour_ago));

        print("num_tickets_last_hr =",str(num_tickets_last_hr))
        if num_tickets_last_hr > 30:
            return HttpResponse(json.dumps({ 'state':'error','status': "You've submitted too many tickets in the last hour.  Please wait 60 minutes before submitting more tickets." }),content_type="application/json");


        print(request.POST['nums'])
        nums = request.POST['nums']

        split_nums = nums.split(",")

        print(split_nums);
        distinct_split_nums = list(set(map(lambda x: int(x.strip()),split_nums))) # Remove duplicate numbers after trimming spaces and converting to ints.  After this, there should only be 4 distinct numbers; this method for removing duplicates is from https://stackoverflow.com/questions/7961363/removing-duplicates-in-lists

        numbers_added = []

        if len(distinct_split_nums) <= 4 and len(distinct_split_nums) > 0:
            t = Ticket(submitted_by=request.user,timestamp=datetime.datetime.now())
            t.save()
            for num in distinct_split_nums:
                if num >= 1 and num <= 36: # Numbers must be between 1 and 36
                    num_obj = Number(value=num)
                    num_obj.assoc_ticket = t
                    num_obj.save()
                    numbers_added.append(num)
            print(t.pk,t.timestamp)
        else:
            return HttpResponse(json.dumps({ 'state':'error','status': "Ticket can't be submitted because it has more than 4 numbers" }),content_type="application/json");

        # Resources used in converting timestamp to a string:
        # https://stackoverflow.com/questions/10624937/convert-datetime-object-to-a-string-of-date-only-in-python
        # https://docs.python.org/3/library/datetime.html#strftime-strptime-behavior
        # https://docs.python.org/2/library/string.html
        # This longer method is used to ensure that when the JS on the page updates the table outside of Django's template renderer, the date looks like the dates outputted by the Django template renderer
        if t.timestamp.hour >= 12:
            timestamp_ampm = 'p.m.'
        else:
            timestamp_ampm = 'a.m.'

        timestamp_str = ("{} {}".format(t.timestamp.strftime('%B %#d, %Y, %I:%M'),timestamp_ampm))

        numbers_added.sort();

        result_obj = {      'state': "success",
                            'status': "Ticket submitted successfully",
                             'nums':str(numbers_added)[1:(len(str(numbers_added))-1)],
                             'id':t.pk,
                             'timestamp': timestamp_str }
        return HttpResponse(json.dumps(result_obj),content_type="application/json"); # StackOverflow for sending an object as the HttpResponse data: https://stackoverflow.com/questions/21879729/returning-python-object-in-httpresponse
