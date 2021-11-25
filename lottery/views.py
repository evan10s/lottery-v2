import datetime
import json
import random
import string
from operator import itemgetter

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.mixins import UserPassesTestMixin
from django.contrib.auth.models import User, \
    Group  # need to import Group from https://stackoverflow.com/a/6288863/5434744
from django.db.models import Count  # need to import Count from https://stackoverflow.com/a/6525869/5434744
from django.http import HttpResponse
from django.shortcuts import render, redirect
from django.views import generic
from django.views.generic import TemplateView

from rdoclient import RandomOrgClient

from .models import Drawing, Ticket, Number, Results, Answer, Scratchoff

r = RandomOrgClient(settings.RANDOM_ORG_API_KEY)

# Create your views here.
class DrawingsView(UserPassesTestMixin, generic.ListView):
    template_name = 'lottery/drawings.html'
    context_object_name = 'drawing_list'
    login_url = '/login'

    def get_queryset(self):
        return Drawing.objects.order_by('-end_date')[:5]

    def test_func(self):
        return not self.request.user.is_anonymous and not userIsKiosk(self.request.user)


class DrawingParticipantDashboard(UserPassesTestMixin, generic.ListView):
    template_name = 'lottery/dashboard.html'
    context_object_name = 'drawing_info'
    login_url = '/login'

    def test_func(self):
        return not self.request.user.is_anonymous and not userIsKiosk(self.request.user)

    def get_context_data(self):
        context = super(DrawingParticipantDashboard, self).get_context_data(
            **self.kwargs)  # getting kwargs to be a template variable from https://stackoverflow.com/a/18233104
        return context

    def get_queryset(self):
        self.pk = int(self.kwargs['pk'])
        print(self.kwargs['pk'], "hi, this is pk")
        return Ticket.objects.filter(submitted_by=self.request.user).order_by("-timestamp")[:5]


class AdminDashboard(UserPassesTestMixin, generic.ListView):
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
        return Drawing.objects.order_by('-end_date')[:5]


class LotteryAdmin(UserPassesTestMixin, generic.ListView):
    template_name = 'lottery/manageLottery.html'
    context_object_name = 'tickets'
    login_url = '/login'

    def test_func(self):
        try:
            isStaff = self.request.user.is_staff
        except:
            isStaff = False
        return isStaff

    def get_queryset(self):
        drawing_id = int(self.kwargs['drawing_id'])
        drawing = Drawing.objects.filter(pk=drawing_id)[0]
        start = drawing.start_date
        end = drawing.end_date
        print(start, end)
        return Ticket.objects.filter(timestamp__gte=start, timestamp__lte=end)

    def get_scratchoffs(self):
        drawing_id = int(self.kwargs['drawing_id'])
        drawing = Drawing.objects.filter(pk=drawing_id)[0]
        start = drawing.start_date
        end = drawing.end_date
        return Scratchoff.objects.filter(timestamp__gte=start, timestamp__lte=end)

    def get_context_data(self):
        context = super(LotteryAdmin, self).get_context_data(
            **self.kwargs)  # getting kwargs to be a template variable from https://stackoverflow.com/a/18233104
        context['scratchoffs'] = self.get_scratchoffs()
        return context


