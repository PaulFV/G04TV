# GoTV — Vermittler (Cloudflare Worker)

Ein kleiner Server, der Playlisten und Streams stellvertretend holt und über **HTTPS mit
CORS-Kopfzeilen** zurückgibt. Damit fallen die beiden Grenzen weg, an denen ein Browser sonst
scheitert:

| Grenze | Was der Vermittler tut |
|:--|:--|
| **CORS** — der Anbieter erlaubt das Lesen aus dem Browser nicht | Er setzt selbst `Access-Control-Allow-Origin: *` |
| **Mixed Content** — GoTV läuft über `https`, der Sender über `http` | Er liefert alles über `https` aus |
| **User-Agent-Sperre** — der Anbieter antwortet nur bekannten Abspielern | Er gibt sich als `VLC/3.0.20` aus; ein Browser darf das nicht |

Bei einer **HLS-Playlist** bleibt es nicht beim Durchreichen: die Adressen der Segmente, der
Varianten-Manifeste, der Verschlüsselungsschlüssel (`#EXT-X-KEY`), der Initialisierungsdateien
(`#EXT-X-MAP`) und der Tonspuren (`#EXT-X-MEDIA`) werden im Text umgeschrieben, damit auch sie über
den Vermittler laufen. Sonst holt der Browser sie wieder direkt — und blockt.

---

## Einrichten

```bash
cd proxy
npx wrangler login
npx wrangler secret put KEY
npx wrangler deploy
```

`wrangler deploy` nennt am Ende die Adresse, etwa
`https://gotv-proxy.dein-name.workers.dev`.

In GoTV unter **Einstellungen › Playlisten aus dem Netz** eintragen:

```
https://gotv-proxy.dein-name.workers.dev/?url={url}&key=DEIN_SCHLUESSEL
```

Dann **Vermittler verwenden** einschalten — und, wenn auch das Bild darüber laufen soll,
zusätzlich **Auch Streams über den Vermittler**.

Ein Aufruf der Worker-Adresse ohne `?url=` zeigt eine kurze Auskunft: ob ein Schlüssel gesetzt ist
und welche Anbieter erlaubt sind.

---

## Einstellungen

| Name | Art | Bedeutung |
|:--|:--|:--|
| `KEY` | Secret | Ohne passenden `&key=` antwortet der Worker mit **401**. **Unbedingt setzen** — ein offener Vermittler wird binnen Tagen von Fremden benutzt. |
| `ALLOW` | Variable in `wrangler.toml` | Komma-getrennte Liste erlaubter Hosts, Subdomains inbegriffen. Leer = alle. Beispiel: `anbieter.tv,iptv-org.github.io` |

---

## Was du wissen solltest

* **Die gesamte Bandbreite läuft über den Worker.** Ein 5-Mbit-Stream sind rund **2,2 GB je Stunde
  und Zuschauer**. Das kostenlose Kontingent von Cloudflare zählt Anfragen (100.000/Tag) — bei HLS
  ist jedes Segment eine Anfrage, also etwa **900 Anfragen je Stunde und Sender**. Zum Fernsehen für
  sich selbst reicht das bequem; als Verteilstelle für andere ist es nicht gedacht.
* **Der Vermittler sieht alles**, auch Xtream-Benutzer und -Kennwort in der Adresse. Bei einem
  eigenen Worker ist das in Ordnung — trage niemals einen fremden Proxy ein.
* **Auf dem iPhone** hilft er bei HLS zuverlässig. Rohes **MPEG-TS** bleibt dort unabspielbar, das
  liegt an iOS und nicht am Vermittler.
* **Spulen** funktioniert: `Range`-Anfragen werden durchgereicht.

---

## Ohne Cloudflare

Der Worker ist gewöhnliches JavaScript mit `export default { fetch }`. Dieselbe Datei läuft ohne
Änderung auch auf **Deno Deploy**; für Node genügt ein dünner Rahmen um `fetch`. Der einzige
Cloudflare-Bezug ist `wrangler.toml`.
