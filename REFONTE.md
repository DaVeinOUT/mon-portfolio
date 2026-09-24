# REFONTE.md — Audit du portfolio, avant tout code

Date : 2026-09-24 · Branche : `redesign/v2` (créée depuis `master`, aucun fichier du dépôt modifié)

Réglages appliqués : DESIGN_VARIANCE 7 · MOTION_INTENSITY 5 · VISUAL_DENSITY 4.

---

## 0. LE BUG À TROUVER — pourquoi tout le monde tombe sur le terminal

**Ce n'est ni `vercel.json`, ni un meta refresh, ni `window.location` dans `main.js`. Ces trois suspects sont innocents :**

- `master:vercel.json` (7 lignes) contient un `rewrites` vers `/index.html`, mais **il n'est pas déployé** — voir ci-dessous.
- `master:index.html` ne contient aucune balise `meta refresh` ni `window.location`.
- `master:main.js` ne fait aucune redirection ; il ne pilote que l'UI (burger, reveals, canvases projets, transition boot).

**La vraie cause : le projet Vercel `mon-portfolio-two-gamma` est configuré sur la branche `main` avec un Root Directory = `docs/`.**

Preuves, mesurées en direct sur `https://mon-portfolio-two-gamma.vercel.app` :

1. La page servie à `/` est **octet pour octet** `main:docs/index.html` (diff avec le fichier de la branche `main` : identique). C'est le terminal (`<div id="terminal-window">`, titre « Dorelus Davidson — Portfolio », prompt `davidson@portfolio:~`). Le terminal s'affiche directement, sans aucune redirection côté client.
2. `https://…/vercel.app/styles.css` sert `main:docs/styles.css` (variables `--bg: #0b0b0b`, fenêtre terminal plein écran) — pas la feuille de `master`.
3. `https://…/vercel.app/main.js` sert `main:docs/main.js` — l'ancien code terminal (en-tête « TERMINAL PORTFOLIO — main.js / Dorelus Davidson »).
4. Les pages de la branche `main` racine (`/about`, `/projects`, `/contact`) renvoient **404** en production : elles ne sont pas dans `docs/`, donc pas déployées.
5. `master` n'est **pas** la branche de production : son `index.html` (réseau 3D, `gl-canvas`) n'apparaît nulle part sur l'URL live (`grep gl-canvas` = 0).

Historique qui explique l'accident : le commit `947c5b7` (« Déploie le terminal portfolio sur Vercel (racine du repo) ») puis `30f2a43` (« refonte: page classique minimaliste + terminal en mode alternatif ») ont déployé le terminal **à la racine**. Ensuite, le terminal a été déplacé dans `docs/` sur `main`, et le projet Vercel a gardé Root Directory = `docs/` alors que le vrai site (réseau 3D) vit désormais sur `master`. Résultat : chaque déploiement publie l'ancien terminal, et le réseau 3D n'a jamais été en ligne. Aucun recruteur ne l'a jamais vu.

**Correctif (action de ta part, côté Vercel, pas de code) :** dans le dashboard Vercel → Settings → General : Production Branch = `master`, Root Directory = vide (racine du dépôt). Redéployer. À la livraison, le site 3D existera enfin en ligne ; jusqu'à ce réglage, tout le reste de la refonte serait invisible.

---

## 1. Ce qui fonctionne déjà et doit survivre

Lu dans les 7 fichiers de `master` (`index.html`, `main.js`, `styles.css`, `terminal.html`, `terminal.js`, `terminal.css`, `vercel.json`).

- **La scène 3D à budget maîtrisé** (`index.html:194-554`) : 510 particules desktop / 255 mobile (`index.html:219`), formations recomposées par interpolation selon la station scrollée, DPR plafonné (`index.html:224`), fallback `no3d` propre (`index.html:203`, `styles.css:73-77`). Le squelette est bon, il est sous-exploité (voir idée signature).
- **Le terminal complet** (`terminal.js`, ~67 Ko) : 28 commandes, autocomplétion Tab, historique flèches, 7 thèmes, snake jouable, konami code, mode recruteur (`alternance`, `sudo hire davidson`). C'est un vrai produit. Il survit, en easter egg.
- **Les fondations accessiilité** : `:focus-visible` doré global (`styles.css:47`), `prefers-reduced-motion` complet (`styles.css:579-589`) y compris marquees qui se transforment en grille statique, sr-only sur les dots (`index.html:53-59`), skip des animations quand `REDUCED` dans les deux moteurs JS.
- **Le SEO social de base** : JSON-LD Person avec téléphone et email (`index.html:21-31`), OG tags, `theme-color`.
- **L'économie du scroll** : sections courtes, hiérarchie claire (sec-num → h2 → une idée par station), marquees de compétences lisibles en 2 lignes avec légende « acquis / au programme » (`index.html:104-119`).
- **Le souci perf réel** : IntersectionObserver qui coupe les canvases 2D hors écran (`main.js:11-27`), pause sur `visibilitychange` (`main.js:29`), import dynamique de Three.js (`index.html:203`). L'ADN de la contrainte « 60 fps » est déjà là.

