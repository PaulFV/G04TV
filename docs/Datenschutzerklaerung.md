# Datenschutzerklärung — G04TV

Stand: 12. September 2026

## Kurz

G04TV ist eine reine Web-App ohne Betreiber-Backend. Es gibt **kein Benutzerkonto**, **keine Anmeldung**,
**keine Werbung**, **keine Analyse** und **kein Tracking**. Alles, was G04TV selbst speichert, bleibt in
dem Browser, in dem es eingetragen wurde. Ein vom Nutzer selbst eingetragener Vermittler/Proxy ist davon
zu unterscheiden: An ihn können Playlist- und Stream-Adressen einschließlich eingebetteter Zugangsdaten
übertragen werden.

## Verantwortlich und Kontakt

G04TV wird als Open-Source-Projekt **PaulFV/G04TV** veröffentlicht. Datenschutzfragen und Löschanfragen
können über die [G04TV GitHub Issues](https://github.com/PaulFV/G04TV/issues) gestellt werden. Vor einer
Google-Play-Veröffentlichung müssen Betreibername, rechtliche Anschrift und direkter Datenschutzkontakt
mit dem Play-Console-Konto abgeglichen und gegebenenfalls ergänzt werden.

## Welche Daten wo liegen

| Daten | Ablage | Zweck |
|:--|:--|:--|
| Playlisten: Name, Quelle (Adresse oder Dateiname), Zeitpunkt des letzten Ladens | `localStorage` des Browsers | Damit die Playlist beim nächsten Start wieder da ist |
| Senderlisten (Name, Adresse, Gruppe, Logo-Adresse je Sender) | `IndexedDB` des Browsers | Damit die Sender ohne erneuten Abruf zur Verfügung stehen |
| Xtream-Zugangsdaten (Server, Benutzer, Kennwort — als Teil der Abrufadresse) | `localStorage` des Browsers | Zum Abruf der Senderliste beim Anbieter |
| Favoriten, zuletzt gesehene Sender | `localStorage` des Browsers | Bedienung |
| Einstellungen (Lautstärke, Schalter, Vermittler) | `localStorage` des Browsers | Bedienung |

Es werden **keine Cookies** gesetzt, es findet **keine Analyse** und **kein Tracking** statt.

## Verbindungen nach außen

G04TV baut nur die Verbindungen auf, die für die Wiedergabe nötig sind:

* **Dein Anbieter.** Playlist und Streams werden direkt von der Quelle geholt, die du eingetragen
  hast. Der Anbieter sieht dabei — wie bei jedem Abruf im Netz — deine IP-Adresse, den Zeitpunkt und
  die abgerufene Adresse.
* **Senderlogos.** Die Bildadressen stehen in der Playlist und werden von dort geladen.
* **hls.js / mpegts.js.** Nur wenn ein Format sie braucht und sie nicht im Ordner `vendor/`
  hinterlegt sind, werden sie von `cdnjs.cloudflare.com` bzw. `cdn.jsdelivr.net` geladen.
* **Vermittler (Proxy).** Nur wenn du unter *Einstellungen › Playlisten aus dem Netz* selbst einen
  einträgst und einschaltest. Er sieht dann die vollständige Adresse der Playlist einschließlich
  etwaiger Zugangsdaten. Voreingestellt ist keiner.
  Ist zusätzlich *Auch Streams über den Vermittler* eingeschaltet, läuft **der gesamte
  Videoverkehr** über ihn — er sieht dann auch, welchen Sender du wie lange schaust. Betreibst du
  den Vermittler selbst (siehe `proxy/`), bleibt das in deiner Hand; bei einem fremden nicht.
  Gegenüber deinem Anbieter tritt in diesem Fall der Vermittler an deine Stelle: dessen
  IP-Adresse wird sichtbar, nicht mehr deine.

Wird G04TV über GitHub Pages aufgerufen, gelten für das Ausliefern der Programmdateien die
Bedingungen von GitHub; dabei fällt serverseitig die IP-Adresse an. Über `file://` oder einen
eigenen Webserver entfällt auch das.

## Löschen

*Einstellungen › Daten auf diesem Gerät › Alles löschen* entfernt Playlisten, Senderlisten,
Favoriten, Verlauf und Einstellungen restlos. Dasselbe erreicht das Löschen der Website-Daten im
Browser.

## Google Play

Für eine Veröffentlichung im Google Play Store muss die Data-Safety-Erklärung in der Play Console die
tatsächlich ausgelieferte Android-Version, die TWA und alle verwendeten Bibliotheken abbilden. Auch wenn
G04TV kein Konto und kein Tracking hat, können vom Nutzer eingetragene Adressen an den gewählten Anbieter
oder einen aktivierten Proxy gesendet werden. Die Angaben dürfen deshalb nicht pauschal als „keine
Datenübertragung“ eingetragen werden.

## Inhalte

Für die Inhalte der eingetragenen Quellen ist allein die Person verantwortlich, die sie einträgt. Siehe
auch den [Copyright- und Inhaltshinweis](../copyright.html).
