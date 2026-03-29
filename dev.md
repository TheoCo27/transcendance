# Guide Dev

## Objectif

Ce document sert de reference rapide pour les developpeurs du projet `ft_transcendance`.

Il explique :

- la stack actuellement utilisee
- comment lancer et tester le projet
- les conventions d'equipe a respecter

## Stack actuelle

### Infrastructure

- Docker Compose pour orchestrer les services
- 3 services principaux :
  - `frontend`
  - `backend`
  - `db`
- Volumes Docker pour conserver les donnees PostgreSQL
- Healthchecks sur les 3 services pour verifier qu'ils sont vraiment operationnels

### Frontend

- React
- Vite
- JavaScript
- Le frontend tourne dans un container Node
- Port par defaut : `3000`

Role actuel :

- afficher une page de verification de la stack
- interroger regulierement `/health`
- proxifier les appels `/api` et `/health` vers le backend via Vite

### Backend

- Express
- Node.js
- JavaScript
- `pg` pour parler a PostgreSQL
- `cors` pour autoriser le frontend
- Port par defaut : `4000`

Role actuel :

- exposer un endpoint `/health`
- exposer un endpoint `/api`
- verifier la disponibilite de PostgreSQL

### Base de donnees

- PostgreSQL 16 Alpine
- Port par defaut : `5432`
- Donnees persistees dans le volume `postgres_data`

## Architecture de dev

Le fonctionnement actuel est le suivant :

1. Le navigateur appelle le frontend sur `http://localhost:3000`
2. Le frontend Vite appelle `/health` et `/api`
3. Vite proxifie ces routes vers le backend `http://backend:4000`
4. Le backend interroge PostgreSQL via `DATABASE_URL`

### Schema de communication

```text
                    Navigateur
                         |
                         v
         http://localhost:3000
                  frontend
              React + Vite dev server
                         |
          proxy /api et /health via Vite
                         |
                         v
         http://backend:4000
                backend Express
                         |
        DATABASE_URL -> postgresql://db:5432
                         |
                         v
                  PostgreSQL 16


Exposition des ports cote hote :

- frontend -> localhost:3000
- backend  -> localhost:4000
- db       -> localhost:5432
```

En developpement, `nginx` n'est pas obligatoire car Docker publie deja les ports vers l'hote.

Un service `nginx` pourra etre ajoute plus tard si on veut :

- un point d'entree unique
- du reverse proxy plus propre
- servir un frontend build en statique
- preparer une architecture de production

## Arborescence utile

- `docker-compose.yml` : orchestration des services
- `Makefile` : commandes de travail rapides
- `backend/` : application backend
- `frontend/` : application frontend
- `scripts/smoke-test.sh` : test rapide de la stack
- `.env` : variables locales
- `.env.example` : modele de configuration

## Variables d'environnement

Les variables principales sont :

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `POSTGRES_PORT`
- `DATABASE_URL`
- `BACKEND_PORT`
- `FRONTEND_PORT`
- `JWT_SECRET`
- `FRONTEND_ORIGIN`

Regle d'equipe :

- ne jamais commit de secret reel
- garder `.env.example` a jour quand une nouvelle variable est ajoutee
- utiliser des valeurs locales simples pour le dev

## Commandes utiles

### Lancer le projet

```bash
make up-d
```

### Voir l'etat des containers

```bash
make ps
make test-stack
```

### Voir les logs

```bash
make logs
make logs-back
make logs-front
make logs-db
```

### Tester rapidement la stack

```bash
make smoke-test
```

Ce test verifie :

- que les 3 containers sont `healthy`
- que le backend repond sur `/health`
- que le frontend atteint bien `/health`
- que le frontend atteint bien `/api`

### Arreter et nettoyer

```bash
make down
make clean
make fclean
```

## URLs de verification

- `http://localhost:3000`
- `http://localhost:3000/health`
- `http://localhost:3000/api`
- `http://localhost:4000/health`

## Regles d'equipe

### 1. Regle de base

Chaque changement doit :

- etre comprehensible
- etre testable rapidement
- ne pas casser le demarrage Docker

Si une fonctionnalite est ajoutee, elle doit idealement etre verifiable soit par navigateur, soit par commande simple.

### 2. Branchements Git

Conventions deja presentes dans le `Makefile` :

- on ne pousse pas directement sur `main`
- on ne pousse pas directement sur `dev`
- on travaille sur des branches dediees

Formats conseilles :

- `feature/nom-court`
- `fix/nom-court`
- `chore/nom-court`

Commandes utiles :

```bash
make branch-create name=feature/ma-feature
make branch-create-push name=feature/ma-feature
make rebase-dev
make push m="feat: message clair"
```

### 3. Commits

Regles recommandees :

- faire des commits petits et lisibles
- un commit = une intention claire
- message court, explicite, en anglais ou francais, mais coherent dans toute l'equipe

Exemples :

- `feat: add backend health endpoint`
- `fix: repair frontend proxy`
- `chore: update docker workflow`

### 4. Docker et dev local

Regles :

- si tu modifies le code frontend ou backend, verifie que la stack redemarre toujours
- avant de pousser, lancer au minimum `make smoke-test`
- ne pas modifier les ports par defaut sans bonne raison
- si tu modifies `docker-compose.yml`, documenter l'impact dans ce fichier `dev.md` ou dans le `README.md`

### 5. Variables d'environnement

Regles :

- toute nouvelle variable doit etre ajoutee a `.env.example`
- toute variable utilisee par le frontend doit etre explicitement documentee
- les noms doivent rester simples et coherents

### 6. API et endpoints

Regles :

- chaque nouvel endpoint doit avoir un but clair
- ajouter un test simple ou une commande de verification quand c'est possible
- en cas de route critique, prevoir un retour d'erreur lisible
- garder `/health` fiable et rapide

### 7. Frontend

Regles :

- eviter les composants trop gros
- separer affichage, logique reseau, et styles quand la complexite augmente
- garder une interface testable rapidement
- si un appel API est ajoute, verifier qu'il fonctionne en environnement Docker

### 8. Backend

Regles :

- garder les routes simples et previsible
- valider les entrees quand de vraies routes metier seront ajoutees
- isoler la logique metier quand le projet grandit
- preparer une structure evolutive plutot que de tout laisser dans un seul fichier

### 9. Base de donnees

Regles :

- ne pas casser la connexion `DATABASE_URL`
- si un schema ou un ORM est ajoute plus tard, documenter les migrations
- toute evolution base de donnees doit etre reproductible

### 10. Definition of done

Une tache est consideree comme terminee si :

- le code est lisible
- la stack demarre
- `make smoke-test` passe
- les logs ne montrent pas d'erreur evidente
- la doc minimale est mise a jour si necessaire

## Prochaines evolutions recommandees

Pour faire grandir le projet proprement, les prochaines etapes logiques sont :

- structurer davantage le backend
- ajouter un ORM
- ajouter une vraie gestion des routes frontend
- ajouter des tests applicatifs
- ajouter un service `nginx` seulement quand un besoin clair apparait
- preparer un mode production distinct du mode developpement

## Resume equipe

Le principe a retenir :

- on privilegie un demarrage rapide
- on garde Docker fonctionnel en permanence
- on teste souvent
- on documente les changements structurants
