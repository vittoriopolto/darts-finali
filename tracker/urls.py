from django.contrib.auth import views as auth_views
from django.urls import path

from . import views

urlpatterns = [
    # Pubblico (viewer)
    path("", views.home, name="home"),
    path("frammento/", views.home_fragment, name="home_fragment"),
    path("gara/<int:pk>/", views.match_sheet, name="match_sheet"),
    path("gara/<int:pk>/frammento/", views.match_fragment, name="match_fragment"),
    path("gara/<int:pk>/dati/", views.match_data, name="match_data"),
    path("gare/", views.match_list, name="match_list"),
    # Login
    path("login/", auth_views.LoginView.as_view(template_name="tracker/login.html"), name="login"),
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),
    # Admin
    path("gestione/nuova/", views.match_create, name="match_create"),
    path("gestione/<int:pk>/modifica/", views.match_edit, name="match_edit"),
    path("gestione/<int:pk>/elimina/", views.match_delete, name="match_delete"),
    path("gestione/<int:pk>/avvia-prossime/", views.start_next, name="start_next"),
    path("game/<int:pk>/punto/", views.game_point, name="game_point"),
    path("game/<int:pk>/live/", views.game_live, name="game_live"),
    path("api/giocatori/", views.player_search, name="player_search"),
]
