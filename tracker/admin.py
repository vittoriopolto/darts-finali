from django.contrib import admin

from .models import Game, Match, Player

admin.site.register(Player)
admin.site.register(Match)
admin.site.register(Game)
