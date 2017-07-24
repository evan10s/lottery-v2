from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.views import generic
from django.contrib.auth.mixins import UserPassesTestMixin,LoginRequiredMixin
from django.views.generic import TemplateView
from django import forms
import json,datetime
from .models import Drawing, Ticket,Number, Results
from django.contrib.auth.models import User, Group # need to import Group from https://stackoverflow.com/a/6288863/5434744
import random
from django.contrib.auth import authenticate, login, logout
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

    def get_context_data(self):
        context = super(DrawingParticipantDashboard, self).get_context_data(**self.kwargs) #getting kwargs to be a template variable from https://stackoverflow.com/a/18233104
        return context;
    def get_queryset(self):
        self.pk = int(self.kwargs['pk'])
        print(self.kwargs['pk'],"hi, this is pk")
        return Ticket.objects.filter(submitted_by=self.request.user).order_by("-timestamp")[:5]

class AdminDashboard(UserPassesTestMixin,generic.ListView):
    template_name = 'lottery/admin_dashboard.html'
    context_object_name = 'drawings'
    login_url = '/login'
    def test_func(self):
            try:
                isStaff = self.request.user.is_staff
            except:
                isStaff = False
            return isStaff
    def get_queryset(self):
        return Drawing.objects.order_by('-end_date')[:5];


class LotteryAdmin(UserPassesTestMixin,generic.ListView):
    template_name = 'lottery/manageLottery.html'
    context_object_name = 'tickets'
    login_url = '/login'
    def test_func(self):
            try:
                isStaff = self.request.user.is_staff
            except:
                isStaff = False
            return isStaff
    def get_context_data(self):
        context = super(LotteryAdmin, self).get_context_data(**self.kwargs) #getting kwargs to be a template variable from https://stackoverflow.com/a/18233104
        return context;

    def get_queryset(self):
        drawing_id = int(self.kwargs['drawing_id'])
        drawing = Drawing.objects.filter(pk=drawing_id)[0]
        start = drawing.start_date
        end = drawing.end_date
        print(start,end)
        return Ticket.objects.filter(timestamp__gte=start,timestamp__lte=end)

def create_ticket(request, username):
    print("called")
    if request.method == "POST" and userIsKiosk(request.user):
        try:
            actual_user = User.objects.get(username=username)
        except:
            return HttpResponse(json.dumps({ 'state': 'error',
                                             'status': 'User not found'
                                             }))

        one_hour_ago = datetime.datetime.now() - datetime.timedelta(hours=1) # Getting time one hour prior to now from https://stackoverflow.com/questions/7582333/python-get-datetime-of-last-hour
        num_tickets_last_hr = len(Ticket.objects.filter(submitted_by=actual_user,
                                                    timestamp__gte=one_hour_ago));

        print("num_tickets_last_hr =",str(num_tickets_last_hr))
        if num_tickets_last_hr > 30:
            return HttpResponse(json.dumps({ 'state':'error','error_short_desc':"TICKET_RATE_LIMIT_EXCEEDED",'status': "You've submitted too many tickets in the last hour.  Please wait 60 minutes before submitting more tickets." }),content_type="application/json");


        print(request.POST['nums'])
        nums = request.POST['nums']

        if len(nums) == 0:
            return HttpResponse(json.dumps({ 'state':'error','status': "Select 4 numbers before submitting a ticket!" }),content_type="application/json")

        split_nums = nums.split(",")

        print(split_nums);
        distinct_split_nums = list(set(map(lambda x: int(x.strip()),split_nums))) # Remove duplicate numbers after trimming spaces and converting to ints.  After this, there should only be 4 distinct numbers; this method for removing duplicates is from https://stackoverflow.com/questions/7961363/removing-duplicates-in-lists

        distinct_split_nums.sort();
        numbers_added = []

        if len(distinct_split_nums) <= 4 and len(distinct_split_nums) > 0:
            t = Ticket(submitted_by=actual_user,timestamp=datetime.datetime.now())
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

def getTicketsMatchingLottery(request):
    if request.method == "POST" and request.user.is_staff:
        try:
            drawing_id = int(request.POST['drawing_id'])
        except:
            return HttpResponse("Bad drawing id")

        drawing = Drawing.objects.filter(pk=drawing_id)[0]

        #start_time = drawing.start_time
        #end_time = drawing.end_time
        #print(str(drawing_id));
        #print(str(start_time))
        tickets = Ticket.objects.filter(timestamp__gte=drawing.start_date,timestamp__lte=drawing.end_date)
        print(len(tickets))
        print(tickets[36].number_set.all()[0].value)

        """
        {
            tickets: [
                id: 4,
                user: evan
                numbers: [
                    21,22,23,24
                ]
            ]
        }
        """

        result = {
            'tickets': []
        }

        for t in tickets:
            result['tickets'].append({
                'id': t.pk,
                'user': t.submitted_by.username,
                'numbers': [ n.value for n in t.number_set.all() ]
            })

        print(result)

        return HttpResponse(json.dumps(result),content_type="application/json")

