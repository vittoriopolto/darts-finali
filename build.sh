#!/usr/bin/env bash
# Eseguito da Render a ogni deploy
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate --no-input

# Crea l'utente admin (solo la prima volta) usando le variabili
# DJANGO_SUPERUSER_USERNAME / _EMAIL / _PASSWORD. Se esiste già, prosegue.
python manage.py createsuperuser --no-input || true
