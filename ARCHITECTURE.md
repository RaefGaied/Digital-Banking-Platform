# Diagrammes d'architecture

## Diagramme global (Mermaid)
```mermaid
graph LR
  U[Utilisateur] --> F[Frontend (React + Vite)]
  F -->|API REST (JWT)| B[Backend (Spring Boot)]
  B --> DB[(PostgreSQL)]
  B --> BPMN[Engine BPMN]
  BPMN --> DB
  B -->|Notifications| N[Service Notifications]
```

## Séquence: virement simple
```mermaid
sequenceDiagram
  participant U as Utilisateur
  participant F as Frontend
  participant B as Backend
  participant DB as PostgreSQL
  U->>F: Remplir formulaire virement
  F->>B: POST /virements (JWT)
  B->>B: Valider règles métier
  B->>DB: Persister opération
  B->>BPMN: Déclencher workflow validation
  BPMN->>B: Callback validation
  B->>F: 200 OK (statut virement)
```

## Notes
- Diagrammes textuels Mermaid fournis pour insertion rapide dans documentation ou conversion PNG via outils (Mermaid CLI ou VS Code extensions).