## 2. Ce qui fait amateur — fichier:ligne à l'appui

**Contenu : ce qui fait le plus mal.**

- **Fausse piste biographique** : le brief dit « Bac général (SES/NSI) en Guyane, licence info Université de Guyane, admis chez Simplon en Technicien Réseaux ». Le site raconte autre chose : « Bac général et technologique — Guyane » (`index.html:96`), « Piscine École 42 » (`index.html:98`), « OpenClassrooms · bac+2 RNCP 5 » (`index.html:99`), 10 mois d'installateur d'équipements sportifs (`terminal.js:351-365`). **Je ne peux pas arbitrer** : TODO visible — confirme le parcours réel (École 42 ? OpenClassrooms ? Simplon ? licence Guyane ?) et les expériences pro à afficher.
- **Projets faux par rapport au brief** : le site met Médecin Proche, Algo Visualizer et « Ce portfolio » (`index.html:127-151`). Le brief cite aussi **EDUCA** (jeu OpenDyslexic pour ton petit frère) et le **VPS Hetzner** administré (Docker, tunnels SSH, pare-feu). Le serpent Raspberry Pi à matrice de LED, « là où ça a commencé », n'apparaît nulle part. TODO : liens réels vers EDUCA (GitHub ?) et ce que je peux dire du VPS sans le compromettre.
- **Chiffres non sourcés partout dans le terminal** : barres de compétences à 80 %, 65 %, 60 %… (`terminal.js:283-296`), « Motivation @ 100% » (`terminal.js:1213`), « Codecademy 31% » (`terminal.js:624`). Exactement ce que ton brief interdit. À remplacer par des faits vérifiables ou supprimés.
- **Inversion du nom dans le terminal** : « Dorelus Davidson » (`terminal.js:172`, `terminal.js:3`) alors que partout ailleurs c'est « Davidson Dorelus » (`index.html:7,25,183`). Un recruteur qui imprime voit deux identités.

**Code et UX :**

