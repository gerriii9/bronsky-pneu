# Pneuservis Bronsky – web

Statický web s administráciou (Decap CMS) pre Netlify. Bez npm závislostí: Netlify spustí `node build.js`, ktorý z obsahu v `content/` vygeneruje stránku do `dist/`.

## Štruktúra

```
content/        obsah webu (upravuje sa cez /admin)
  site.json       kontakt, adresa, otváracie hodiny, texty úvodu, SEO
  services.json   služby, cenník, popisky na fotke auta
  gallery.json    fotky dielne
src/            štýly, skript, obrázky, administrácia
  admin/          Decap CMS (config.yml = polia v administrácii)
build.js        generátor stránky
netlify.toml    nastavenie buildu
```

Lokálny náhľad: `node build.js`, potom otvor `dist/index.html` cez ľubovoľný lokálny server (napr. `npx serve dist`).

## Nasadenie na Netlify (raz)

1. **GitHub:** vytvor nový (môže byť súkromný) repozitár a nahraj doň celý tento priečinok. Vetva sa musí volať `main`.
2. **Netlify → Add new site → Import an existing project →** vyber repozitár. Nastavenia buildu sa načítajú z `netlify.toml`, netreba nič meniť.
3. **Rezervačný formulár:** Netlify → *Forms* → zapni *Form detection* a sprav nový deploy. Potom v *Forms → Form notifications* pridaj e-mail, kam majú chodiť rezervácie.
4. **Administrácia:**
   - *Site configuration → Identity* → **Enable Identity**
   - *Registration* prepni na **Invite only** (nech sa nemôže prihlásiť hocikto)
   - *Identity → Services → Git Gateway* → **Enable**
   - *Identity → Invite users* → pozvi e-mail majiteľa (aj svoj)
5. Majiteľ dostane e-mail, klikne na odkaz, nastaví si heslo a od tej chvíle sa prihlasuje na **tvojadomena.sk/admin**.

## Ako sa upravuje obsah

V `/admin` → *Obsah webu* → vybrať sekciu → upraviť → **Publish**. Netlify web automaticky prebuilduje, zmena je online zhruba do minúty.

## Dobré vedieť

- **Body a čiary na úvodnej fotke** sú naviazané na fotku `src/img/hero-1800.jpg` (súradnice v poli `HOT` v `build.js`). Ak sa fotka vymení, treba posunúť aj body.
- Prázdna cena v cenníku sa zobrazí ako „na otázku“.
- Netlify Identity a Git Gateway sú najjednoduchšie riešenie, pri ktorom majiteľ nepotrebuje účet na GitHube. Netlify pri nich v minulosti ohlásilo ukončenie a vo februári 2026 ho odvolalo, Git Gateway má ale v dokumentácii stále označenie „deprecated“. Ak by ho niekedy vypli, Decap CMS sa dá prepojiť cez externé prihlásenie (napr. DecapBridge) bez zmeny webu.
