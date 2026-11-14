# FINALI

Tool per tracciare in tempo reale i risultati di un incontro a squadre (9 partite: 6 singoli + 3 doppi, si vince a 7).

- **Viewer**: apre la home e vede la diretta (si aggiorna da sola ogni 3 secondi).
- **Admin**: login, crea la gara, avvia le partite e segna i punti con + e −.

## Test in locale

    python -m venv venv
    # Windows:   venv\Scripts\activate
    # Mac/Linux: source venv/bin/activate
    pip install -r requirements.txt
    python manage.py migrate
    python manage.py createsuperuser
    python manage.py runserver

Apri http://127.0.0.1:8000/ (viewer) e http://127.0.0.1:8000/login/ (admin).
Per provare admin + viewer insieme usa una finestra in incognito.

## Regole modificabili

In `tracker/models.py`: `WIN_SCORE` (7), `MAX_LIVE` (2 partite insieme), `SHEET` (ordine singoli/doppi).

## Deploy

Vedi le istruzioni nella chat: database Neon + web service Render.
Start command: `gunicorn finali.wsgi:application` — Build command: `bash build.sh`