def create_ticket(request, username):
    print("called")
    if request.method == "POST" and (request.user.is_staff or userIsKiosk(request.user)):
        try:
            actual_user = User.objects.get(username=username)
        except:
            return HttpResponse(json.dumps({'state': 'error',
                                            'status': 'User not found'
                                            }), content_type="application/json")

        # Check maximum ticket submissions
        one_hour_ago = datetime.datetime.now() - datetime.timedelta(
            hours=1)  # Getting time one hour prior to now from https://stackoverflow.com/questions/7582333/python-get-datetime-of-last-hour
        num_tickets_last_hr = len(Ticket.objects.filter(submitted_by=actual_user,
                                                        timestamp__gte=one_hour_ago))

        print("num_tickets_last_hr =", str(num_tickets_last_hr))
        if num_tickets_last_hr > 100:
            return HttpResponse(json.dumps({'state': 'error', 'error_short_desc': "TICKET_RATE_LIMIT_EXCEEDED",
                                            'status': "You've submitted too many tickets in the last hour.  Please wait 60 minutes before submitting more tickets."}),
                                content_type="application/json")

        print(request.POST['nums'])
        nums = request.POST['nums']

        if len(nums) == 0:
            return HttpResponse(
                json.dumps({'state': 'error', 'status': "Select 4 numbers before submitting a ticket!"}),
                content_type="application/json")

        split_nums = nums.split(",")

        print(split_nums)
        distinct_split_nums = list(set(map(lambda x: int(x.strip()),
                                           split_nums)))  # Remove duplicate numbers after trimming spaces and converting to ints.  After this, there should only be 4 distinct numbers; this method for removing duplicates is from https://stackoverflow.com/questions/7961363/removing-duplicates-in-lists

        distinct_split_nums.sort()
        numbers_added = []

        submit_method = ("Kiosk %s" % request.user.username) if not request.POST.get("paperTicket", False) else "Paper ticket"

        if 4 >= len(distinct_split_nums) > 0:
            t = Ticket(submitted_by=actual_user, timestamp=datetime.datetime.now(),
                       submit_method=submit_method)
            t.save()
            for num in distinct_split_nums:
                if 1 <= num <= 36:  # Numbers must be between 1 and 36
                    num_obj = Number(value=num)
                    num_obj.assoc_ticket = t
                    num_obj.save()
                    numbers_added.append(num)
            print(t.pk, t.timestamp)
        else:
            return HttpResponse(json.dumps(
                {'state': 'error', 'status': "Ticket can't be submitted because it has more than 4 numbers"}),
                                content_type="application/json")

        # Resources used in converting timestamp to a string:
        # https://stackoverflow.com/questions/10624937/convert-datetime-object-to-a-string-of-date-only-in-python
        # https://docs.python.org/3/library/datetime.html#strftime-strptime-behavior
        # https://docs.python.org/2/library/string.html
        # This longer method is used to ensure that when the JS on the page updates the table outside of Django's template renderer, the date looks like the dates outputted by the Django template renderer
        if t.timestamp.hour >= 12:
            timestamp_ampm = 'PM'
        else:
            timestamp_ampm = 'AM'

        timestamp_str = ("{} {}".format(t.timestamp.strftime('%B %#d, %Y, %I:%M'), timestamp_ampm))

        numbers_added.sort()

        result_obj = {'state': "success",
                      'status': "Ticket submitted successfully",
                      'nums': str(numbers_added)[1:(len(str(numbers_added)) - 1)],
                      'id': t.pk,
                      'timestamp': timestamp_str}
        return HttpResponse(json.dumps(result_obj),
                            content_type="application/json")  # StackOverflow for sending an object as the HttpResponse data: https://stackoverflow.com/questions/21879729/returning-python-object-in-httpresponse


def getTicketsMatchingLottery(request):
    if request.method == "POST" and request.user.is_staff:
        try:
            drawing_id = int(request.POST['drawing_id'])
        except:
            return HttpResponse("Bad drawing id")

        drawing = Drawing.objects.filter(pk=drawing_id)[0]

        # start_time = drawing.start_time
        # end_time = drawing.end_time
        # print(str(drawing_id));
        # print(str(start_time))
        tickets = Ticket.objects.filter(timestamp__gte=drawing.start_date, timestamp__lte=drawing.end_date)
        # print(len(tickets))
        # print(tickets[36].number_set.all()[0].value)

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
                'numbers': [n.value for n in t.number_set.all()]
            })

        # print(result)

        return HttpResponse(json.dumps(result), content_type="application/json")


def generate_unique_random_nums(num, a, b):
    if settings.ENTROPY_DRIVER == settings.ENTROPY_DRIVER_RANDOM:
        print(f"Generating {num} unique numbers between {a} and {b} using Random.org")
        random_org_results = r.generate_integers(num, a, b, replacement=False)
        print(f"Random numbers from Random.org: {random_org_results}")
        return random_org_results

    result = []
    while len(result) < num:
        x = random.randint(a, b)
        if x not in result:
            result.append(x)
    return result