- **Pas de feuille d'impression** : `grep "@media print"` = 0 dans les trois feuilles. Un PDF du site = page noire, canvas vides. Ton brief l'exige ; c'est absent.
- **Pas de skip-link** (`index.html`, grep "skip" = 0) alors que la nav suit 6 sections ; navigable au clavier mais pas « navigable confortable ».
- **Tirets cadratins interdits par le brief, présents partout** : `index.html:7,9,10,69,71,78,81…` — chaque « — » des textes doit devenir une construction sans cadratin (le titre `<title>` et le JSON-LD aussi).
- **`min-height: 100vh`** comme fallback (`styles.css:157`) : le fallback existe pour les vieux navigateurs, correct ; mais `100vh` est la valeur évaluée en premier sur iOS Safari. Inverser : `100svh` en premier, `100vh` en secours.
- **`backdrop-filter: blur()` cumulés** sur nav (`styles.css:83-84`) + cartes projets (`styles.css:395-396`) + terminal, avec des dizaines de `text-shadow` par-dessus le canvas 3D qui tourne derrière : c'est le cocktail saccades mobile classique. À alléger sur iPhone.
- **La « typo cinétique »** (`main.js:74-131`) fait un `getBoundingClientRect()` **par lettre, par pointermove** sur un nom en 8rem : jank garanti desktop, inutile mobile (elle se coupe, mais elle survit inutilement dans le bundle). À fondre dans l'idée signature ou à retirer.
- **Le réseau ne dit rien** : les nœuds sont décoratifs, sans label ni lien (`index.html:194-554`). Le brief a raison : « tourner en boucle dans le vide ».
- **Trois polices chargées, mais Inter** (`index.html:16`) : c'est la police par défaut de tout le web en 2026 ; le duo Syne + JetBrains Mono suffirait à lui seul (2 polices < 3, cohérence en hausse).
- **`three.module.js` non minifié** via importmap (`index.html:18-20`) : **575 Ko bruts / 110 Ko gzip** mesurés sur le CDN, contre **339 Ko bruts / 79 Ko gzip** pour `three.module.min.js`. ~31 Ko gzip économisés sur le chemin critique pour un `s/`.js/.min.js/`.
- **Nav mobile** : le menu burger existe mais les dots latéraux chevauchent le contenu en 320px (`styles.css:331` : `right: 12px`) et le scroll-cue cache les CTA sur petits écrans (il est masqué < 720px, ok, mais reste entre 720-860px).
- **`main.js:3` ment** : le commentaire dit « la scène 3D vit dans scene.js » — `scene.js` n'existe pas, la scène est inline dans `index.html:194`. Commentaire mort qui piège le prochain lecteur.
- **Meta description du terminal** (`terminal.html:7`) : « Dorelus Davidson — Technicien IT & Déve… » sans mention alternance, et indexable. Si le terminal doit devenir easter egg, il doit sortir de l'index (`noindex`).

## 3. L'IDÉE SIGNATURE (proposition)

**« La carte du réseau » : le hero devient un plan de réseau vivant où chaque nœud est une étape réelle de ta vie, et le voyage scrollé devient un `traceroute` de toi.**

Aujourd'hui la scène (`index.html:194-554`) calcule 6 formations abstraites (sphère, nébuleuse, clusters, câble, trio, anneau) qui se fondent au scroll : c'est joli, ça ne veut rien dire. La proposition garde l'architecture (points + arêtes + impulsions, même budget) mais remplace les coordonnées aléatoires par **un graphe réel, écrit à la main** : Raspberry Pi → EDUCA, Bac Guyane → Université de Guyane → Métropole, Fibre Solutions 30 → terrain réseau, VPS Hetzner → Docker/SSH/pare-feu, Médecin Proche → le problème de ton frère, jusqu'aux nœuds « ton poste » qui clignotent en vert (dispo). Chaque nœud principal (10-14 nœuds, pas 500) est survolable/tappable : un label apparaît, un clic scroll vers la section qui le raconte. Les 500 particules restantes deviennent le trafic de fond ; les impulsions vertes existantes deviennent des **paquets qui suivent des liens qui ont du sens** (Guyane → Paris, Raspberry Pi → EDUCA). Changer de section = recomposer le graphe autour du sous-réseau correspondant, exactement comme le moteur actuel interpole déjà les formations (`index.html:504-506`) : on garde la mécanique prouvée, on change la sémantique. Le terminal, lui, devient un vrai `traceroute` de fin de page : hop 1 le lycée à Cayenne, hop 5 ton VPS, « * * * en attente de réponse — contacte-moi » (`terminal.js` l'a déjà, `cmdTraceroute`, il survivra tel quel).

**Le second regard** : la commande console déjà présente (`main.js:310-314`) devient une porte ; à la deuxième visite, un nœud discret en haut à droite du graphe — étiqueté `192.168.1.42` — révèle le mini-terminal ou le serpent. Un clin d'œil qu'un recruteur curieux montrera à son collègue ; un recruteur pressé ne le verra jamais, et c'est le but.

Argumentaire : c'est le seul concept qui transforme la contrainte « réseau = métier » en démonstration plutôt qu'en métaphore ; il réutilise 90 % du moteur 3D existant (donc budget perf tenu) ; il rend la 3D **utile à la navigation** (clic = section) au lieu de décorative ; et il donne au site sa propre signature, impossible à confondre avec un template.

## 4. TROIS DIRECTIONS VISUELLES (avec leurs compromis)

Base commune non négociable : fond `#0a0a0d`, accents `#e8c56a` (or) et `#5ef0b0` (vert ping), français, contenu actuel.

**A — « Plan technique » (recommandée, DESIGN_VARIANCE 7, DENSITY 4).** Traitement de documentation réseau : grille millimétrique ultra-discrète en fond, nœuds du graphe légendés comme un schéma d'architecture (police mono pour les labels, or pour l'infrastructure, vert pour le vivant), sections séparées par des règles fines façon `ethtool`/`htop` plutôt que par du vide. Les trois preuves deviennent des « fiches de ports ». Compromis : plus dense visuellement, le hero doit respirer à la main ; risque de froideur si les textes ne réchauffent pas (d'où les phrases du brief : « J'apprends en construisant »).

**B — « Rétroterminal éditorial » (DENSITY 3).** Tout ce qui n'est pas le graphe est typographie éditoriale massive : très grande Syne, blancs généreux, une seule couleur par section, le mono réservé aux métadonnées (ports, dates, versions). Le terminal et le site partagent visuellement le même ADN (bordure dorée, scanlines légères). Compromis : moins de densité d'information par écran — les « 40 secondes » du recruteur pressé exigent alors le mode « Version rapide » dès la première vue, et le scroll s'allonge.

