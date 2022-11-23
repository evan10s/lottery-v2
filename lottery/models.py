from django.contrib.auth.models import \
    User  # this line is from http://www.b-list.org/weblog/2006/jun/06/django-tips-extending-user-model/
from django.db import models


class Drawing(models.Model):
    drawing_name = models.CharField(max_length=200)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()

    def __str__(self):
        return self.drawing_name


class Ticket(models.Model):
    submitted_by = models.ForeignKey(User,
                                     on_delete=models.CASCADE)  # """User,unique=True from http://www.b-list.org/weblog/2006/jun/06/django-tips-extending-user-model/
    timestamp = models.DateTimeField('date submitted')
    submit_method = models.CharField(max_length=200)

    def __str__(self):
        return "Ticket #" + str(self.pk) + " - " + str(self.submitted_by) + " - " + str(self.timestamp)

    class Meta:
        permissions = (
            ("view_own_tickets", "Can view own tickets"),
            ("view_all_tickets", "Can view all tickets"),

        )


class Answer(models.Model):
    assoc_drawing = models.ForeignKey(Drawing, on_delete=models.CASCADE)
    value = models.PositiveIntegerField()

    def __str__(self):
        return self.assoc_drawing.drawing_name + ": " + str(self.value)

    class Meta:
        permissions = (
            ("view_answers", "Can view answers"),
        )


class Number(models.Model):
    assoc_ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE)
    value = models.PositiveIntegerField(default=0)

    def __str__(self):
        return str(self.value) + " (#" + str(self.assoc_ticket.pk) + ")"


class Results(models.Model):
    for_user = models.ForeignKey(User,
                                 on_delete=models.CASCADE)  # """User,unique=True from http://www.b-list.org/weblog/2006/jun/06/django-tips-extending-user-model/
    drawing_number_correct = models.PositiveIntegerField(default=0)
    drawing_number_possible = models.PositiveIntegerField(default=1)
    scratchoff_number_correct = models.FloatField(default=0)
    scratchoff_number_possible = models.FloatField(default=1)
    disqualify = models.BooleanField(
        default=False)  # adding default to boolean field used http://stackoverflow.com/a/8767855
    drawing_id = models.ForeignKey(Drawing, on_delete=models.CASCADE)

    class Meta:
        verbose_name_plural = "results"  # from https://stackoverflow.com/a/2587829
        permissions = (
            ("view_own_results", "Can view own results"),
            ("view_all_results", "Can view all results"),
            ("disqualify_results", "Can disqualify results from a drawing"),
        )

    def __str__(self):
        return str(self.drawing_id) + " - " + str(self.for_user)


class Scratchoff(models.Model):
    submitted_by = models.ForeignKey(User,
                                     on_delete=models.CASCADE)  # """User,unique=True from http://www.b-list.org/weblog/2006/jun/06/django-tips-extending-user-model/
    timestamp = models.DateTimeField('date submitted')
    submit_method = models.CharField(max_length=200)
    number_chosen = models.PositiveIntegerField()
    answer = models.PositiveIntegerField(null=True)
    points_awarded = models.FloatField()
    points_possible = models.FloatField()

    class Meta:
        permissions = (
            ("view_own_scratchoff", "Can view own scratchoff"),
            ("view_all_scratchoffs", "Can view all scratchoffs")
        )

    def __str__(self):
        return "Scratchoff #" + str(self.pk) + " - " + str(self.submitted_by) + " - " + str(self.timestamp)
