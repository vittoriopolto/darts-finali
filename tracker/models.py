from django.db import models

# --- Regole del gioco (modificabili qui) ---------------------------------
WIN_SCORE = 3   # vince chi arriva a 7
MAX_LIVE = 2    # partite giocate in contemporanea

SINGLE = "S"
DOUBLE = "D"
KIND_CHOICES = [(SINGLE, "Singolo"), (DOUBLE, "Doppio")]

# Foglio gara: ordine delle 9 partite
SHEET = [SINGLE, SINGLE, DOUBLE, SINGLE, SINGLE, DOUBLE, SINGLE, SINGLE, DOUBLE]


class Player(models.Model):
    """Giocatori già usati: servono solo per i suggerimenti mentre si scrive."""

    name = models.CharField(max_length=60, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Match(models.Model):
    """Un incontro tra due squadre (9 partite). Squadra A è sempre la nostra."""

    team_a = models.CharField(max_length=60, default="Squadra A")
    team_b = models.CharField(max_length=60, default="Squadra B")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.team_a} vs {self.team_b}"

    @property
    def wins_a(self):
        return sum(1 for g in self.games.all() if g.winner == "a")

    @property
    def wins_b(self):
        return sum(1 for g in self.games.all() if g.winner == "b")


class Game(models.Model):
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="games")
    order = models.PositiveSmallIntegerField()
    kind = models.CharField(max_length=1, choices=KIND_CHOICES)
    a1 = models.CharField(max_length=60, blank=True, default="")
    a2 = models.CharField(max_length=60, blank=True, default="")
    b1 = models.CharField(max_length=60, blank=True, default="")
    b2 = models.CharField(max_length=60, blank=True, default="")
    score_a = models.PositiveSmallIntegerField(default=0)
    score_b = models.PositiveSmallIntegerField(default=0)
    is_live = models.BooleanField(default=False)

    class Meta:
        ordering = ["order"]
        unique_together = [("match", "order")]

    def __str__(self):
        return f"Partita {self.order} ({self.get_kind_display()})"

    @property
    def finished(self):
        return max(self.score_a, self.score_b) >= WIN_SCORE

    @property
    def winner(self):
        if self.score_a >= WIN_SCORE:
            return "a"
        if self.score_b >= WIN_SCORE:
            return "b"
        return None

    @property
    def status(self):
        if self.finished:
            return "finished"
        if self.is_live:
            return "live"
        if self.score_a or self.score_b:
            return "paused"
        return "pending"

    def _names(self, first, second):
        if self.kind == DOUBLE:
            return [first or "—", second or "—"]
        return [first or "—"]

    @property
    def names_a(self):
        return self._names(self.a1, self.a2)

    @property
    def names_b(self):
        return self._names(self.b1, self.b2)