**C — « Signal / oscilloscope » (MOTION_INTENSITY 5).** Le fil conducteur devient l'onde : le soulignement des titres est un signal qui se propage, les liens entre sections sont des impulsions, le hero affiche une trace animée du mot « alternance ». Beaucoup de mouvement mais vectoriel (SVG/transform), pas de bitmaps. Compromis : le plus coûteux en attention, le plus dur à faire tenir 30 fps sur iPhone avec la 3D derrière ; à réserver aux moments de pause (fin de section) sous peine de faire vomir la moitié du jury en plein écran.

## 5. BUDGET DE PERFORMANCE — chiffré et mesurable

Cibles (ton brief, traduites en chiffres mesurables) :

| Contrainte | Cible chiffrée | Comment je le mesure |
|---|---|---|
| Particules | ≤ 1200 desktop (graphe sémantique + trafic), ≤ 500 mobile ; nœuds cliquables ≤ 14 | compte dans le code + `renderer.info.render.calls` en console debug |
| fps | 60 desktop / ≥ 30 mobile (moyenne mobile sur 10 s) | onglet Rendu des DevTools + `about:debugging` ; sur iPhone : le mode FPS de Safari Technology Preview, sinon [stats.js](https://github.com/mrdoob/stats.js) temporaire retiré avant livraison |
| Premier écran lisible avant la 3D | HTML+CSS critiques peints **< 1,2 s en 4G simulée** (throttling Fast 3G/4G Lighthouse), Three.js chargé après `requestIdleCallback`/intersection hero | Lighthouse mobile (4G) → métrique FCP/ LCP ; le canvas démarre invisible puis fade-in |
| 3 s jusqu'au premier affichage en 4G | budget total : HTML ≤ 20 Ko gz (actuel : ~12,5 Ko gz mesuré sur le HTML de prod), CSS ≤ 14 Ko gz (15,6 Ko non-gz aujourd'hui), Three.js **min** 79 Ko gz sur CDN après FCP, polices : 2 familles en `font-display: swap` | Lighthouse mobile + `curl -H "Accept-Encoding: gzip"` sur chaque ressource (commande que j'ai déjà utilisée pour mesurer 110 Ko → 79 Ko) |
| `prefers-reduced-motion` | 0 rafLoop actif, 0 keyframe : le graphe 3D rend en **une frame statique** (rendu unique, pas de boucle), marquees déjà gérés (`styles.css:579`) | émulation "reduce" DevTools + vérifier `requestAnimationFrame` jamais rappelé (`index.html:551` le fait déjà : à généraliser) |
| Pas de WebGL | déjà prévu : `catch` → classe `no3d` (`index.html:203`, styles.css:73) + **renforcé** : un dégradé CSS statique + le graphe redessiné en SVG inline (lisible, cliquable) | désactiver WebGL dans about:config / simulate WebGL unavailable |
| Onglet en arrière-plan | pause de la boucle 3D par `visibilitychange` (le 2D le fait déjà, `main.js:29` ; la 3D doit l'ajouter) | `document.hidden` + onglet en veille 30 s → timer fps figé |
| Poids total chemin critique | ≤ 110 Ko gz avant interaction 3D (HTML+CSS+JS vanilla), 3D et polices en différé | budget Lighthouse "performance budget" vérifié à chaque commit |

Comment je le mesure à la livraison : rapport Lighthouse mobile (4G) enregistré dans le rapport final, plus une passe iPhone réelle de ton côté (ta checklist) ; je joins les valeurs mesurées pour chaque ligne.

---

## Ce que je n'ai pas modifié

Aucun fichier du dépôt. La branche `redesign/v2` a été créée depuis `master` dans une copie de travail (`mon-portfolio-v2/`) ; `master` n'a subi aucune modification (vérifiable : `git status` clean dans le dépôt d'origine).

## Questions bloquantes avant validation (TODO visibles)

1. **Le réglage Vercel** (section 0) : c'est une action dans ton dashboard, pas dans mon code. À faire dès que tu valides ce document pour que le site actuel (v4 master) soit au moins visible en ligne.
2. **Parcours réel** : École 42 / OpenClassrooms / Simplon / licence Guyane — que retient-on, et dans quel ordre ?
3. **EDUCA et le VPS Hetzner** : liens et périmètre public (sans exposer d'adresses IP).
4. **Le serpent Raspberry Pi** : je propose d'en faire le nœud racine du graphe (« là où tout a commencé ») — confirmes-tu cette place, et veux-tu une photo ou un schéma de la manette ?

Validation de ce document = feu verte pour la phase 2 : la refonte sur `redesign/v2`, en commençant par corriger ce que la prod sert réellement.