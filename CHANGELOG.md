# Changelog

## v0.2.0 – 2026-10-05

### ⚠️ Vor dem Update lesen

1. **`SESSION_SECRET` setzen** in `.env.local` (`openssl rand -hex 32`).
2. **HTTPS-Reverse-Proxy erforderlich:** Der Container lauscht nur noch auf `127.0.0.1:3000`, und der Admin-Login funktioniert in Produktion nur über HTTPS.
3. **Zugangsdaten rotieren:** SMTP-Passwort, Admin- und Public-Passwort sowie `PUBLIC_ACCESS_TOKEN`. Sie waren in v0.1.x ohne Anmeldung abrufbar.
4. **Node.js 24** ist Voraussetzung (Node.js 20 ist End-of-Life).
5. Alle bestehenden Meldungen erhalten nach dem Update den Status **Neu**.

Update mit Docker:

```bash
git pull
docker compose build --pull
docker compose up -d
```

### Sicherheit

- Serverseitige Autorisierung: Der Admin-Login erzeugt eine signierte Session (HttpOnly-Cookie). Alle Admin-, Daten- und Debug-APIs sind ohne Anmeldung gesperrt (`401`).
- `/api/global-settings` gibt keine Passwörter oder Tokens mehr zurück.
- PDFs von Meldungen gibt es nur noch für Admins oder über einen zeitlich begrenzten Download-Link.
- Stored XSS über CMS-Inhalte behoben. Content-Security-Policy und weitere Security-Header sind gesetzt.
- Ratenlimit für Login, Token-Prüfung und Passwort-Anfrage.
- Uploads: Prüfung des echten Dateiinhalts, zufällige Dateinamen.
- Debug-Funktion „Alles löschen“ ist in Produktion deaktiviert.
- Abhängigkeiten aktualisiert (u. a. Next.js 16.3.8 mit Fixes für kritische Lücken, nodemailer 10). Ungenutzte Pakete entfernt. `npm audit` meldet 0 Lücken.

### Neu

- Bearbeitungsstatus für Meldungen: **Neu** / **Bearbeitet**, mit Zeitpunkt und Benutzer, Filter und Statistik (#3).
- Docker-Deployment auf Node.js 24 LTS: Non-Root, schreibgeschütztes Dateisystem, Healthcheck, `docker-compose.yml` und `docker-compose.prod.yml` (#4, #7).
- Optionales Bemerkungsfeld pro Arbeitgeber.

### Geändert

- Erfolgsseite: Hinweis zur Prüfung der Bestätigungsmail angepasst.
- README und Dokumentation (Architektur, Betrieb, Sicherheit) überarbeitet.

## v0.1.1 – 2026-03-04

- IP-Adresse des Absenders aus der E-Mail an die Sachbearbeitung entfernt.
- Upload-Buttons lösen kein versehentliches Absenden des Formulars mehr aus.
