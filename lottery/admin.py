from django.contrib import admin
from .models import Answer, Drawing, Number, Results, Ticket, Scratchoff
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin


class NumberInline(admin.TabularInline):
    model = Number
    extra = 4


class AnswerInline(admin.TabularInline):
    model = Answer
    extra = 0


class TicketInline(admin.TabularInline):
    model = Ticket
    extra = 2


class UserAdmins(BaseUserAdmin):
    inlines = (TicketInline,)


class UserInline(admin.TabularInline):
    model = User


class NumberAdmin(admin.ModelAdmin):
    fields = ['value']


class ResultsAdmin(admin.ModelAdmin):
    fields = ['drawing_id', 'drawing_number_correct', 'drawing_number_possible', 'scratchoff_number_correct',
              'scratchoff_number_possible', 'disqualify']


class DrawingAdmin(admin.ModelAdmin):
    fields = ['drawing_name', 'start_date', 'end_date', 'ranking_system']
    inlines = [AnswerInline]


class TicketsTypeFilter(admin.SimpleListFilter):
    title = "ticket type"
    parameter_name = "ticket_type"
    default_value = None

    related_filter_parameter = "lottery"

    def lookups(self, request, model_admin):
        list_of_ticket_types = []
        queryset = Ticket.objects.all()

        if 'lottery' in request.GET:
            drawing = Drawing.objects.filter(pk=int(request.GET['lottery']))[0]
            print("tickets type filter drawing: ", drawing)
            queryset = queryset.filter(timestamp__gte=drawing.start_date, timestamp__lte=drawing.end_date)

        for ticket in queryset:
            if (ticket.submit_method, ticket.submit_method) not in list_of_ticket_types:
                list_of_ticket_types.append((ticket.submit_method, ticket.submit_method))

        print(list_of_ticket_types)
        return sorted(list_of_ticket_types, key=lambda tp: tp[1])

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(submit_method=self.value())
        return queryset


class TicketsLotteryFilter(admin.SimpleListFilter):
    title = "lottery"
    parameter_name = "lottery"
    default_value = None

    def lookups(self, request, model_admin):
        list_of_drawing_names = []
        queryset = Drawing.objects.all()
        for drawing in queryset:
            print(drawing.drawing_name, (drawing.pk, drawing.drawing_name) not in list_of_drawing_names)
            if (drawing.pk, drawing.drawing_name) not in list_of_drawing_names:
                list_of_drawing_names.append((drawing.pk, drawing.drawing_name))

        print(list_of_drawing_names)
        return sorted(list_of_drawing_names, key=lambda tp: tp[1])

    def queryset(self, request, queryset):
        if self.value():
            drawing = Drawing.objects.filter(pk=int(self.value()))[0]
            return queryset.filter(timestamp__gte=drawing.start_date, timestamp__lte=drawing.end_date)
        return queryset


class TicketAdmin(admin.ModelAdmin):
    fields = ['submitted_by', 'timestamp', 'submit_method']
    inlines = [NumberInline]
    list_filter = (TicketsLotteryFilter, TicketsTypeFilter)


class ScratchoffAdmin(admin.ModelAdmin):
    fields = ["submitted_by", "timestamp", "submit_method", "number_chosen", "points_awarded", "points_possible"]


admin.site.site_header = "Lottery Admin"  # from this StackOverflow answer: http://stackoverflow.com/a/24983231

admin.site.unregister(User)
admin.site.register(User, UserAdmins)
admin.site.register(Ticket, TicketAdmin)
admin.site.register(Number)
admin.site.register(Drawing, DrawingAdmin)
admin.site.register(Results, ResultsAdmin)
admin.site.register(Scratchoff, ScratchoffAdmin)
