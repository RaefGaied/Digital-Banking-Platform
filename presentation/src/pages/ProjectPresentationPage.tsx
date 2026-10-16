import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  BookOpenCheck,
  Boxes,
  Check,
  Clock3,
  Code2,
  Database,
  FileCheck2,
  Fingerprint,
  GitBranch,
  Layers3,
  Landmark,
  LayoutGrid,
  LockKeyhole,
  Maximize2,
  MessageCircle,
  Network,
  Play,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Workflow,
  X,
  type LucideIcon,
} from 'lucide-react';
import classDiagram from '../assets/class-diagram-global.png';
import polytechniqueLogo from '../assets/polytechnique-sousse.jpg';
import useCaseDiagram from '../assets/use-case-global.png';
import vermegLogo from '../assets/vermeg.jpg';
import workflowDiagram from '../../../images/camunda_bpmn_virement.png';
import flowableScreen from '../../../images/ui_integration_flowable_true.png';
import securityScreen from '../../../images/ui_security_event_admin_page.png';
import ragScreen from '../../../images/ui_rag_page.png';
import adminTransferScreen from '../../../images/ui_workflow_processus_cote_Admin_virement_important_apres_approuve.png';
import dockerScreen from '../../../images/docker_compose_sprint6.png';
import './ProjectPresentationPage.css';

type CardItem = {
  title: string;
  text: string;
  icon?: LucideIcon;
  tone?: 'mint' | 'blue' | 'amber' | 'orange';
};

type Slide = {
  title: string;
  chapter: string;
  eyebrow?: string;
  subtitle?: string;
  content: ReactNode;
  type?: 'cover' | 'divider' | 'closing';
};

const topics = [
  'Contexte & problématique',
  'Solution & fonctionnalités',
  'Analyse & conception',
  'Architecture technique',
  'Sécurité, workflows & IA',
  'Réalisation & démonstration',
];

const agendaSections = [
  'Introduction',
  'Contexte & problématique',
  'Analyse des besoins',
  'Solution FinBank',
  'Architecture & conception',
  'Workflows, sécurité & IA',
  'CI / CD & déploiement',
  'Conclusion & perspectives',
  'Démonstration',
];

function TileGrid({ items, columns = 3 }: { items: CardItem[]; columns?: 2 | 3 | 4 }) {
  return (
    <div className={`fin-tile-grid fin-cols-${columns} fin-tile-grid-count-${items.length}`}>
      {items.map((item, index) => {
        const Icon = item.icon ?? Check;
        return (
          <article className={`fin-tile fin-tone-${item.tone ?? 'mint'}`} key={item.title} style={{ '--tile-index': index } as CSSProperties}>
            <span className="fin-tile-icon"><Icon size={19} strokeWidth={1.8} /></span>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        );
      })}
    </div>
  );
}