def generate_ticket_num_hist_for_drawing(request, drawing_id):
    if request.method == "GET" and request.user.is_staff:
        try:
            # drawing_id = int(drawing_id)
            pass
        except:
            return HttpResponse("Bad drawing id")

        drawing = Drawing.objects.filter(pk=drawing_id)[0]
        tickets = Ticket.objects.filter(timestamp__gte=drawing.start_date, timestamp__lte=drawing.end_date)

        nums = []

        for t in tickets:
            for n in t.number_set.all():
                nums.append(n.value)

        return HttpResponse(json.dumps({ "numbers": nums }), content_type="application/json")


def generate_lottery_analytics(request, drawing_id):
    if request.method == "GET" and request.user.is_staff:
        drawing = Drawing.objects.filter(pk=drawing_id)[0]
        tickets = Ticket.objects.filter(timestamp__gte=drawing.start_date, timestamp__lte=drawing.end_date)

        drawing_nums = []

        for t in tickets:
            for n in t.number_set.all():
                drawing_nums.append(n.value)

        scratchoffs = Scratchoff.objects.filter(timestamp__gte=drawing.start_date, timestamp__lte=drawing.end_date)
        scratchoff_nums = []
        scratchoff_correct = 0
        for s in scratchoffs:
            if s.number_chosen == s.answer:
                scratchoff_correct += 1
            scratchoff_nums.append(s.number_chosen)

        return HttpResponse(json.dumps({
            "drawing": {
                "total_nums": len(drawing_nums),
                "numbers": drawing_nums
            },
            "scratchoff": {
                "total_nums": len(scratchoff_nums),
                "correct": scratchoff_correct,
                "numbers": scratchoff_nums
            }
        }), content_type="application/json")


def generateResultsForDrawing(request):
    if request.method == "POST" and request.user.is_staff:
        try:
            drawing_id = int(request.POST['drawing_id'])
        except:
            return HttpResponse("Bad drawing id")

        existing_results = len(Results.objects.filter(drawing_id=drawing_id))
        if existing_results > 0:
            return HttpResponse("Results already made")

        try:
            drawing_nums = [int(request.POST['answer_1']),
                            int(request.POST['answer_2'])]
            drawing_nums = list(set(drawing_nums))

            answers_provided = True
        except:
            print("Answers not provided; generating")
            answers_provided = False

        drawing = Drawing.objects.filter(pk=drawing_id)[0]
        tickets = Ticket.objects.filter(timestamp__gte=drawing.start_date, timestamp__lte=drawing.end_date)

        results_users = {}

        if not answers_provided:
            print("Generating answers")
            drawing_nums = generate_unique_random_nums(2, 1, 36)
            while abs(drawing_nums[0] - drawing_nums[1]) <= 3:
                print("Generated numbers for answers are too close; trying again")
                drawing_nums = generate_unique_random_nums(2, 1, 36)

        for num in drawing_nums:
            ans = Answer(assoc_drawing=drawing, value=num)
            ans.save()

        for t in tickets:
            u = t.submitted_by.pk
            u_name = t.submitted_by.username
            num_correct = 0
            num_possible = len(t.number_set.all())

            for n in t.number_set.all():
                if n.value in drawing_nums:
                    num_correct += 1

            current_user_obj = results_users.get(u, False)
            if not current_user_obj:
                results_users[u] = {
                    'id': u,
                    'name': u_name,
                    'num_correct': num_correct * 2,
                    'number_possible': num_possible,
                    'scratchoff_points_earned': 0,
                    'scratchoff_points_possible': 0,
                    'dq': False
                }
            else:
                current_num_correct = current_user_obj.get('num_correct')
                current_num_possible = current_user_obj.get('number_possible')
                results_users[u]['num_correct'] = current_num_correct + num_correct * 2
                results_users[u]['number_possible'] = current_num_possible + num_possible

                print(current_num_correct, current_num_possible)
            print(results_users[u])

        scratchoffs = Scratchoff.objects.filter(timestamp__gte=drawing.start_date, timestamp__lte=drawing.end_date)

        for s in scratchoffs:
            u = s.submitted_by.pk
            u_name = s.submitted_by.username
            points_earned = 1 if s.number_chosen == s.answer else 0

            current_user_obj = results_users.get(u, False)
            if not current_user_obj:
                results_users[u] = {
                    'id': u,
                    'name': u_name,
                    'num_correct': 0,
                    'number_possible': 0,
                    'scratchoff_points_earned': points_earned,
                    'scratchoff_points_possible': 1,
                    'dq': False
                }
            else:
                current_points_earned = current_user_obj.get('scratchoff_points_earned')
                current_points_possible = current_user_obj.get('scratchoff_points_possible')
                results_users[u]['scratchoff_points_earned'] = current_points_earned + points_earned
                results_users[u]['scratchoff_points_possible'] = current_points_possible + 1

        for result in results_users:
            print("result", result)
            user_result_info = results_users[result]
            user = User.objects.filter(pk=user_result_info['id'])[0]
            result = Results(for_user=user, drawing_number_correct=user_result_info['num_correct'],
                             drawing_number_possible=user_result_info['number_possible'],
                             scratchoff_number_correct=user_result_info['scratchoff_points_earned'],
                             scratchoff_number_possible=user_result_info['scratchoff_points_possible'],
                             drawing_id=drawing)
            result.save()

        return HttpResponse(json.dumps(results_users), content_type="application/json")

        # A valid Result must have:
        # Drawing id, User, Possible, Correct, Disqualify (t/f)


