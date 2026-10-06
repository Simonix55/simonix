# AgentSuper: Registrierung mit E-Mail-Code

Ablauf: Registrieren → Code per E-Mail → Code auf der Seite eingeben → Konto wird angelegt.
Der Code wird auf dem Server geprüft (6 Stellen, 10 Minuten gültig, 5 Versuche, 60 s Pause zwischen zwei Codes, nur einmal verwendbar).

## Ordner
- `public/index.html` – die Website
- `netlify/functions/send-code.mjs` – erzeugt und verschickt den Code (`/api/send-code`)
- `netlify/functions/verify-code.mjs` – prüft den Code (`/api/verify-code`)
- `netlify/functions/google-login.mjs` – prüft das Google-Token (`/api/google-login`)
- `netlify/functions/lib/google.mjs` – Prüfung des Google-ID-Tokens (Signatur, Aussteller, Client-ID, Ablauf)
- `netlify/functions/ai-chat.mjs` – die KI (`/api/ai-chat`), nur für bestätigte Nutzer
- `netlify/functions/lib/session.mjs`, `lib/ai.mjs` – signierte Anmelde-Token und KI-Logik
- `netlify/functions/discord-count.mjs` – liest die Mitgliederzahl des Discord-Servers (`/api/discord-count`)
- `netlify/functions/youtube-latest.mjs` – liefert das neueste Video von @SimonixWad aus dem öffentlichen RSS-Feed (`/api/youtube-latest`, kein API-Key nötig)
- `netlify/functions/discord-chat.mjs` – nimmt Chat-Nachrichten der Website an und schickt sie per Webhook nach Discord (`/api/discord-chat`)
- `tests/auth.test.mjs`, `tests/google.test.mjs`, `tests/discord.test.mjs`, `tests/youtube.test.mjs`, `tests/ai.test.mjs` – Tests (`npm test`)

## Einrichtung
1. Bei https://resend.com ein Konto anlegen und einen API-Key erzeugen.
   Zum Testen darf Resend nur an deine eigene Adresse senden. Für echte Besucher musst du dort eine eigene Domain verifizieren.
2. In Netlify unter *Site configuration → Environment variables → Add a variable* anlegen:
   - `RESEND_API_KEY` – dein Resend-Key (beginnt mit `re_`). **Das ist die einzige Pflicht-Variable.** Bei „Scopes“ muss **Functions** (am besten alle) angehakt sein, sonst sieht die Funktion die Variable nicht. Bei „Deploy contexts“ muss **Production** dabei sein.
   - `GOOGLE_CLIENT_ID` (optional, für „Weiter mit Google“) – OAuth-Client-ID (Typ „Webanwendung“) aus der Google Cloud Console. Unter „Autorisierte JavaScript-Quellen“ muss deine Seiten-Adresse stehen, z. B. `https://agentsuper.netlify.app`. Ohne diese Variable wird der Google-Button einfach nicht angezeigt.
   - `MAIL_FROM` (optional) – Absender, z. B. `AgentSuper <noreply@deine-domain.de>`. Ohne Angabe wird `AgentSuper <onboarding@resend.dev>` genutzt, das darf aber nur an deine eigene Resend-Adresse senden.
   - `CODE_SECRET` (optional) – eigenes Geheimnis. Ohne Angabe erzeugt die Funktion beim ersten Start selbst eins.
3. Diesen Ordner deployen, am besten über ein Git-Repository bei Netlify oder mit `npx netlify deploy --prod`.
   Functions brauchen einen Build mit `npm install`, ein reines Hochladen einzelner Dateien reicht dafür nicht.
4. Seite öffnen. Die Statusleiste oben zeigt „Registrierung per E-Mail“ als „Läuft“, sobald alles eingerichtet ist.