function ProcessFlow({ steps }: { steps: { title: string; text: string; icon?: LucideIcon }[] }) {
  return (
    <div className="fin-process">
      {steps.map((step, index) => {
        const Icon = step.icon ?? Check;
        return (
          <div className="fin-process-pair" key={step.title}>
            <article className="fin-process-step" style={{ '--tile-index': index } as CSSProperties}>
              <span className="fin-step-count">{String(index + 1).padStart(2, '0')}</span>
              <span className="fin-step-icon"><Icon size={21} /></span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
            {index < steps.length - 1 && <ArrowRight className="fin-process-arrow" size={20} aria-hidden="true" />}
          </div>
        );
      })}
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return <div className="fin-chips">{items.map((item) => <span key={item}>{item}</span>)}</div>;
}

function ImagePanel({ src, alt, caption, className = '' }: { src: string; alt: string; caption: string; className?: string }) {
  return (
    <figure className={`fin-image-panel ${className}`}>
      <button className="fin-image-button" type="button" onClick={() => window.dispatchEvent(new CustomEvent<string>('finbank-open-image', { detail: src }))} aria-label={`Agrandir l’image : ${alt}`}>
        <img src={src} alt={alt} />
      </button>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

const slides: Slide[] = [
  {
    title: 'Conception et réalisation d’une plateforme bancaire digitale',
    chapter: 'Projet de fin d’études',
    subtitle: 'FinBank — une expérience bancaire unifiée, des opérations maîtrisées et une assistance intelligente.',
    type: 'cover',
    content: <div className="fin-cover-mark" aria-label="FinBank"><span><Landmark size={42} strokeWidth={1.5} /></span><strong>FINBANK</strong><small>DIGITAL BANKING PLATFORM</small></div>,
  },
  {
    title: 'Plan de la présentation',
    chapter: 'Le parcours',
    eyebrow: 'SOMMAIRE',
    subtitle: 'Neuf étapes pour présenter FinBank, de son contexte à sa démonstration.',
    content: <div className="fin-agenda">{agendaSections.map((topic, index) => <div className="fin-agenda-row" key={topic} style={{ '--tile-index': index } as CSSProperties}><span>{String(index + 1).padStart(2, '0')}</span><strong>{topic}</strong><ArrowDownRight size={16} /></div>)}</div>,
  },
  {
    title: 'Contexte & problématique',
    chapter: '01 · Le besoin',
    subtitle: 'Comment réunir les services bancaires courants et le traitement des demandes dans une expérience cohérente, sûre et démontrable ?',
    type: 'divider',
    content: <div className="fin-divider-art"><div className="fin-divider-circle"><Landmark size={70} /></div><span>UN PARCOURS BANCAIRE, DE BOUT EN BOUT</span></div>,
  },
  {
    title: 'FinBank en bref',
    chapter: topics[0],
    eyebrow: 'FINBANK EN BREF',
    subtitle: 'Un portail client, un back-office administratif et des services applicatifs réunis autour d’une API bancaire.',
    content: <TileGrid items={[
      { title: 'Espace client', text: 'Consulter le compte, gérer ses moyens de paiement et suivre ses opérations.', icon: WalletCards },
      { title: 'Back-office', text: 'Superviser les demandes, traiter les tâches métier et examiner les événements.', icon: Landmark, tone: 'blue' },
      { title: 'Assistance intelligente', text: 'Interagir avec un agent connecté aux outils métier et à des documents de référence.', icon: Sparkles, tone: 'amber' },
    ]} />,
  },
  {
    title: 'Des parcours fragmentés créent de la friction',
    chapter: topics[0],
    eyebrow: 'LE CONSTAT',
    subtitle: 'Une opération ne s’arrête pas au clic : elle peut impliquer des contrôles, un support et un suivi compréhensible.',
    content: <TileGrid columns={4} items={[
      { title: 'Opérations', text: 'Un état explicite et un historique consultable.', icon: Banknote },
      { title: 'Contrôles', text: 'Des étapes de validation selon le scénario.', icon: ShieldCheck, tone: 'blue' },
      { title: 'Assistance', text: 'Un incident transmis et suivi jusqu’à sa résolution.', icon: MessageCircle, tone: 'amber' },
      { title: 'Connaissance', text: 'Des réponses s’appuyant sur une documentation organisée.', icon: BookOpenCheck, tone: 'orange' },
    ]} />,
  },
  {
    title: 'Réunir l’expérience, les contrôles et l’assistance',
    chapter: topics[0],
    eyebrow: 'OBJECTIFS',
    subtitle: 'Le projet poursuit quatre objectifs complémentaires.',
    content: <TileGrid items={[
      { title: 'Centraliser les parcours', text: 'Comptes, virements, cartes, tickets et notifications.', icon: Layers3 },
      { title: 'Appliquer les règles métier', text: 'Valider les opérations avant de les traiter ou de les transmettre.', icon: FileCheck2, tone: 'blue' },
      { title: 'Tracer les actions', text: 'Rendre les décisions et événements consultables par les rôles autorisés.', icon: Fingerprint, tone: 'amber' },
      { title: 'Accompagner les utilisateurs', text: 'Associer l’agent conversationnel à des outils et connaissances ciblés.', icon: Sparkles, tone: 'orange' },
    ]} />,
  },
  {
    title: 'Solution & fonctionnalités',
    chapter: '02 · FinBank',
    subtitle: 'Les tâches courantes restent accessibles au client ; les décisions sensibles disposent de parcours de contrôle.',
    type: 'divider',
    content: <div className="fin-divider-art"><div className="fin-divider-circle"><WalletCards size={70} /></div><span>DU PORTAIL AU BACK-OFFICE</span></div>,
  },
  {
    title: 'Les fonctions essentielles, dans un même produit',
    chapter: topics[1],
    eyebrow: 'PÉRIMÈTRE FONCTIONNEL',
    content: <TileGrid items={[
      { title: 'Comptes & opérations', text: 'Comptes, dépôts, retraits, virements, historique et reçus.', icon: Banknote },
      { title: 'Paiements', text: 'Cartes et clés de paiement pour identifier un destinataire.', icon: WalletCards, tone: 'blue' },
      { title: 'Support', text: 'Tickets, pièces justificatives et suivi des demandes.', icon: MessageCircle, tone: 'amber' },
      { title: 'Notifications', text: 'Informations applicatives et préférences de communication.', icon: BadgeCheck, tone: 'orange' },
      { title: 'Administration', text: 'Tâches, utilisateurs, sécurité, audit et documents RAG.', icon: Landmark, tone: 'blue' },
      { title: 'Assistant IA', text: 'Conversation métier et recherche augmentée par les documents.', icon: Sparkles },
    ]} />,
  },
  {
    title: 'Des rôles clairs, des espaces adaptés',
    chapter: topics[1],
    eyebrow: 'ACTEURS',
    content: <div className="fin-role-grid">
      <article className="fin-role-card"><span className="fin-role-icon"><WalletCards /></span><p className="fin-overline">ESPACE CLIENT</p><h3>Réaliser et suivre</h3><Chips items={['Consulter son compte', 'Effectuer un transfert', 'Gérer ses cartes', 'Suivre l’historique', 'Contacter le support', 'Questionner l’assistant']} /></article>
      <article className="fin-role-card fin-role-admin"><span className="fin-role-icon"><ShieldCheck /></span><p className="fin-overline">ESPACE ADMINISTRATION</p><h3>Contrôler et traiter</h3><Chips items={['Traiter une tâche BPMN', 'Gérer les tickets', 'Administrer les utilisateurs', 'Examiner la sécurité', 'Consulter l’audit', 'Gérer le RAG']} /></article>
    </div>,
  },
  {
    title: 'Des fonctions observables de bout en bout',
    chapter: topics[1],
    eyebrow: 'BESOINS FONCTIONNELS',
    content: <TileGrid items={[
      { title: 'Authentification', text: 'Inscription, connexion, sessions et vérification renforcée.', icon: LockKeyhole },
      { title: 'Transactions', text: 'Soumettre une opération et consulter son résultat.', icon: Banknote, tone: 'blue' },
      { title: 'Moyens de paiement', text: 'Gérer les cartes et les clés de paiement.', icon: WalletCards, tone: 'amber' },
      { title: 'Support', text: 'Créer et documenter une demande, suivre son statut.', icon: MessageCircle, tone: 'orange' },
      { title: 'Administration', text: 'Traiter des tâches, tickets et alertes.', icon: Landmark, tone: 'blue' },
      { title: 'Assistant', text: 'Rechercher une information ou appeler un outil autorisé.', icon: Sparkles },
    ]} />,
  },
  {
    title: 'Analyse & conception',
    chapter: '03 · Concevoir',
    subtitle: 'Le système s’organise autour des domaines métier et des processus — non d’une architecture fictive en microservices métier.',
    type: 'divider',
    content: <div className="fin-divider-art"><div className="fin-divider-circle"><Boxes size={70} /></div><span>MODÉLISER AVANT D’ORCHESTRER</span></div>,
  },
  {
    title: 'Les cas d’usage relient deux espaces',
    chapter: topics[2],
    eyebrow: 'DIAGRAMME GLOBAL DES CAS D’UTILISATION',
    content: <div className="fin-use-case-layout">
      <ImagePanel src={useCaseDiagram} alt="Diagramme global des cas d’utilisation de FinBank" caption="Vue globale des acteurs et des fonctionnalités de la plateforme." className="fin-use-case-diagram" />
      <div className="fin-use-case-summary">
        <article><span>01</span><div><h3>Client</h3><p>Consulter ses comptes, effectuer des opérations et contacter le support.</p></div></article>
        <article><span>02</span><div><h3>Administrateur</h3><p>Traiter les demandes, superviser les tâches et gérer les utilisateurs.</p></div></article>
        <article><span>03</span><div><h3>Services métier</h3><p>Orchestrer les contrôles et accompagner les parcours autorisés.</p></div></article>
      </div>
    </div>,
  },
  {
    title: 'Des responsabilités séparées, des contrats explicites',
    chapter: topics[2],
    eyebrow: 'PRINCIPES DE CONCEPTION',
    content: <ProcessFlow steps={[
      { title: 'Interface', text: 'React · espaces client et administration', icon: WalletCards },
      { title: 'API métier', text: 'Spring Boot · règles, accès et orchestration', icon: Code2 },
      { title: 'Persistance', text: 'PostgreSQL · données applicatives', icon: Database },
    ]} />,
  },
  {
    title: 'Technologies alignées avec le produit',
    chapter: topics[3],
    eyebrow: 'PILE TECHNIQUE',
    content: <TileGrid items={[
      { title: 'Frontend', text: 'React 19 · TypeScript 6 · Vite · Material UI', icon: Code2 },
      { title: 'Backend', text: 'Java 21 · Spring Boot · API REST', icon: Boxes, tone: 'blue' },
      { title: 'Assistant', text: 'Python · agent IA · intégration à l’API', icon: Sparkles, tone: 'amber' },
      { title: 'Données', text: 'PostgreSQL · Redis', icon: Database, tone: 'orange' },
      { title: 'Événements', text: 'Apache Kafka · Zookeeper', icon: Network, tone: 'blue' },
      { title: 'Workflow & IA', text: 'Flowable · Ollama · Spring AI', icon: Workflow },
    ]} />,
  },
  {
    title: 'Une application modulaire, plusieurs services techniques',
    chapter: topics[3],
    eyebrow: 'ARCHITECTURE DE DÉPLOIEMENT',
    content: <div className="fin-architecture">
      <div className="fin-arch-lane"><span className="fin-overline">EXPÉRIENCE</span><div className="fin-arch-node"><Code2 />Navigateur<small>Client React · distribué par Nginx</small></div></div>
      <ArrowRight className="fin-arch-arrow" />
      <div className="fin-arch-lane"><span className="fin-overline">APPLICATION</span><div className="fin-arch-node fin-arch-feature"><Boxes />API bancaire<small>Spring Boot · sécurité · règles métier · Flowable</small></div><div className="fin-arch-node"><Sparkles />Agent IA<small>Python · outils connectés à l’API</small></div><div className="fin-arch-node"><Workflow />Ollama<small>Modèles de chat et embeddings locaux</small></div></div>
      <ArrowRight className="fin-arch-arrow" />
      <div className="fin-arch-lane"><span className="fin-overline">INFRASTRUCTURE</span><div className="fin-arch-node"><Database />PostgreSQL · Redis<small>Persistance et cache</small></div><div className="fin-arch-node"><Network />Kafka<small>Messagerie applicative</small></div><div className="fin-arch-node"><MessageCircle />Mailpit<small>Courriel de développement</small></div></div>
    </div>,
  },
  {
    title: 'Le modèle de données reflète les responsabilités métier',
    chapter: topics[2],
    eyebrow: 'MODÈLE CONCEPTUEL',
    subtitle: 'Quelques familles d’entités structurent les parcours de FinBank.',
    content: <div className="fin-model-slide"><div className="fin-model-legend"><TileGrid items={[
      { title: 'Identité', text: 'Utilisateur · compte · session', icon: Fingerprint },
      { title: 'Opérations', text: 'Transaction · carte · investissement', icon: Banknote, tone: 'blue' },
      { title: 'Contrôle', text: 'Ticket · tâche · audit · document RAG', icon: Workflow, tone: 'amber' },
    ]} /><ImagePanel src={classDiagram} alt="Diagramme global de classes FinBank" caption="Diagramme global de classes du projet." /></div></div>,
  },
  {
    title: 'Du transfert demandé à sa résolution',
    chapter: topics[4],
    eyebrow: 'EXEMPLE DE FLUX MÉTIER',
    content: <ProcessFlow steps={[
      { title: 'Demande', text: 'Le client indique le montant et le destinataire.', icon: Banknote },
      { title: 'Validation', text: 'L’API vérifie les données et les règles métier.', icon: FileCheck2 },
      { title: 'Décision', text: 'Une tâche de contrôle est présentée si le scénario l’exige.', icon: Workflow },
      { title: 'Résultat', text: 'Le statut et le suivi deviennent consultables.', icon: BadgeCheck },
    ]} />,
  },
  {
    title: 'Flowable transforme les règles en processus observables',
    chapter: topics[4],
    eyebrow: 'ORCHESTRATION BPMN',
    content: <div className="fin-evidence-grid"><ImagePanel src={workflowDiagram} alt="Modèle BPMN de validation du virement" caption="Processus BPMN de validation de virement fourni avec le projet." /><div className="fin-evidence-points"><TileGrid items={[
      { title: 'Définition', text: 'Étapes, décisions, tâches et issues du processus.', icon: Workflow },
      { title: 'Exécution', text: 'Le backend démarre ou poursuit les instances du processus.', icon: Play, tone: 'blue' },
      { title: 'Traitement', text: 'Les tâches humaines sont proposées au rôle administratif.', icon: Landmark, tone: 'amber' },
    ]} /></div></div>,
  },
  {
    title: 'Une vue dédiée au traitement des tâches BPMN',
    chapter: topics[4],
    eyebrow: 'PREUVE D’INTÉGRATION',
    content: <div className="fin-evidence-grid"><ImagePanel src={flowableScreen} alt="Interface FinBank de tâches Flowable" caption="Capture de l’espace d’administration — navigation et tâches Flowable." /><div className="fin-evidence-points"><p className="fin-large-copy">Un modèle déployé devient un parcours qu’un opérateur peut consulter et traiter.</p><div className="fin-proof-list"><span><Check /> Tâche visible dans le back-office</span><span><Check /> Décision accessible au rôle habilité</span><span><Check /> État du processus vérifiable après traitement</span></div><p className="fin-footnote">Pour la soutenance : créer un cas de démonstration, afficher la tâche en attente, la traiter et vérifier le nouvel état.</p></div></div>,
  },
  {
    title: 'La sécurité fait partie du parcours métier',
    chapter: topics[4],
    eyebrow: 'CONFIANCE & CONTRÔLES',
    content: <div className="fin-evidence-grid"><ImagePanel src={securityScreen} alt="Écran d’administration des événements de sécurité" caption="Exemple de la vue d’administration des événements de sécurité." /><div className="fin-evidence-points"><TileGrid items={[
      { title: 'Accès', text: 'Authentification et rôles contrôlent les capacités disponibles.', icon: LockKeyhole },
      { title: 'Surveillance', text: 'Les alertes importantes sont présentées dans le back-office.', icon: ShieldCheck, tone: 'blue' },
      { title: 'Traçabilité', text: 'Les journaux aident à reconstituer les actions pertinentes.', icon: Clock3, tone: 'amber' },
    ]} /><p className="fin-footnote">Présenter des données fictives uniquement ; cette plateforme académique n’est pas un service bancaire de production.</p></div></div>,
  },
  {
    title: 'Un agent connecté à un périmètre métier',
    chapter: topics[4],
    eyebrow: 'ASSISTANCE INTELLIGENTE',
    content: <ProcessFlow steps={[
      { title: 'Intention', text: 'Une question exprimée en langage naturel.', icon: MessageCircle },
      { title: 'Agent IA', text: 'Le contexte guide la sélection des capacités.', icon: Sparkles },
      { title: 'API FinBank', text: 'Les outils autorisés appliquent les règles métier.', icon: Code2 },
      { title: 'Réponse', text: 'Une information claire ou une étape suivante.', icon: BadgeCheck },
    ]} />,
  },
  {
    title: 'Le RAG est administré dans le back-office',
    chapter: topics[4],
    eyebrow: 'CONNAISSANCE DOCUMENTAIRE',
    content: <div className="fin-evidence-grid"><ImagePanel src={ragScreen} alt="Interface de gestion des documents RAG" caption="Interface de gestion des documents de la base de connaissance RAG." /><div className="fin-evidence-points"><div className="fin-rag-cycle"><span>Document</span><ArrowRight /><span>Indexation</span><ArrowRight /><span>Recherche</span><ArrowRight /><span>Réponse contextualisée</span></div><p className="fin-large-copy">Les documents de référence sont préparés, indexés, puis fournis comme contexte lorsque la recherche trouve des passages utiles.</p><p className="fin-footnote">La gestion et les tests RAG appartiennent à l’espace administrateur, pas à la navigation client.</p></div></div>,
  },
  {
    title: 'De la demande de support à sa résolution',
    chapter: topics[4],
    eyebrow: 'SERVICE CLIENT',
    content: <div className="fin-role-grid"><article className="fin-role-card"><span className="fin-role-icon"><MessageCircle /></span><p className="fin-overline">CÔTÉ CLIENT</p><h3>Une demande contextualisée</h3><p className="fin-body-copy">Décrire un problème, joindre des informations nécessaires, consulter l’avancement du ticket.</p><Chips items={['Création', 'Justificatif', 'Suivi']} /></article><article className="fin-role-card fin-role-admin"><span className="fin-role-icon"><BadgeCheck /></span><p className="fin-overline">CÔTÉ SUPPORT</p><h3>Une résolution traçable</h3><p className="fin-body-copy">Examiner la demande, l’assigner, faire évoluer son statut et communiquer la résolution.</p><Chips items={['Examen', 'Décision', 'Notification']} /></article></div>,
  },
  {
    title: 'Deux espaces, une même plateforme',
    chapter: topics[1],
    eyebrow: 'INTERFACES',
    content: <div className="fin-interface-slide"><ImagePanel src={adminTransferScreen} alt="Traitement administratif d’un virement FinBank" caption="Exemple de traitement d’une opération depuis l’interface d’administration." /><div className="fin-interface-copy"><p className="fin-overline">CLIENT</p><h3>Des actions au bon endroit</h3><p>Compte, cartes, virements, historique, support et assistant sont adaptés au contexte client.</p><div className="fin-interface-divider" /><p className="fin-overline">ADMINISTRATEUR</p><h3>Des outils de supervision</h3><p>Tâches, tickets, sécurité, audit et documents RAG sont réservés au back-office autorisé.</p></div></div>,
  },
  {
    title: 'Réalisation & démonstration',
    chapter: '04 · Construire & vérifier',
    subtitle: 'Un environnement reproductible, des contrôles automatisés et un scénario de bout en bout.',
    type: 'divider',
    content: <div className="fin-divider-art"><div className="fin-divider-circle"><GitBranch size={70} /></div><span>DU CODE À UNE PREUVE VÉRIFIABLE</span></div>,
  },
  {
    title: 'Docker Compose rassemble l’environnement local',
    chapter: topics[5],
    eyebrow: 'DÉPLOIEMENT LOCAL',
    content: <div className="fin-compose-slide"><div className="fin-compose-copy"><div className="fin-command">docker compose up --build -d</div><TileGrid items={[
      { title: 'Application', text: 'Frontend · API bancaire · agent IA', icon: Boxes },
      { title: 'Services de données', text: 'PostgreSQL · Redis · Kafka', icon: Database, tone: 'blue' },
      { title: 'Outils de démonstration', text: 'Ollama · Mailpit · pgAdmin', icon: Play, tone: 'amber' },
    ]} /></div><ImagePanel src={dockerScreen} alt="Services FinBank affichés dans Docker Desktop" caption="Capture d’environnement Docker du projet ; l’état réel dépend du poste utilisé." /></div>,
  },
  {
    title: 'La CI vérifie les composants avant publication',
    chapter: topics[5],
    eyebrow: 'INTÉGRATION CONTINUE',
    content: <ProcessFlow steps={[
      { title: 'Commit', text: 'Une modification déclenche le workflow.', icon: GitBranch },
      { title: 'Backend', text: 'Compilation Maven et tests Java.', icon: Code2 },
      { title: 'Frontend', text: 'Lint, build et scénarios Playwright.', icon: Check },
      { title: 'Images', text: 'Publication des images selon la configuration.', icon: Boxes },
    ]} />,
  },
  {
    title: 'La mise en production reste conditionnée à la configuration',
    chapter: topics[5],
    eyebrow: 'LIVRAISON CONTINUE',
    content: <div className="fin-delivery-slide">
      <div className="fin-delivery-path"><span>Images publiées</span><ArrowRight /><span>Hôte distant</span><ArrowRight /><span>Compose</span><ArrowRight /><span>Services démarrés</span></div>
      <TileGrid items={[
        { title: 'Déploiement conditionnel', text: 'Le workflow distant s’exécute seulement si les secrets de connexion sont configurés.', icon: LockKeyhole },
        { title: 'Publication d’images', text: 'Les images sont publiées après le succès des contrôles requis.', icon: Boxes, tone: 'blue' },
        { title: 'Preuve à présenter', text: 'Vérifier la révision, la branche, les jobs et le résultat du déploiement dans Actions.', icon: FileCheck2, tone: 'amber' },
      ]} />
      <p className="fin-footnote">Une capture ancienne de pipeline n’établit pas l’état actuel du déploiement.</p>
    </div>,
  },
  {
    title: 'Les tests doivent valider le parcours, pas seulement le build',
    chapter: topics[5],
    eyebrow: 'STRATÉGIE DE TEST',
    content: <TileGrid items={[
      { title: 'Backend', text: 'Tests unitaires ciblant les services, contrôleurs et décisions métier.', icon: Code2 },
      { title: 'Frontend', text: 'Lint, compilation TypeScript et tests end-to-end Playwright.', icon: Check, tone: 'blue' },
      { title: 'Système', text: 'Santé des services et scénarios d’intégration représentatifs.', icon: Boxes, tone: 'amber' },
    ]} />,
  },
  {
    title: 'Un scénario de démonstration, de bout en bout',
    chapter: topics[5],
    eyebrow: 'DÉMO SUGGÉRÉE',
    content: <ProcessFlow steps={[
      { title: 'Se connecter', text: 'Ouvrir une session de démonstration.', icon: LockKeyhole },
      { title: 'Initier', text: 'Soumettre un transfert fictif.', icon: Banknote },
      { title: 'Contrôler', text: 'Afficher sa tâche dans Flowable.', icon: Workflow },
      { title: 'Résoudre', text: 'Prendre une décision et vérifier le statut.', icon: BadgeCheck },
    ]} />,
  },
  {
    title: 'Reconnaître les limites pour construire la suite',
    chapter: topics[5],
    eyebrow: 'PERSPECTIVES',
    content: <TileGrid items={[
      { title: 'Renforcer la sécurité', text: 'Revue indépendante, gestion des secrets et contrôles adaptés au domaine financier.', icon: ShieldCheck },
      { title: 'Mesurer la résilience', text: 'Charge, disponibilité, reprise après incident et observabilité.', icon: Clock3, tone: 'blue' },
      { title: 'Enrichir les tests', text: 'Davantage de parcours d’intégration automatisés et reproductibles.', icon: Check, tone: 'amber' },
      { title: 'Évaluer l’IA', text: 'Mesurer la qualité, vérifier les sources et renforcer les garde-fous.', icon: Sparkles, tone: 'orange' },
    ]} />,
  },
  {
    title: 'FinBank réunit parcours, processus et assistance',
    chapter: 'SYNTHÈSE',
    eyebrow: 'CONCLUSION',
    subtitle: 'La plateforme met en œuvre une expérience bancaire web, des contrôles métier orchestrés et une assistance IA dans un environnement multi-service.',
    content: <div className="fin-conclusion-stats"><div><strong>Parcours métier</strong><span>Comptes · transferts · tickets</span></div><div><strong>Orchestration</strong><span>Processus BPMN · tâches humaines</span></div><div><strong>Assistance</strong><span>Agent IA · recherche documentaire</span></div></div>,
  },
  {
    title: 'Merci pour votre attention',
    chapter: 'QUESTIONS & RÉPONSES',
    eyebrow: 'FINBANK · PROJET DE FIN D’ÉTUDES',
    type: 'closing',
    content: <div className="fin-thankyou-mark"><Landmark size={56} strokeWidth={1.4} /><span>FINBANK</span></div>,
  },
  {
    title: 'Démonstration de FinBank',
    chapter: 'PASSAGE À L’APPLICATION',
    eyebrow: 'SCÉNARIO DE DÉMONSTRATION',
    subtitle: 'Portail client · transfert fictif · décision Flowable · suivi administratif',
    type: 'closing',
    content: <div className="fin-demo-sequence"><span><LockKeyhole /> Espace client</span><ArrowRight /><span><Workflow /> Workflow</span><ArrowRight /><span><Landmark /> Back-office</span></div>,
  },
];

export default function ProjectPresentationPage() {
  const [active, setActive] = useState(() => {
    const match = window.location.hash.match(/slide-(\d+)/);
    return match ? Math.max(0, Math.min(slides.length - 1, Number(match[1]) - 1)) : 0;
  });
  const [contentsOpen, setContentsOpen] = useState(false);
  const [contentsSelection, setContentsSelection] = useState(0);
  const [imageOpen, setImageOpen] = useState<string | null>(null);
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward');
  const deckRef = useRef<HTMLElement>(null);
  const backgroundRef = useRef<HTMLCanvasElement>(null);
  const touchStartX = useRef<number | null>(null);
  const slide = slides[active];

  function goTo(index: number) {
    const next = Math.max(0, Math.min(slides.length - 1, index));
    if (next === active) return;
    setSlideDirection(next > active ? 'forward' : 'backward');
    setActive(next);
    setContentsOpen(false);
    window.history.replaceState(null, '', `#slide-${String(next + 1).padStart(2, '0')}`);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) void deckRef.current?.requestFullscreen?.();
    else void document.exitFullscreen?.();
  }

  useEffect(() => {
    document.title = `${String(active + 1).padStart(2, '0')} · ${slides[active].title} — FinBank`;
    window.history.replaceState(null, '', `#slide-${String(active + 1).padStart(2, '0')}`);
  }, [active]);

  useEffect(() => {
    function onOpenImage(event: Event) {
      if (event instanceof CustomEvent && typeof event.detail === 'string') setImageOpen(event.detail);
    }
    window.addEventListener('finbank-open-image', onOpenImage);
    return () => window.removeEventListener('finbank-open-image', onOpenImage);
  }, []);

  useEffect(() => {
    const context = backgroundRef.current?.getContext('2d');
    if (!context) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer = { x: 0, y: 0 };
    let width = 0;
    let height = 0;
    let frame = 0;
    let particles: { x: number; y: number; phase: number; size: number }[] = [];

    function resize() {
      const canvas = backgroundRef.current;
      const drawContext = canvas?.getContext('2d');
      if (!canvas || !drawContext) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      drawContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.min(58, Math.max(28, Math.round((width * height) / 23000)));
      particles = Array.from({ length: count }, (_, index) => ({
        x: ((index * 73.7) % 1000) / 1000 * width,
        y: ((index * 137.3 + 29) % 1000) / 1000 * height,
        phase: index * 1.73,
        size: index % 7 === 0 ? 2.4 : 1.5,
      }));
      draw(0);
    }

    function draw(time: number) {
      if (!context) return;
      context.clearRect(0, 0, width, height);
      const seconds = reducedMotion ? 0 : time / 1000;
      const points = particles.map((particle) => ({
        x: particle.x + Math.sin(seconds * 0.16 + particle.phase) * 11 + pointer.x * 0.012,
        y: particle.y + Math.cos(seconds * 0.13 + particle.phase) * 9 + pointer.y * 0.012,
        size: particle.size,
      }));

      points.forEach((point, index) => {
        for (let nextIndex = index + 1; nextIndex < points.length; nextIndex += 1) {
          const next = points[nextIndex];
          const distance = Math.hypot(point.x - next.x, point.y - next.y);
          if (distance > 122) continue;
          context.beginPath();
          context.moveTo(point.x, point.y);
          context.lineTo(next.x, next.y);
          context.strokeStyle = `rgba(0, 119, 204, ${(1 - distance / 122) * 0.13})`;
          context.lineWidth = 0.7;
          context.stroke();
        }
        context.beginPath();
        context.arc(point.x, point.y, point.size, 0, Math.PI * 2);
        context.fillStyle = 'rgba(0, 119, 204, 0.34)';
        context.fill();
      });

      if (!reducedMotion) frame = window.requestAnimationFrame(draw);
    }

    function movePointer(event: MouseEvent) {
      pointer.x = (event.clientX / width - 0.5) * 30;
      pointer.y = (event.clientY / height - 0.5) * 20;
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', movePointer);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', movePointer);
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (imageOpen) {
        if (event.key === 'Escape') setImageOpen(null);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        if (contentsOpen) {
          setContentsOpen(false);
        } else {
          setContentsSelection(active);
          setContentsOpen(true);
        }
        return;
      }
      if (contentsOpen) {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          setContentsSelection((current) => Math.min(slides.length - 1, current + 1));
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          setContentsSelection((current) => Math.max(0, current - 1));
        } else if (event.key === 'Enter') {
          goTo(contentsSelection);
        }
        return;
      }
      const target = event.target;
      if (target instanceof HTMLElement && ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (['ArrowRight', 'PageDown', ' '].includes(event.key)) {
        event.preventDefault();
        goTo(active + 1);
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) {
        event.preventDefault();
        goTo(active - 1);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        goTo(active + 1);
      } else if (event.key === 'Home') goTo(0);
      else if (event.key === 'End') goTo(slides.length - 1);
      else if (event.key.toLowerCase() === 'f') toggleFullscreen();
      else if (event.key.toLowerCase() === 'o') {
        setContentsSelection(active);
        setContentsOpen((open) => !open);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, contentsOpen, contentsSelection, imageOpen]);

  return (
    <main
      className={`fin-deck${active === 0 ? ' fin-cover-mode' : ''}${slide.type === 'divider' ? ' fin-section-mode' : ''}`}
      ref={deckRef}
      onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;
        const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        if (Math.abs(delta) > 70) {
          event.preventDefault();
          goTo(active + (delta < 0 ? 1 : -1));
        }
        touchStartX.current = null;
      }}
    >
      <canvas className="fin-network-canvas" ref={backgroundRef} aria-hidden="true" />
      <div className="fin-ambient fin-ambient-one" />
      <div className="fin-ambient fin-ambient-two" />
      <div className="fin-reference-brand" aria-label="FinBank">
        <Landmark size={15} strokeWidth={1.8} />
        <span>FINBANK</span>
      </div>
      <header className="fin-topbar">
        <button className="fin-brand" onClick={() => goTo(0)} aria-label="Revenir à la couverture">
          <span className="fin-brand-icon"><Landmark size={17} /></span>
          <span>FINBANK</span><i />
          <small>PROJET DE FIN D’ÉTUDES</small>
        </button>
        <div className="fin-top-actions">
          <span className="fin-live-label"><i /> PRÉSENTATION</span>
          <button className="fin-icon-button" onClick={() => setContentsOpen(true)} aria-label="Ouvrir le sommaire" title="Sommaire (O)"><LayoutGrid size={17} /></button>
          <button className="fin-icon-button" onClick={toggleFullscreen} aria-label="Basculer en plein écran" title="Plein écran (F)"><Maximize2 size={17} /></button>
        </div>
      </header>

      <aside className="fin-rail" aria-label="Progression de la présentation">
        <div className="fin-rail-label">PRÉSENTATION</div>
        <span className="fin-rail-track"><i style={{ '--fin-progress': `${((active + 1) / slides.length) * 100}%` } as CSSProperties} /></span>
        <span className="fin-rail-current">{String(active + 1).padStart(2, '0')}</span>
        <span className="fin-rail-total">{String(slides.length).padStart(2, '0')}</span>
      </aside>

      <section
        className={`fin-slide fin-slide-${slide.type ?? 'content'} fin-enter-${slideDirection}`}
        key={active}
        aria-live="polite"
        onClick={(event) => {
          const target = event.target;
          if (target instanceof Element && target.closest('button, a, input, textarea, select, label')) return;
          goTo(active - 1);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          goTo(active + 1);
        }}
      >
        <div className="fin-slide-content">
          {slide.type === 'cover' && <div className="fin-cover-layout">
            <header className="fin-cover-header">
              <div className="fin-cover-signature"><Landmark size={19} /><strong>FINBANK</strong></div>
              <span className="fin-cover-header-divider" />
              <span>PROJET DE FIN D’ÉTUDES</span>
              <div className="fin-cover-affiliation" aria-label="Polytechnique Sousse et VERMEG">
                <img src={polytechniqueLogo} alt="Polytechnique Sousse" />
                <img src={vermegLogo} alt="VERMEG" />
              </div>
              <span className="fin-cover-year">2025 — 2026</span>
            </header>
            {slide.content}
            <div className="fin-cover-copy">
              <p className="fin-eyebrow"><span /> PRÉSENTATION DU PROJET</p>
              <h1>{slide.title}</h1>
              <div className="fin-title-rule" />
              <p className="fin-slide-subtitle">{slide.subtitle}</p>
              <div className="fin-student-line"><span>RÉALISÉ PAR</span><strong>Nom et prénom de l’étudiant(e)</strong><i /> <span>ENCADRÉ PAR</span><strong>Nom de l’encadrant(e)</strong></div>
              <div className="fin-project-tags"><span>APPLICATION WEB</span><span>API REST</span><span>WORKFLOWS BPMN</span><span>ASSISTANT IA</span></div>
            </div>
            <div className="fin-cover-info">
              <div><i className="fin-info-accent fin-info-blue" /><small>ENCADRANT ACADÉMIQUE</small><strong>Nom à compléter</strong></div>
              <div><i className="fin-info-accent fin-info-indigo" /><small>PROJET</small><strong>FinBank · Digital Banking Platform</strong></div>
              <div><i className="fin-info-accent fin-info-mint" /><small>ENCADRANT PROFESSIONNEL</small><strong>Nom à compléter</strong></div>
            </div>
          </div>}

          {slide.type === 'divider' && <div className="fin-divider-layout">
            <div><p className="fin-eyebrow"><span /> {slide.chapter}</p><h2>{slide.title}</h2><div className="fin-title-rule" /><p className="fin-slide-subtitle">{slide.subtitle}</p></div>
            {slide.content}
          </div>}

          {slide.type === 'closing' && <div className="fin-closing-layout">
            <div className="fin-closing-glow" />
            <p className="fin-eyebrow"><span /> {slide.eyebrow}</p>
            <h2>{slide.title}</h2>
            {slide.subtitle && <p className="fin-slide-subtitle">{slide.subtitle}</p>}
            <div className="fin-title-rule" />
            {slide.content}
          </div>}

          {!slide.type && <div className="fin-standard-layout">
            <div className="fin-heading-block">
              <p className="fin-eyebrow"><span /> {slide.eyebrow ?? slide.chapter}</p>
              <h2>{slide.title}</h2>
              {slide.subtitle && <p className="fin-slide-subtitle">{slide.subtitle}</p>}
            </div>
            <div className="fin-slide-body">{slide.content}</div>
          </div>}
        </div>
      </section>

      <footer className="fin-controls">
        <div className="fin-controls-context"><span>{slide.chapter}</span><i /> <small>FINBANK · DIGITAL BANKING PLATFORM</small></div>
        <div className="fin-controls-center">
          <button className="fin-control-arrow" onClick={() => goTo(active - 1)} disabled={active === 0} aria-label="Diapositive précédente"><ArrowLeft size={18} /></button>
          <button className="fin-slide-count" onClick={() => { setContentsSelection(active); setContentsOpen(true); }} aria-label="Ouvrir le sommaire">
            <strong>{String(active + 1).padStart(2, '0')}</strong><span>/</span>{String(slides.length).padStart(2, '0')}
          </button>
          <button className="fin-control-arrow fin-next-arrow" onClick={() => goTo(active + 1)} disabled={active === slides.length - 1} aria-label="Diapositive suivante"><ArrowRight size={18} /></button>
        </div>
        <div className="fin-controls-hint"><span>← → · FLÈCHES</span><i /> <span>ÉCHAP · SOMMAIRE</span></div>
        <div className="fin-progress"><span style={{ width: `${((active + 1) / slides.length) * 100}%` }} /></div>
      </footer>

      {contentsOpen && <div className="fin-overlay" onClick={() => setContentsOpen(false)}>
        <section className="fin-contents" onClick={(event) => event.stopPropagation()} aria-label="Sommaire de la présentation">
          <div className="fin-contents-header"><div><p className="fin-eyebrow"><span /> SOMMAIRE</p><h2>Parcourir la présentation</h2></div><button className="fin-icon-button" onClick={() => setContentsOpen(false)} aria-label="Fermer le sommaire"><X size={18} /></button></div>
          <div className="fin-contents-grid">{slides.map((item, index) => <button className={index === contentsSelection ? 'selected' : ''} key={item.title} onMouseEnter={() => setContentsSelection(index)} onClick={() => goTo(index)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.title}</strong><small>{item.chapter}</small></button>)}</div>
          <p className="fin-contents-hint">Utilise les flèches du clavier pour naviguer, ou sélectionne directement une diapositive.</p>
        </section>
      </div>}

      {imageOpen && <div className="fin-image-lightbox" onClick={() => setImageOpen(null)} role="dialog" aria-modal="true" aria-label="Aperçu de la capture">
        <button className="fin-icon-button" onClick={() => setImageOpen(null)} aria-label="Fermer l’image"><X size={20} /></button>
        <img src={imageOpen} alt="Capture de présentation agrandie" />
      </div>}
    </main>
  );
}
