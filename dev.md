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
- TypeScript
- Webpack Dev Server
- Le frontend tourne dans un container Node
- Port par defaut : `3000`

Role actuel :

- afficher une page de verification de la stack
- interroger regulierement `/health`
- proxifier les appels `/api` et `/health` vers le backend via Webpack Dev Server

### Backend

- NestJS
- Node.js
- TypeScript
- Prisma ORM pour parler a PostgreSQL
- Port par defaut : `4000`

Role actuel :

- exposer un endpoint `/health`
- exposer un endpoint `/api`
- verifier la disponibilite de PostgreSQL via Prisma

### Base de donnees

- PostgreSQL 16 Alpine
- Port par defaut : `5432`
- Donnees persistees dans le volume Docker `postgres_volume`

## Architecture de dev

Le fonctionnement actuel est le suivant :

1. Le navigateur appelle le frontend sur `http://localhost:3000`
2. Le frontend React TypeScript appelle `/health` et `/api`
3. Webpack Dev Server proxifie ces routes vers le backend `http://backend:4000`
4. Le backend interroge PostgreSQL via `DATABASE_URL`

### Schema de communication

```text
                    Navigateur
                         |
                         v
         http://localhost:3000
                  frontend
     React + TypeScript + Webpack Dev Server
                         |
      proxy /api et /health via Webpack
                         |
                         v
         http://backend:4000
                 backend NestJS
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
- `backend/prisma/` : schema Prisma et migrations SQL
- `backend/prisma.config.ts` : configuration Prisma CLI pour les migrations et la datasource
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
- lancer `make env-check` avant un push si tu modifies la configuration

## GitHub Actions et secrets

Le workflow `.github/workflows/ci.yml` accepte des secrets GitHub optionnels.

Noms attendus si tu veux piloter la CI depuis l'interface GitHub :

- `CI_POSTGRES_USER`
- `CI_POSTGRES_PASSWORD`
- `CI_POSTGRES_DB`
- `CI_POSTGRES_PORT`
- `CI_DATABASE_URL`
- `CI_BACKEND_PORT`
- `CI_FRONTEND_PORT`
- `CI_JWT_SECRET`
- `CI_FRONTEND_ORIGIN`

Si ces secrets ne sont pas definis, la CI utilise des valeurs de secours dediees au test.

## Commandes utiles

### Lancer le projet

```bash
make up
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

### Base de donnees

Connexion directe a PostgreSQL :

```bash
make shell-db
```

Une fois dans `psql`, commandes utiles :

```sql
\l
\c nom_de_la_base
\dt
\d "User"
SELECT current_database();
SELECT current_user;
SELECT now();
SELECT * FROM "User";
SELECT COUNT(*) FROM "User";
```

Commandes pratiques `psql` :

- `\l` : lister les bases de donnees
- `\c nom_base` : se connecter a une base
- `\dt` : lister les tables
- `\d nom_table` : decrire une table
- `\dn` : lister les schemas
- `\du` : lister les roles
- `\q` : quitter `psql`

Important :

- `SHOW DATABASES;` n'existe pas en PostgreSQL
- pour lister les bases, utiliser `\l`
- les noms sensibles a la casse comme `"User"` doivent etre entre guillemets

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

- `issue_<n>/feature/nom-court`
- `issue_<n>/fix/nom-court`
- `issue_<n>/chore/nom-court`

Commandes utiles :

```bash
make branch-create name=issue_4/feature/ma-feature
make branch-create-push name=issue_4/feature/ma-feature
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
- si tu modifies `backend/prisma/schema.prisma`, pense a regenerer une migration adaptee
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
