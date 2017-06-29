from django.contrib import admin
from .models import Answer, Drawing, Number, Results, Ticket
from django.conf import settings
from django.contrib.auth.models import User #the need to use User instead of settings.AUTH_USER_MODEL came from the blog post at from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

class NumberInline(admin.TabularInline):
    model = Number
    extra = 0


class TicketInline(admin.TabularInline):
    model = Ticket
    extra = 2

class UserAdmins(BaseUserAdmin):
    inlines = (TicketInline,)

class UserInline(admin.TabularInline):
    model = User

class TicketAdmin(admin.ModelAdmin):
    fields = ['submitted_by','timestamp']
    inlines = [NumberInline]


class NumberAdmin(admin.ModelAdmin):
    fields = ['value']

class ResultsAdmin(admin.ModelAdmin):
    fields = ['drawing_id','number_correct','number_possible','disqualify']

admin.site.site_header = "Lottery Admin" #from this StackOverflow answer: http://stackoverflow.com/a/24983231

admin.site.unregister(User)
admin.site.register(User,UserAdmins)
admin.site.register(Ticket,TicketAdmin)
admin.site.register(Number)
admin.site.register(Drawing)
admin.site.register(Results,ResultsAdmin)