def checkIfDrawingHasResults(request, drawing_id):
    print(drawing_id, "is drawing_id")

    existing_results = len(Results.objects.filter(drawing_id=drawing_id))

    return HttpResponse("No results") if not existing_results else HttpResponse("Results exist")


### KIOSK METHODS
def provisionKiosk(request):
    # Find an unused kiosk user or create a new kiosk user
    # For now, just create a new user
    if request.user.is_staff:
        kiosk_id = random.randint(100000, 999999)  # Generate a random 6-digit key for the kiosk user
        kiosk_pw = random.randint(10000000000000, 99999999999999)
        user = User.objects.create_user(kiosk_id, "", kiosk_pw)

        kiosk_group = Group.objects.get(
            name="kiosk")  # this method for adding a user to a group is from https://stackoverflow.com/a/6288863/5434744 (this line and next)
        kiosk_group.user_set.add(user)

        # this part of the code (autheticating and signing in as the kiosk user, and logging out the current user)
        # is from the Django v1.11 docs - https://docs.djangoproject.com/en/1.11/topics/auth/default/#how-to-log-a-user-in
        # and https://docs.djangoproject.com/en/1.11/topics/auth/default/#django.contrib.auth.logout
        kiosk_user = authenticate(request, username=kiosk_id, password=kiosk_pw)
        if user is not None:
            logout(request)
            login(request, kiosk_user)
            return redirect('/kiosk/view/%d' % kiosk_id)
        return HttpResponse("500 Server Error")

    return HttpResponse("403 Forbidden")


class Kiosk(UserPassesTestMixin, TemplateView):
    template_name = "lottery/kiosk.html"
    context_object_name = "kiosk"
    login_url = '/login'

    def get_context_data(self, **kwargs):
        context = super(Kiosk, self).get_context_data(
            **kwargs)  # getting kwargs to be a template variable from https://stackoverflow.com/a/18233104 and https://stackoverflow.com/a/16110852/5434744
        return context

    def test_func(self):
        # print("The kiosk id is",self.kwargs['kiosk_id'])
        return self.request.user.groups.filter(name="kiosk").count() >= 1 and self.request.user.username == self.kwargs[
            'kiosk_id']


def userIsKiosk(user):
    return user.groups.filter(name="kiosk").count() >= 1


def saveName(request):
    if request.method == "POST" and userIsKiosk(request.user):
        name = request.POST['name']
        username = request.POST['username']
        if 2 <= len(name) <= 200:
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
    if request.method == "GET" and userIsKiosk(request.user):
        print("request.user.username", barcode)
        found_users = User.objects.filter(username=barcode)
        if len(found_users) == 1:
            if not userIsKiosk(found_users[0]) and found_users[0].is_active:
                return HttpResponse("User exists")
            else:
                return HttpResponse("User is ineligible")
        return HttpResponse("User not found")
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

        for t in tks:
            result["tickets"].append({
                'id': t.pk,
                'numbers': [n.value for n in t.number_set.all()]
            })
        return HttpResponse(json.dumps(result), content_type="application/json")
    return HttpResponse("403 Forbidden")


