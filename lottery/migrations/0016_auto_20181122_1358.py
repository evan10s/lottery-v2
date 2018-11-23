# -*- coding: utf-8 -*-
# Generated by Django 1.11.1 on 2018-11-22 18:58
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('lottery', '0015_scratchoff'),
    ]

    operations = [
        migrations.RenameField(
            model_name='results',
            old_name='number_correct',
            new_name='drawing_number_correct',
        ),
        migrations.RenameField(
            model_name='results',
            old_name='number_possible',
            new_name='drawing_number_possible',
        ),
        migrations.AddField(
            model_name='results',
            name='scratchoff_number_correct',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='results',
            name='scratchoff_number_possible',
            field=models.PositiveIntegerField(default=1),
        ),
    ]
