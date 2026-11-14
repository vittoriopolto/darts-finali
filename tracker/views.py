from functools import wraps

from django.contrib import messages
from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_POST

from .models import MAX_LIVE, SHEET, WIN_SCORE, Game, Match, Player


# ---------------------------------------------------------------- utilità --
def staff_required(view):
    """Solo admin (utente staff). Le chiamate AJAX ricevono un JSON."""

    @wraps(view)
    def wrapper(request, *args, **kwargs):
        user = request.user
        if not (user.is_authenticated and user.is_staff):
            if request.headers.get("X-Requested-With") == "fetch":
                return JsonResponse({"error": "Non sei autorizzato. Rifai il login."}, status=403)
            return redirect(f"/login/?next={request.path}")
        return view(request, *args, **kwargs)

    return wrapper


def is_admin(request):
    return request.user.is_authenticated and request.user.is_staff


def clean_name(value):
    return " ".join((value or "").split())[:60]


def build_state(request, match, force_sheet):
    """Contesto usato dal frammento che si aggiorna da solo."""
    ctx = {
        "match": match,
        "is_admin": is_admin(request),
        "force_sheet": force_sheet,
        "win_score": WIN_SCORE,
    }
    if match is None:
        return ctx

    games = list(match.games.all())
    live = [g for g in games if g.status == "live"]
    wins_a = sum(1 for g in games if g.winner == "a")
    wins_b = sum(1 for g in games if g.winner == "b")
    needed = len(games) // 2 + 1
    winner = "a" if wins_a >= needed else "b" if wins_b >= needed else None

    ctx.update(
        games=games,
        live_games=live,
        show_live=bool(live) and not force_sheet,
        wins_a=wins_a,
        wins_b=wins_b,
        winner=winner,
        can_start_next=len(live) < MAX_LIVE and any(g.status == "pending" for g in games),
    )
    return ctx


# ------------------------------------------------------------- pagine viewer --
@never_cache
def home(request):
    match = Match.objects.first()
    ctx = build_state(request, match, force_sheet=False)
    ctx["fragment_url"] = reverse("home_fragment")
    return render(request, "tracker/match.html", ctx)


@never_cache
def home_fragment(request):
    match = Match.objects.first()
    return render(request, "tracker/_state.html", build_state(request, match, False))


@never_cache
def match_sheet(request, pk):
    match = get_object_or_404(Match, pk=pk)
    ctx = build_state(request, match, force_sheet=True)
    ctx["fragment_url"] = reverse("match_fragment", args=[pk])
    return render(request, "tracker/match.html", ctx)


@never_cache
def match_fragment(request, pk):
    match = get_object_or_404(Match, pk=pk)
    return render(request, "tracker/_state.html", build_state(request, match, True))


@never_cache
def match_data(request, pk):
    """Dati del foglio gara in JSON: servono al tasto Condividi per disegnare l'immagine."""
    match = get_object_or_404(Match, pk=pk)
    state = build_state(request, match, True)
    return JsonResponse(
        {
            "team_a": match.team_a,
            "team_b": match.team_b,
            "wins_a": state["wins_a"],
            "wins_b": state["wins_b"],
            "winner": state["winner"],
            "games": [
                {
                    "order": g.order,
                    "kind": g.get_kind_display(),
                    "names_a": g.names_a,
                    "names_b": g.names_b,
                    "score_a": g.score_a,
                    "score_b": g.score_b,
                    "status": g.status,
                    "winner": g.winner,
                }
                for g in state["games"]
            ],
        }
    )


def match_list(request):
    matches = Match.objects.prefetch_related("games")
    return render(request, "tracker/match_list.html", {"matches": matches})


# ------------------------------------------------------- creazione / modifica --
def _players_from_post(post, order, kind):
    data = {
        "a1": clean_name(post.get(f"g{order}_a1")),
        "b1": clean_name(post.get(f"g{order}_b1")),
        "a2": "",
        "b2": "",
    }
    if kind == "D":
        data["a2"] = clean_name(post.get(f"g{order}_a2"))
        data["b2"] = clean_name(post.get(f"g{order}_b2"))
    return data


def _remember_players(names):
    for name in names:
        if name and not Player.objects.filter(name__iexact=name).exists():
            Player.objects.create(name=name)