def generateBarcodeSetup(request, drawing_id):
    try:
        drawing = Drawing.objects.get(pk=drawing_id)
        drawing_name = drawing.drawing_name
    except:
        return HttpResponse("404 Not Found")
    return render(request, "lottery/barcodeSetup.html", context={'drawing_name': drawing_name,
                                                                 "ar": [{'b': "ABC123", 'a': False},
                                                                        {'b': "4F3A9F", 'a': True},
                                                                        {'b': "4F4H3G", 'a': False},
                                                                        {'b': "DF8F7J", 'a': False}]})


# the id_generator function is from https://stackoverflow.com/a/2257449/5434744
def id_generator(size=6, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for _ in range(size))


def generateBarcodes(request, drawing_id, num_regular, num_admin):
    if request.user.is_staff:
        try:
            drawing = Drawing.objects.get(pk=drawing_id)
            drawing_name = drawing.drawing_name
        except:
            return HttpResponse("404 Not Found")
        try:
            num_regular = int(num_regular)
            num_admin = int(num_admin)
        except:
            return HttpResponse(
                "500 Server Error, either the num_regular or num_admin url parameter contains a value that cannot be converted to an int")

        num_regular = min(num_regular, 25)
        num_gen_regular = 0
        num_admin = min(num_admin, 25)
        num_gen_admin = 0
        codes = []

        # First, see how many unused kiosk user accounts there already
        existing_reg = User.objects.annotate(ticket_count=Count('ticket')).filter(ticket_count=0,
                                                                                  groups__name="kiosk_user")  # Getting all users in a group - https://stackoverflow.com/a/39587580/5434744; counting child objects - https://stackoverflow.com/a/6525869/5434744
        existing_admin = User.objects.filter(groups__name="kiosk_admin",
                                             first_name="")  # Getting all users in a group - https://stackoverflow.com/a/39587580/5434744
        print(existing_reg)

        for user in existing_reg:
            print(num_gen_regular, num_regular)
            if num_gen_regular < num_regular:
                user.first_name = ""
                user.save()
                codes.append({'barcode': user.username, 'admin': False})
                num_gen_regular += 1
            else:
                print("break reg")
                break

        for user in existing_admin:
            print(num_gen_regular, num_admin)
            if num_gen_admin < num_admin:
                codes.append({'barcode': user.username, 'admin': True})
                num_gen_admin += 1
            else:
                print("break admin")
                break

        for i in range(num_regular + num_admin - len(codes)):
            result = id_generator()
            # filter curse words
            kiosk_gr_admin_str = "admin"
            kiosk_gr_user_str = "user"
            while User.objects.filter(
                    username=result).count() > 0 or "FUCK" in result or "SHIT" in result or "COCK" in result or "C0CK" in result or "DAMN" in result:
                print("bad word or username in use", result)
                result = id_generator()
                print("retry", result)
            print("using", result)
            if i < num_regular - len(existing_reg):
                admin = False
                is_admin_str = kiosk_gr_user_str
            else:
                admin = True
                is_admin_str = kiosk_gr_admin_str
            user_id = result
            user_pw = id_generator(15,
                                   "abdegijlmnopqrtuvwxyz0123456789")  # Generate a random password for the user.  Some letters are omitted to prevent the password from containing profanity
            user = User.objects.create_user(user_id, "", user_pw)

            user_group = Group.objects.get(
                name="kiosk_%s" % is_admin_str)  # this method for adding a user to a group is from https://stackoverflow.com/a/6288863/5434744 (this line and next)
            user_group.user_set.add(user)

            # Whatever group the user was added to, remove the user from the other group
            if is_admin_str == kiosk_gr_admin_str:
                user_gr_remove = Group.objects.get(
                    name="kiosk_%s" % kiosk_gr_user_str)  # this method for adding a user to a group is from https://stackoverflow.com/a/6288863/5434744 (this line and next)
                user_gr_remove.user_set.remove(user)
            elif is_admin_str == kiosk_gr_user_str:
                if is_admin_str == kiosk_gr_admin_str:
                    user_gr_remove = Group.objects.get(
                        name="kiosk_%s" % kiosk_gr_admin_str)  # this method for adding a user to a group is from https://stackoverflow.com/a/6288863/5434744 (this line and next)
                    user_gr_remove.user_set.remove(user)

            codes.append({'barcode': result, 'admin': admin})

        print("codes", codes)
        return render(request, "lottery/barcodeOutput.html", context={'drawing_name': drawing_name,
                                                                      "ar": codes})


