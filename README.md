# MailerFind v2 🚀
> Plateforme email complète — Next.js 14

## Fonctionnalités

| Feature | Description |
|---|---|
| 📤 **3 Providers** | Resend, Nodemailer SMTP, Amazon SES |
| 📣 **Campagnes bulk** | Envoi en masse avec personnalisation `{{name}}` |
| ⏰ **Envoi planifié** | Emails et campagnes avec date/heure d'envoi différé |
| 📊 **Analytics** | Taux d'ouverture, taux de clic, désabonnements |
| 👁 **Tracking** | Pixel invisible d'ouverture + tracking des clics |
| 👥 **Contacts** | Listes, import CSV, tags |
| 🚫 **Désabonnement** | Page de désabonnement automatique dans chaque email |
| 📝 **Éditeur riche** | HTML, gras, titres, listes, couleurs, liens |
| 📎 **Pièces jointes** | Drag & drop |
| 📜 **Historique** | Log complet avec filtres |

## Démarrage rapide

```bash
npm install
cp .env.example .env.local
# Remplis tes clés dans .env.local
npm run dev
```

→ [http://localhost:3000](http://localhost:3000)

## Variables d'environnement

```env
# Base URL (pour le tracking)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Resend
RESEND_API_KEY=re_xxxx

# SMTP (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=email@gmail.com
SMTP_PASS=mot_de_passe_app

# Amazon SES
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

## Architecture

```
mailerfind/
├── app/
│   ├── page.tsx                    # SPA principale (5 vues)
│   └── api/
│       ├── send-email/             # Envoi unitaire + historique
│       ├── bulk-send/              # Envoi en masse
│       ├── campaigns/              # CRUD campagnes + planification
│       ├── contacts/               # CRUD contacts, listes, import CSV
│       ├── analytics/              # Dashboard stats
│       ├── track/open/[emailId]/   # Pixel de tracking
│       ├── track/click/            # Tracking clics + redirect
│       └── unsubscribe/[token]/    # Page de désabonnement
├── lib/
│   ├── store.ts                    # Store en mémoire (→ remplacer par DB)
│   └── sender.ts                   # Abstraction multi-provider
└── types/index.ts
```

## Production

Remplace le store en mémoire par une vraie DB :
- **Contacts/Campagnes** → PostgreSQL avec Prisma
- **Analytics** → ClickHouse ou TimescaleDB
- **Jobs planifiés** → BullMQ + Redis
- **Tracking pixel** → CDN edge pour la performance