## KI kostenlos nutzen
Nach der Anmeldung können Besucher mit der KI chatten (Claude von Anthropic, standardmäßig das günstige Modell Haiku 4.5).
1. Unter https://console.anthropic.com einen API-Key erzeugen (Guthaben aufladen) und in Netlify als `ANTHROPIC_API_KEY` eintragen (Scope **Functions**), danach neu deployen.
2. Optional: `AI_DAILY_LIMIT` (Nachrichten pro Person und Tag, Standard 20) und `AI_MODEL` (anderes Modell).
Die KI antwortet nur, wenn sich die Person per Google oder E-Mail-Code bestätigt hat (signiertes Token, 30 Tage gültig). Wer sich nur mit Passwort anmeldet, bekommt im Chat den Button „Jetzt bestätigen“.
Ohne `ANTHROPIC_API_KEY` antwortet weiter der einfache Bot (Rechnen, Uhrzeit, Hauptstädte, Witze). **Die Kosten trägst du**, daher das Tageslimit. Netlify-Funktionen haben standardmäßig 10 Sekunden Zeit, die Antworten sind deshalb auf etwa 500 Token begrenzt.

## Live-Chat mit Discord
1. In Discord: Kanal → *Einstellungen → Integrationen → Webhooks → Neuer Webhook* → *Webhook-URL kopieren*.
2. Der Webhook für #website steht in `netlify/functions/lib/webhook.mjs`. Alternativ (sicherer) in Netlify die Variable `DISCORD_WEBHOOK_URL` setzen (Scope **Functions**), sie hat Vorrang. Die URL ist geheim: nie in `index.html` einfügen und die Datei nicht in ein öffentliches Repository legen.
3. Nachrichten erscheinen im Kanal als „Name (Website)“. Mentions wie @everyone sind abgeschaltet, Limit: 1 Nachricht alle 5 s und 10 pro 10 Minuten pro Besucher.
Die Richtung ist Website → Discord. Antworten aus Discord erscheinen nicht auf der Seite.

## Wichtig
Die Konten selbst (Passwort-Hash) liegen weiterhin nur im Browser des Besuchers (`localStorage`). Der Code beweist, dass jemand Zugriff auf die E-Mail-Adresse hat, ersetzt aber keine Server-Konten. Wer die Browserdaten ändert, kann sich selbst als „verifiziert“ markieren.

## Übergangsmodus
Solange der E-Mail-Dienst nicht eingerichtet ist (Funktion antwortet mit 503 „config“ oder 404), legt die Seite Konten **ohne** Code an und markiert sie als `verified:false`. Die Statusleiste bleibt grün, in den Details steht bei „Registrierung per E-Mail“ in Gelb „Aus, Registrierung ohne Code“. Sobald `RESEND_API_KEY` gesetzt ist und neu deployt wurde, ist der Code Pflicht. Bei Netzwerk- oder Mailfehlern gibt es nie einen Übergang ohne Code.

## Fehlersuche
Klick oben auf die Statusleiste („Details“). Dort steht bei „Registrierung per E-Mail“ die Ursache:

| Anzeige | Bedeutung | Lösung |
|---|---|---|
| Funktion nicht gefunden (nicht deployt) | `/api/send-code` existiert nicht | Ordner per `npm install` und `npx netlify deploy --prod` oder per Git deployen. Es reicht nicht, nur `public/` hochzuladen. |
| RESEND_API_KEY fehlt (anlegen, Scope Functions, neu deployen) | Die Variable ist nicht angelegt oder gilt noch nicht | `RESEND_API_KEY` anlegen, danach **neu deployen** (Variablen gelten erst für neue Deploys) und die Hauptadresse `agentsuper.netlify.app` öffnen, nicht eine alte Deploy-Adresse. |
| Serverfehler (Status 500) | Funktion stürzt ab | In Netlify unter *Logs → Functions* nachsehen. |

Meldet die Registrierung selbst „(Fehler 502 mail 403)“, hat Resend die Mail abgelehnt. Die Zahl am Ende ist der Resend-Status:
- `403` oder `422`: Absender (`MAIL_FROM`) gehört zu keiner verifizierten Domain, oder du sendest mit `onboarding@resend.dev` an eine fremde Adresse (erlaubt ist dann nur deine eigene).
- `401`: `RESEND_API_KEY` ist falsch.
Die genaue Antwort von Resend steht in den Netlify-Function-Logs.
