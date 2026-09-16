# Rapport de stage — Digital Banking Platform

## 1. Contexte et objectifs
Ce rapport décrit l’étude et les travaux réalisés durant le stage sur la Plateforme bancaire digitale. Objectifs principaux:
- Analyser l’architecture existante
- Développer et maintenir des fonctionnalités métier (virements, sessions)
- Automatiser builds et tests
- Proposer améliorations sécurité et observabilité

## 2. Environnement technique
- Backend: Java (Spring Boot) — dossier `back/banking-api`
- Frontend: React + TypeScript (Vite) — dossier `front`
- Base de données: PostgreSQL (Docker)
- Orchestration: `docker-compose.yml`
- Tests API: Postman + Newman (collection incluse)

## 3. Méthodologie
Travail réalisé en itérations courtes: découverte, corrections bugs, ajout de petites fonctionnalités, mise en place d’automatisations et tests.

## 4. Tâches effectuées (exemples)
- Exploration du code et diagrammes d’architecture
- Ajout / correction de routes API critiques
- Exécution et analyse des tests Postman (`newman-report.json`)
- Création du README et documentation projet

## 5. Résultats & preuves
- Application buildée localement: `back/banking-api/target` contient le JAR
- Tests API exécutés: voir `newman-report.json`
- Collections et environnements Postman fournis

## 6. Analyse critique
- Points forts: séparation front/back claire, utilisation de frameworks standards, présence de scripts et collections pour tests
- Points faibles: couverture de tests d’intégration partielle, absence (ou non visible) de CI/CD automatiques, gestion des secrets à renforcer

## 7. Recommandations techniques
1. Mettre en place CI (GitHub Actions): build, tests, scan dépendances, build image
2. Ajouter tests d’intégration E2E (Playwright / Cypress) pour flux critiques
3. Scanner dépendances régulièrement (Snyk / OWASP)
4. Mettre en place monitoring minimal (health, metrics) et centraliser logs

## 8. Plan d’action priorisé (3 mois)
- Semaine 1–2: CI basique + build automatique
- Semaine 3–4: Tests d’intégration pour endpoints clefs
- Mois 2: Observabilité (metrics + logs)
- Mois 3: Sécurité (scans + gestion des secrets)

## 9. Annexes
- `postman_collection.json`, `postman_env.json`, `newman-report.json`
- Diagramme d’architecture: [ARCHITECTURE.md](ARCHITECTURE.md)

---
Fin du rapport — version synthétique. Pour une mise en forme Word/PDF, je peux exporter ce Markdown.