def getPercentCorrect(results_dict):
    print("comparing correct and possible", results_dict)
    return results_dict['correct'] / results_dict['possible']


def isDisqualified(results_dict):
    if results_dict['disqualify']:
        return 1
    else:
        return 0


def getDrawingResults(request, drawing_id):
    if request.user.is_staff:
        results = Results.objects.filter(drawing_id=drawing_id)

        results_list = []
        for r in results:
            lottery_percent = (r.drawing_number_correct / r.drawing_number_possible * 100) \
                if r.drawing_number_possible is not 0 else 0
            scratchoff_percent = (r.scratchoff_number_correct / r.scratchoff_number_possible * 100) \
                                  if r.scratchoff_number_possible is not 0 else 0
            lottery_total_pts_share = r.drawing_number_possible / (r.drawing_number_possible + r.scratchoff_number_possible)
            scratchoff_total_pts_share = r.scratchoff_number_possible / (r.drawing_number_possible + r.scratchoff_number_possible)
            overall_score = lottery_percent*lottery_total_pts_share + scratchoff_percent*scratchoff_total_pts_share

            results_list.append({
                'barcode': r.for_user.username, 'username': r.for_user.first_name,
                'lottery_correct': r.drawing_number_correct,
                'lottery_possible': r.drawing_number_possible,
                'lottery_percent': lottery_percent,
                'scratchoffs_correct': r.scratchoff_number_correct,
                'scratchoffs_possible': r.scratchoff_number_possible,
                'scratchoffs_percent': scratchoff_percent,
                'total_possible': r.drawing_number_possible + r.scratchoff_number_possible,
                'overall_score':overall_score,
                'disqualify': r.disqualify,
                'not_disqualified': not r.disqualify
            })

        results_list.sort(key=itemgetter('not_disqualified', 'overall_score', 'total_possible'), reverse=True)
        print(results_list)
        return HttpResponse(json.dumps(results_list), content_type="application/json")
    return HttpResponse("403 Forbidden")


def checkBarcodeAdmin(request, barcode):
    if request.method == "GET" and userIsKiosk(request.user):
        found_users = User.objects.filter(username=barcode)
        if len(found_users) == 1:
            user = found_users[0]
            if user.groups.filter(name="kiosk_admin").count() >= 1:

                is_admin = True
            else:
                is_admin = False
            return HttpResponse(json.dumps({'barcode': barcode, 'is_admin': is_admin}), content_type="application/json")
        print("Couldn't find single user to validate admin status for; number of users found: " + str(len(found_users)))
        return HttpResponse("500 Server Error")
    return HttpResponse("403 Forbidden")


def generateScoreReports(request, drawing_id):
    if request.method == "GET" and request.user.is_staff:
        lottery = Drawing.objects.get(pk=drawing_id)
        lottery_name = lottery.drawing_name
        start_date = lottery.start_date
        end_date = lottery.end_date
        answers = lottery.answer_set.all()
        answers_nums = []

        for a in answers:
            answers_nums.append(a.value)

        results = Results.objects.filter(drawing_id=drawing_id)
        ranks_possible = len(results)
        answers_nums.sort()
        result = {
            'answers': str(answers_nums)[1:-1],
            'name': lottery_name,
            'start_date': start_date,
            'end_date': end_date,
            'rank_possible': ranks_possible,
            'data': []
        }

        for r in results:
            lottery_percent = (r.drawing_number_correct / r.drawing_number_possible * 100) \
                if r.drawing_number_possible is not 0 else 0
            scratchoff_percent = (r.scratchoff_number_correct / r.scratchoff_number_possible * 100) \
                if r.scratchoff_number_possible is not 0 else 0
            lottery_total_pts_share = r.drawing_number_possible / (
                        r.drawing_number_possible + r.scratchoff_number_possible)
            scratchoff_total_pts_share = r.scratchoff_number_possible / (
                        r.drawing_number_possible + r.scratchoff_number_possible)
            overall_score = lottery_percent * lottery_total_pts_share + scratchoff_percent * scratchoff_total_pts_share

            to_add = {
                'barcode': r.for_user.username, 'username': r.for_user.first_name,
                'lottery_correct': r.drawing_number_correct,
                'lottery_possible': r.drawing_number_possible,
                'lottery_percent': lottery_percent,
                'scratchoffs_correct': r.scratchoff_number_correct,
                'scratchoffs_possible': r.scratchoff_number_possible,
                'scratchoffs_percent': scratchoff_percent,
                'total_possible': r.drawing_number_possible + r.scratchoff_number_possible,
                'overall_score': overall_score,
                'disqualify': r.disqualify,
                'not_disqualified': not r.disqualify,
                'tickets': [],
                'scratchoffs': []
            }
            user_tickets = Ticket.objects.filter(timestamp__gte=start_date,
                                                 timestamp__lte=end_date, submitted_by=r.for_user)

            for t in user_tickets:
                if "Kiosk" in t.submit_method:
                    method = "Kiosk"
                else:
                    method = t.submit_method
                ticket = {
                    'numbers': [],
                    'method': method
                }
                points = 0
                for n in t.number_set.all():
                    num = n.value
                    correct = num in answers_nums
                    if correct:
                        points += 2
                    ticket['numbers'].append({
                        'number': num,
                        'correct': num in answers_nums
                    })

                ticket['points'] = points
                to_add['tickets'].append(ticket)

            result['data'].append(to_add)

        result['data'].sort(key=itemgetter('not_disqualified', 'overall_score', 'total_possible'), reverse=True)
        return render(request, "lottery/score_report.html", context=result)
    return HttpResponse("403 Forbidden")


