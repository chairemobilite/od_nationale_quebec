# Enquête Nationale du Québec

## Table des matières

- [Introduction](#introduction)
- [Installation](#installation)
- [Configuration de l'environnement](#configuration-de-lenvironnement)
- [Rouler l'application](#rouler-lapplication)
  - [Application participant](#application-participant)
  - [Application administrative](#application-administrative)
- [Mettre à jour l'application](#mettre-à-jour-lapplication)
- [Contribuer à l'enquête](#contribuer-à-lenquête)
- [Utiliser Generator](#utiliser-generator)
- [Exécution des tests](#exécution-des-tests)

## Introduction

Cette enquête utilise la plateforme [evolution](https://github.com/chairemobilite/evolution)

## Installation

Pour installer, il faut d'abord aller chercher le code de ce répertoire, ainsi que celui de la plateforme correspondante:

```bash
git clone https://github.com/chairemobilite/od_nationale_quebec.git
git submodule init
git submodule update --init --recursive

```

La façon d'installer est la même que pour la plateforme evolution. Donc, suivre les instructions, sous la rubrique `Installation`, du README de la version d'evolution se trouvant dans le répertoire `evolution` qui a été téléchargée par la commande `git submodule` plus haut. Ce n'est peut-être pas la version la plus récente d'Evolution et les instructions sur la branche principale de la plateforme ne fonctionneront pas nécessairement.

Les instructions d'installation doivent s'exécuter à partir de la racine de ce répertoire et non dans le répertoire `evolution`. N'oubliez pas de mettre à jour le fichier `.env` avec les bonnes valeurs pour votre environnement.

## Configuration de l'environnement

Si ce n'est pas déjà fait, copier le fichier d'exemple pour créer le fichier de configuration de l'environnement.

```bash
cp .env.example .env
```

N'oubliez pas de mettre à jour le fichier `.env` avec les bonnes valeurs pour votre environnement. Il faut probablement changer les valeurs suivantes:

```env
PG_CONNECTION_STRING_PREFIX = "postgres://postgres:@localhost:5432/"
EXPRESS_SESSION_SECRET_KEY = 'MYSECRETKEY'
GOOGLE_API_KEY = "MYGOOGLEAPIKEY"
GOOGLE_API_KEY_DEV = "MYGOOGLEAPIKEYFORDEVELOPMENT"
MAGIC_LINK_SECRET_KEY = "MYVERYLONGSECRETKEYTOENCRYPTTOKENTOSENDTOUSERFORPASSWORDLESSLOGIN"
GOOGLE_OAUTH_CLIENT_ID = "GOOGLEOAUTHCLIENTID"
GOOGLE_OAUTH_SECRET_KEY = "GOOGLEOAUTHSECRETKEY"
RESET_PASSWORD_FROM_EMAIL = "admin@test.com"
MAIL_TRANSPORT_SMTP_HOST = "smtp.example.org"
MAIL_TRANSPORT_SMTP_AUTH_USER = "MYUSERNAME"
MAIL_TRANSPORT_SMTP_AUTH_PWD = "MYPASSWORD"
MAIL_FROM_ADDRESS = "example@example.org"
```

## Rouler l'application

L'enquête est composée de 2 applications distinctes: une pour les participants web uniquement et l'autre pour les administrateurs, intervieweurs, etc. Chaque application peut être exécutée indépendamment de l'autre et chacune est composée de 2 parties: le code client et le serveur.

### Application participant

Pour rouler l'*application participant*, il faut créer le paquet de déploiement du client et démarrer le serveur.

* `yarn build:dev` ou `yarn build:prod` permet de créer l'application client respectivement en mode développement, qui permet de facilement déboguer l'application, ou en mode production, qui est une version minifiée et plus performante.
* `yarn start` démarre le serveur sur le port 8080

Accéder à l'application participant au `http://localhost:8080`.

### Application administrative

Pour rouler l'*application administrative*, il faut créer le paquet client et démarrer le serveur sur un autre port.

* `yarn build:admin:dev` ou `yarn build:admin:prod` permet de créer l'application client, respectivement en mode développement et production.
* `HOST=http://localhost:8082 yarn start:admin --port 8082` démarre le serveur sur le port 8082.

Accéder à l'application participant au `http://localhost:8082`

## Mettre à jour l'application

Pour mettre à jour l'application, il suffit d'aller chercher la dernière version de la branche. Il peut y avoir des changements à la version d'Evolution utilisée, il faut s'assurer de le mettre à jour aussi.

```bash
git checkout main
git pull origin main
yarn reset-submodules
yarn
yarn compile
yarn migrate
```

## Contribuer à l'enquête

Pour contribuer à l'enquête et soumettre des changements, il faut passer par des pull requests.

* S'assurer d'avoir la version la plus récente de l'enquête, en suivant les instructions de la section précédente
* Créer une branche de travail: `git checkout -b <nom de la branche>`
* Effectuer les changements sur cette branche.
* Une fois la branche prête à être reviewée, l'envoyer upstream: `git push origin <nom de la branche>`
* Il est alors possible de créer une pull request sur github en allant sur le tab *Pull requests* du projet

Une pull request peut être un seul commit ou une branche complète. Dans ce dernier cas, chaque commit doit être indépendant et complet, avec un titre explicite. Les titres du genre `Fix typo` sont à proscrire.

Il est possible d'éditer un commit déjà fait pour le compléter ou fixer un typo. Si le commit à éditer est le dernier, simplement utiliser `git commit --amend` pour intégrer les changements actuels au commit.

Pour réécrire un historique de branche, par exemple pour ajouter à un commit précédent autre que le dernier, ou pour combiner des commits, il faut utiliser le rebase interactif `git rebase -i HEAD~x` où `x` est le nombre de commits à revoir.

Pour plus d'information sur les outils de git pour réécrire l'historique, consulter le [manuel de git](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History).

## Utiliser Generator

Ce projet utilise Evolution-Generator pour la création des enquêtes. Afin de générer une enquête, merci de suivre attentivement les instructions fournies dans la section `How to Run` du [README d'Evolution-Generator](https://github.com/chairemobilite/evolution/tree/main/packages/evolution-generator#how-to-run).

## Exécution des tests

L'enquête a quelques tests unitaires qui peuvent simplement s'exécuter avec `yarn test`.

Il est aussi possible d'exécuter les tests UI. Ces tests automatisés vérifient le comportement de l'interface utilisateur dans un navigateur. Avant de lancer `yarn test:ui`, il est nécessaire de démarrer à la fois le client (frontend) et le serveur (backend), car les tests interagissent avec l'application complète comme le ferait un utilisateur réel.

Pour faciliter cette étape, un fichier `tasks.json` est fourni pour les utilisateurs de VSCode : il permet de lancer rapidement un terminal de développement avec la tâche `Start Dev Terminal`, qui démarre le client et le serveur dans le bon environnement.

Les tests Playwright utilisent une connexion aux enquêtes via l'authentification par codes d'accès et codes postaux. Ces codes doivent d'abord être importés dans la BD pour permettre un login direct, sans CAPTCHA, avec des adresses pré-remplies. Chaque test UI utilise une paire code d'accès/code postal différent. Pour ajouter un test, il suffit d'ajouter une ligne au fichier de [codes d'accès pré-remplis](survey/tests/preFilledDataSample.csv) avec le code d'accès désiré. Pour faciliter le traitement des données de test, tous les tests UI ont un code d'accès qui débute par `7357` (test).

Pour importer les données à pré-remplir, exécuter la commande suivante, avec le chemin absolu vers le fichier csv contenant les données:

```bash
yarn node evolution/packages/evolution-backend/lib/tasks/importPreFilledResponses.task.js --file "$(pwd)/survey/tests/preFilledDataSample.csv"
```

Pour nettoyer les données locales avant de rouler les tests UI, sans toucher aux autres entrevues manuelles, exécuter la tâche `yarn reset:test:ui`. Cette commande supprimera tous les participants dont le code d'accès débute par `7357-`. Assurez-vous d’être connecté à une base de données de développement; ne jamais exécuter cette commande sur une base de production.

Avant d'exécuter les tests UI, assurez-vous également d'utiliser le bon fichier de configuration Playwright. Par défaut, copiez le fichier d'exemple fourni :

```bash
cp survey/playwright-example.config.ts survey/playwright.config.ts
yarn test:ui
```
