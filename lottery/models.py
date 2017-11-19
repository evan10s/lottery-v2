from django.db import models
from django.conf import settings
from django.contrib.auth.models import User #this line is from http://www.b-list.org/weblog/2006/jun/06/django-tips-extending-user-model/

class Drawing(models.Model):
    drawing_name = models.CharField(max_length=200)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    def __str__(self):
        return self.drawing_name

class Ticket(models.Model):
    submitted_by = models.ForeignKey(User,on_delete=models.CASCADE) #"""User,unique=True from http://www.b-list.org/weblog/2006/jun/06/django-tips-extending-user-model/
    timestamp = models.DateTimeField('date submitted')
    submit_method = models.CharField(max_length=200)
    def __str__(self):
        return "#" + str(self.pk) + " - " + str(self.submitted_by) + " - " + str(self.timestamp)
    class Meta:
         permissions = (
            ("view_own_tickets", "Can view own tickets"),
            ("view_all_tickets", "Can view all tickets"),

            )

class Answer(models.Model):
    assoc_drawing = models.ForeignKey(Drawing,on_delete=models.CASCADE)
    value = models.PositiveIntegerField()
    def __str__(self):
        return self.assoc_drawing.drawing_name + ": " + str(self.value)
    class Meta:
        permissions = (
            ("view_answers", "Can view answers"),
        )

class Number(models.Model):
    assoc_ticket = models.ForeignKey(Ticket,on_delete=models.CASCADE)
    value = models.PositiveIntegerField(default=0)
    def __str__(self):
        return str(self.value) + " (#" + str(self.assoc_ticket.pk) + ")"

class Results(models.Model):
    for_user = models.OneToOneField(User,unique=True,on_delete=models.CASCADE) #"""User,unique=True from http://www.b-list.org/weblog/2006/jun/06/django-tips-extending-user-model/
    number_correct = models.PositiveIntegerField(default=0)
    number_possible = models.PositiveIntegerField(default=1)
    disqualify = models.BooleanField(default=False) #adding default to boolean field used http://stackoverflow.com/a/8767855
    drawing_id = models.ForeignKey(Drawing,on_delete=models.CASCADE)
    class Meta:
        verbose_name_plural = "results" # from https://stackoverflow.com/a/2587829
        permissions = (
            ("view_own_results", "Can view own results"),
            ("view_all_results", "Can view all results"),
            ("disqualify_results", "Can disqualify results from a drawing"),
        )
    def __str__(self):
        return str(self.drawing_id) + " - " + str(self.for_user)