### Scratchoff
def create_scratchoff(request, username):
    animals = ["alligator", "bear", "bird", "cat",
               "dog", "fish", "gorilla", "horse",
               "lion", "ostrich", "pig", "porcupine",
               "snake", "spider", "tiger", "zebra"]
    if request.method == "POST" and userIsKiosk(request.user):
        try:
            actual_user = User.objects.get(username=username)
        except:
            return HttpResponse(json.dumps({'state': 'error',
                                            'status': 'User not found'
                                            }), content_type="application/json")

        # Check maximum scratchoff submissions
        one_hour_ago = datetime.datetime.now() - datetime.timedelta(
            hours=1)  # Getting time one hour prior to now from https://stackoverflow.com/questions/7582333/python-get-datetime-of-last-hour
        num_scratchoffs_last_hr = len(Scratchoff.objects.filter(submitted_by=actual_user,
                                                                timestamp__gte=one_hour_ago))

        print("num_scratchoffs_last_hr =", str(num_scratchoffs_last_hr))
        if num_scratchoffs_last_hr >= 50:
            return HttpResponse(json.dumps({'state': 'error', 'error_short_desc': "SCRATCHOFF_RATE_LIMIT_EXCEEDED",
                                            'status': "You've submitted too many scratchoffs in the last hour.  Please wait 60 minutes before submitting more scratchoffs."}),
                                content_type="application/json")

        random.shuffle(animals)

        if settings.ENTROPY_DRIVER == settings.ENTROPY_DRIVER_RANDOM:
            try:
                answer = r.generate_integers(1, 1, 16)[0]
            except Exception as e:
                print("An exception occurred while trying to use Random.org to obtain a scratchoff answer")
                print(e)
                return HttpResponse(
                    json.dumps({'state': 'error', 'status': "Unable to obtain a random number for the scratchoff. Please ask a Lottery Administrator for assistance."}),
                    content_type="application/json")
        else:
            answer = random.randint(1, 16)

        print(request.POST['num'], answer)
        num = int(request.POST['num'])

        if answer == num:
            animal = "turtle"
        else:
            animal = animals[num - 1]

        if num is None:
            return HttpResponse(
                json.dumps({'state': 'error', 'status': "Select a number before submitting a scratchoff!"}),
                content_type="application/json")

        s = Scratchoff(submitted_by=actual_user, timestamp=datetime.datetime.now(),
                       submit_method=("Kiosk %s" % request.user.username),
                       number_chosen=num, answer=answer)
        s.save()

        result_obj = {'state': "success",
                      'status': "Scratchoff submitted successfully",
                      'animal': animal,
                      'won': animal == "turtle",
                      'answer': answer
                      }

        return HttpResponse(json.dumps(result_obj), content_type="application/json")

def addPaperTickets(request):
    if request.method == "GET" and request.user.is_staff:
        return render(request, "lottery/addPaperTickets.html")