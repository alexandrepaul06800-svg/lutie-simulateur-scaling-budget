# Outil D — Simulateur de scaling budget

## Nom public
**"Que va-t-il se passer si j'augmente mon budget ?"**
Slug suggéré : `/outils/simulateur-scaling`

## Résumé
Modélise ce qui arrive au ROAS et à la rentabilité quand on augmente le budget Google Ads, selon 3 scénarios (optimiste, réaliste, pessimiste). Aide à anticiper la dégradation avant de décider.

## Cible principale
Profil 1 — E-commerce en croissance
Profil 2 — Scale-up / PME B2B lead gen

## Douleur adressée
"On a doublé le budget mais le ROAS est passé de 4 à 2,2." C'est LA phrase symptomatique. Les annonceurs ne comprennent pas que le scaling dégrade mécaniquement les performances — et leurs agences ne le leur expliquent pas avant de scaler.

## Accroche
> "Avant de doubler ton budget, voilà ce qui va probablement se passer."

## Comment ça marche

### Inputs
| Champ | Type | Exemple | Requis |
|---|---|---|---|
| Budget actuel | €/mois | 5 000 € | Oui |
| ROAS actuel | nombre | 4.0 | Oui |
| Budget cible | €/mois | 10 000 € | Oui |
| Marge brute | % | 45% | Optionnel (pour calcul rentabilité) |
| Secteur | liste | E-commerce mode | Oui |
| Type de campagne | liste | Shopping / Search / PMax | Oui |

### Liste des secteurs disponibles
E-commerce mode/textile, E-commerce beauté/cosmétique, E-commerce maison/déco, E-commerce alimentaire, E-commerce sport, Services B2B, SaaS, Formation, Immobilier, Santé/Bien-être, Retail généraliste

### Coefficients de dégradation par doublement de budget
Ces coefficients sont des estimations basées sur les tendances observées dans la littérature Google Ads (WordStream, Search Engine Land, données sectorielles publiques). Ils doivent être présentés avec un disclaimer clair.

| Scénario | Dégradation ROAS par doublement | Usage |
|---|---|---|
| Optimiste | -10% | Marché peu saturé, grande marge de progression des campagnes |
| Réaliste | -25 à -35% | Cas le plus fréquent |
| Pessimiste | -45 à -55% | Marché très concurrentiel ou campagnes déjà proches du plafond |

Ajustements par type de campagne :
- Search : dégradation modérée (le volume de requêtes est limité)
- Shopping : dégradation moyenne
- Performance Max : dégradation plus forte (élargissement automatique des audiences)

### Formule de projection
```
facteur = ratio_budget_cible / ratio_budget_actuel  (ex: 2 pour un doublement)
nb_doublements = log(facteur) / log(2)
ROAS_projeté = ROAS_actuel × (1 - taux_dégradation) ^ nb_doublements
CA_projeté = budget_cible × ROAS_projeté
```

### Outputs
- Graphique courbe : axe X = budget (de actuel à cible), axe Y = ROAS — 3 courbes colorées (Chart.js)
- Tableau de synthèse par scénario :

| | Optimiste | Réaliste | Pessimiste |
|---|---|---|---|
| Budget | 10 000€ | 10 000€ | 10 000€ |
| ROAS projeté | 3.6 | 2.8 | 2.2 |
| CA généré | 36 000€ | 28 000€ | 22 000€ |
| Marge nette | +X€ | +Y€ | -Z€ |

- Zone de danger surlignée : seuil de budget à partir duquel le scénario réaliste devient non rentable
- Conseil fixe : "Avant de scaler, les 3 leviers qui limitent la dégradation : structure de campagnes / qualité du tracking / optimisation des pages."

## UX & Copywriting

### Headline
> "Tu veux doubler ton budget. Voilà ce qui va probablement se passer."

### Sous-titre
> "Le ROAS ne scale pas linéairement. Voilà combien tu peux perdre — et comment l'éviter."

### Structure progressive
**Core visible (3 inputs)** : budget actuel / ROAS actuel / budget cible → graphique + tableau des 3 scénarios immédiatement
**Optionnel "Calibrer"** : secteur + type de campagne → affine les coefficients de dégradation (disclaimer : "résultats calibrés sur ton secteur")

### Labels & placeholders
- "Ton budget Google Ads actuel (€/mois)" — placeholder : "Ex : 5 000"
- "Ton ROAS actuel (affiché dans Google Ads)" — placeholder : "Ex : 4.2"
- "Budget que tu veux atteindre (€/mois)" — placeholder : "Ex : 10 000"

### Aha moment
Le graphique : 3 courbes qui divergent visuellement. Le scénario pessimiste doit être visible et "choquant". La zone rouge de danger (seuil non rentable) est mise en évidence.

### Règles UX
- Résultat visible dès les 3 premiers inputs renseignés
- Le graphique se met à jour en temps réel
- CTA sous le tableau — jamais avant le résultat
- CTA texte : "Tu veux scaler sans détruire ton ROAS ? On analyse ton compte."

## Edge cases
- Budget cible < Budget actuel → message "tu réduis ton budget, voilà ce qui se passe" (courbe inverse)
- ROAS actuel < 1 → avertissement "tes campagnes sont déjà en déficit avant de scaler"
- Marge non renseignée → afficher CA et ROAS sans colonne rentabilité

## Angle différenciant
Anticipe la déception plutôt que de la subir. Positionne Lutie comme une agence qui pense avant d'agir — vs les agences qui scalent les budgets sans prévenir les effets de bord.

## Stack technique
- Vite + React
- CSS pur
- react-chartjs-2 + Chart.js pour les graphiques
- Pas de backend

## Design & UI
Respecter la charte graphique Lutie (`CHARTE_GRAPHIQUE_LUTIE.md`) :
- Graphique : couleurs des 3 courbes → vert (optimiste) / jaune `#fcb800` (réaliste) / violet `#a19aff` (pessimiste)
- Tableau avec fond `#f8f9fa`, valeurs négatives en rouge, positives en vert
- Zone de danger : fond `#f2f1ff`
- CTA bouton jaune `#fcb800`

## CTA
Texte : "Tu veux scaler sans détruire ton ROAS ? On t'explique comment."
Destination : page de prise de contact / calendly Lutie

## Statut
- [ ] Maquette
- [ ] Développement
- [ ] Mise en ligne