def generateResultsForDrawing(request):
    if request.method == "POST" and request.user.is_staff:
        try:
            drawing_id = int(request.POST['drawing_id'])
        except:
            return HttpResponse("Bad drawing id")

        existing_results = len(Results.objects.filter(drawing_id=drawing_id))
        if existing_results > 0:
            return HttpResponse("Results already made")

        drawing = Drawing.objects.filter(pk=drawing_id)[0]
        tickets = Ticket.objects.filter(timestamp__gte=drawing.start_date,timestamp__lte=drawing.end_date)

        results_users = {}

        drawing_nums = [12,18,24,27]

        for t in tickets:
            u = t.submitted_by.pk
            u_name = t.submitted_by.username
            num_correct = 0

            for n in t.number_set.all():
                if n.value in drawing_nums:
                    num_correct += 1

            current_user_obj = results_users.get(u,False)
            if not current_user_obj:
                results_users[u] = {
                    'id': u,
                    'name': u_name,
                    'num_correct': num_correct,
                    'number_possible': len(drawing_nums),
                    'dq':False
                }
            else:
                current_num_correct = current_user_obj.get('num_correct')
                current_num_possible = current_user_obj.get('number_possible')
                results_users[u]['num_correct'] = current_num_correct + num_correct
                results_users[u]['number_possible'] = current_num_possible + len(drawing_nums)

                print(current_num_correct,current_num_possible)
            print(results_users[u])

        for result in results_users:
            print("result",result)
            user_result_info = results_users[result]
            user = User.objects.filter(pk=user_result_info['id'])[0]
            result = Results(for_user=user,number_correct=user_result_info['num_correct'],
            number_possible=user_result_info['number_possible'],drawing_id=drawing)
            result.save()

        return HttpResponse(json.dumps(results_users),content_type="application/json")

        # A valid Result must have:
        # Drawing id, User, Possible, Correct, Disqualify (t/f)

def checkIfDrawingHasResults(request,drawing_id):
    print(drawing_id,"is drawing_id")

    existing_results = len(Results.objects.filter(drawing_id=drawing_id))

    if not existing_results:
        return HttpResponse("No results")
    return HttpResponse("Results exist");

### KIOSK METHODS
def provisionKiosk(request):
    # Find an unused kiosk user or create a new kiosk user
    # For now, just create a new user
    if request.user.is_staff:
        kiosk_id = random.randint(100000,999999) #Generate a random 6-digit key for the kiosk user
        kiosk_pw = random.randint(10000000000000,99999999999999) #HACK: THIS IS ABSOLUTELY TERRIBLE MAYBE... the kiosk user must have limited permissions: can only add tickets and numbers, cannot touch results, users, groups, or permissions, cannot delete anything
        user = User.objects.create_user(kiosk_id,"",kiosk_pw)

        kiosk_group = Group.objects.get(name="kiosk") #this method for adding a user to a group is from https://stackoverflow.com/a/6288863/5434744 (this line and next)
        kiosk_group.user_set.add(user)

        #this part of the code (autheticating and signing in as the kiosk user, and logging out the current user)
        # is from the Django v1.11 docs - https://docs.djangoproject.com/en/1.11/topics/auth/default/#how-to-log-a-user-in
        # and https://docs.djangoproject.com/en/1.11/topics/auth/default/#django.contrib.auth.logout
        kiosk_user = authenticate(request, username=kiosk_id, password=kiosk_pw)
        if user is not None:
            logout(request)
            login(request, kiosk_user);
            return redirect('/kiosk/view/%d' % kiosk_id)


    return HttpResponse("Hello, World!")


class Kiosk(UserPassesTestMixin,TemplateView):
    template_name = "lottery/kiosk.html"
    context_object_name = "kiosk"
    login_url = '/login'


    def get_context_data(self, **kwargs):
        context = super(Kiosk, self).get_context_data(**kwargs) #getting kwargs to be a template variable from https://stackoverflow.com/a/18233104 and https://stackoverflow.com/a/16110852/5434744
        return context;

    def test_func(self):
        #print("The kiosk id is",self.kwargs['kiosk_id'])
        return self.request.user.groups.filter(name="kiosk").count() >= 1 and self.request.user.username == self.kwargs['kiosk_id']

def userIsKiosk(user):
    return user.groups.filter(name="kiosk").count() >= 1


def saveName(request):
    if request.method == "POST" and userIsKiosk(request.user):
        name = request.POST['name']
        username = request.POST['username']
        if len(name) >= 2 and len(name) <= 200:
            try:
                ref_user = User.objects.get(username=username)
            except:
                return HttpResponse("User does not exist")
            try:
                ref_user.first_name = name
                ref_user.save()
            except:
                HttpResponse("500 Internal Server Error")
            return HttpResponse("200 OK")
        return HttpResponse("Invalid data format")
    return HttpResponse("403 Forbidden")

def checkForName(request, username):
    if request.method == "GET" and userIsKiosk(request.user):
        user = User.objects.get(username=username)
        if user.first_name:
            return HttpResponse("User has name")
        return HttpResponse("User has no name")
    return HttpResponse("403 Forbidden")

def validateBarcode(request, barcode):
    print(len(User.objects.filter(username="ACD1243")),"len filter acd123")
    if request.method == "GET" and userIsKiosk(request.user):
        print("request.user.username",barcode)
        found_users = User.objects.filter(username=barcode)
        if len(found_users) == 1:
            return HttpResponse("User exists")
        return HttpResponse("User not found");
    return HttpResponse("403 Forbidden")

def getRecentTickets(request, username, num):
    if request.method == "GET" and userIsKiosk(request.user):
        actual_user = User.objects.get(username=username)

        try:
            numTks = int(num)
        except:
            HttpResponse("500 Internal Server Error")
        tks = Ticket.objects.filter(submitted_by=actual_user).order_by("-timestamp")[:numTks]


        result = {
            'tickets': []
        }

        print("hey");

        for t in tks:
            result["tickets"].append({
                'id': t.pk,
                'numbers': [ n.value for n in t.number_set.all() ]
            })
        return HttpResponse(json.dumps(result),content_type="application/json")
    return HttpResponse("403 Forbidden");