@staff_required
def match_create(request):
    if request.method == "POST":
        with transaction.atomic():
            match = Match.objects.create(
                team_a=clean_name(request.POST.get("team_a")) or "Squadra A",
                team_b=clean_name(request.POST.get("team_b")) or "Squadra B",
            )
            names = []
            for order, kind in enumerate(SHEET, start=1):
                data = _players_from_post(request.POST, order, kind)
                Game.objects.create(match=match, order=order, kind=kind, **data)
                names += data.values()
            _remember_players(names)
        messages.success(request, "Gara creata.")
        return redirect("home")

    games = [Game(order=i, kind=k) for i, k in enumerate(SHEET, start=1)]
    return render(
        request,
        "tracker/match_form.html",
        {"title": "Nuova gara", "match": None, "team_a": "Squadra A", "team_b": "", "games": games},
    )


@staff_required
def match_edit(request, pk):
    match = get_object_or_404(Match, pk=pk)
    games = list(match.games.all())
    if request.method == "POST":
        with transaction.atomic():
            match.team_a = clean_name(request.POST.get("team_a")) or "Squadra A"
            match.team_b = clean_name(request.POST.get("team_b")) or "Squadra B"
            match.save()
            names = []
            for game in games:
                data = _players_from_post(request.POST, game.order, game.kind)
                for field, value in data.items():
                    setattr(game, field, value)
                game.save(update_fields=list(data.keys()))
                names += data.values()
            _remember_players(names)
        messages.success(request, "Gara aggiornata.")
        return redirect("home")

    return render(
        request,
        "tracker/match_form.html",
        {
            "title": "Modifica gara",
            "match": match,
            "team_a": match.team_a,
            "team_b": match.team_b,
            "games": games,
        },
    )


@staff_required
@require_POST
def match_delete(request, pk):
    get_object_or_404(Match, pk=pk).delete()
    messages.success(request, "Gara eliminata.")
    return redirect("match_list")


@staff_required
def player_search(request):
    q = request.GET.get("q", "").strip()
    if len(q) < 3:
        return JsonResponse({"results": []})
    names = Player.objects.filter(name__icontains=q).values_list("name", flat=True)[:10]
    return JsonResponse({"results": list(names)})


# ------------------------------------------------- azioni in diretta (AJAX) --
@staff_required
@require_POST
def game_point(request, pk):
    side = request.POST.get("side")
    try:
        delta = int(request.POST.get("delta", "0"))
    except ValueError:
        delta = 0
    if side not in ("a", "b") or delta not in (-1, 1):
        return JsonResponse({"error": "Richiesta non valida."}, status=400)

    with transaction.atomic():
        game = get_object_or_404(Game.objects.select_for_update(), pk=pk)
        was_finished = game.finished
        if was_finished and delta > 0:
            return JsonResponse(
                {"error": "Partita già conclusa. Togli un punto se devi correggere."},
                status=400,
            )
        field = f"score_{side}"
        value = max(0, min(WIN_SCORE, getattr(game, field) + delta))
        setattr(game, field, value)
        if game.finished:
            game.is_live = False          # finita: esce dalle partite in corso
        elif was_finished:
            game.is_live = True           # correzione: torna in corso
        game.save(update_fields=[field, "is_live"])
    return JsonResponse({"ok": True})


@staff_required
@require_POST
def game_live(request, pk):
    with transaction.atomic():
        game = get_object_or_404(Game.objects.select_for_update(), pk=pk)
        if game.finished:
            return JsonResponse({"error": "Partita già conclusa."}, status=400)
        if game.is_live:
            game.is_live = False
        else:
            live = Game.objects.filter(match=game.match, is_live=True).count()
            if live >= MAX_LIVE:
                return JsonResponse(
                    {"error": f"Ci sono già {MAX_LIVE} partite in corso. Ferma prima una partita."},
                    status=400,
                )
            game.is_live = True
        game.save(update_fields=["is_live"])
    return JsonResponse({"ok": True})


@staff_required
@require_POST
def start_next(request, pk):
    match = get_object_or_404(Match, pk=pk)
    with transaction.atomic():
        games = list(match.games.select_for_update())
        slots = MAX_LIVE - sum(1 for g in games if g.status == "live")
        for game in games:
            if slots <= 0:
                break
            if game.status == "pending":
                game.is_live = True
                game.save(update_fields=["is_live"])
                slots -= 1
    return JsonResponse({"ok": True})
