# LinkedIn Profile Enrichment with Bright Data

En automatiserad rekryteringstjänst som hjälper företag att hitta, kontakta och boka intervjuer med lovande kandidater genom att berika LinkedIn-profiler med komplett profildata via Bright Data.

## 🏗️ Arkitektur

- **Frontend**: React 18.3.1 + TypeScript + Vite + Tailwind CSS + Radix UI
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Data Enrichment**: Bright Data API för LinkedIn-profiler
- **Säkerhet**: Row Level Security (RLS) policies

## 📁 Projektstruktur

```
/project-root
├── frontend/                  # React frontend (Vite + TS + Tailwind)
│   ├── src/
│   │   ├── pages/
│   │   │   └── Profiles.tsx   # Huvudsida med profillista + "Enrich" knappar
│   │   ├── components/
│   │   │   ├── EnrichButton.tsx
│   │   │   └── ui/button.tsx
│   │   └── lib/
│   │       ├── api.ts         # API client för Edge Functions
│   │       ├── types.ts       # TypeScript typer och Zod schemas
│   │       ├── supabase.ts    # Supabase client
│   │       └── utils.ts
│   ├── package.json
│   └── .env.example
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql    # Databas schema
│   │   └── 002_rls_policies.sql      # Säkerhetspolicies
│   └── seed.sql                      # Testdata
├── edge-functions/
│   └── enrich-profile/
│       └── index.ts           # Edge Function för Bright Data integration
├── .env                       # API-nycklar (lokalt)
└── README.md
```

## 🚀 Snabbstart

### 1. Miljövariabler

Kopiera och konfigurera miljövariabler:

```bash
# Root .env fil
cp .env.example .env
```

Fyll i dina API-nycklar i `.env`:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
BRIGHTDATA_API_KEY=your_brightdata_api_key
```

### 2. Supabase Setup

```bash
# Installera Supabase CLI
npm install -g supabase

# Logga in på Supabase
supabase login

# Länka till ditt projekt
supabase link --project-ref your-project-ref

# Kör migrationer
supabase db push

# Lägg till testdata
supabase db seed
```

### 3. Edge Function Deploy

```bash
# Deploya Edge Function
supabase functions deploy enrich-profile

# Sätt miljöhemligheter för Edge Function
supabase secrets set BRIGHTDATA_API_KEY=your_api_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Frontend Setup

```bash
cd frontend

# Installera dependencies
npm install

# Skapa frontend .env
cp .env.example .env.local

# Fyll i Supabase credentials i .env.local:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your_anon_key

# Starta utvecklingsserver
npm run dev
```

## 🔧 Användning

### Manuell Enrichment via UI

1. Öppna `http://localhost:5173/profiles`
2. Se listan över LinkedIn-profiler
3. Klicka "Enrich" för att berika en profil
4. Vänta på att statusen uppdateras till "success"
5. Klicka på pilen för att expandera och se berikad data

### API-anrop direkt till Edge Function

```bash
# POST till Edge Function
curl -X POST \
  'https://your-project.supabase.co/functions/v1/enrich-profile' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'apikey: YOUR_ANON_KEY' \
  -d '{
    "profile_id": "uuid-here",
    "options": {
      "force": false,
      "dry_run": false
    }
  }'
```

### Exempel på svar

```json
{
  "status": "success",
  "profile_id": "123e4567-e89b-12d3-a456-426614174000",
  "brief": {
    "experience_count": 5,
    "education_count": 2,
    "skills_count": 25
  },
  "enriched_at": "2024-01-15T10:30:00Z",
  "processing_time_ms": 2500
}
```

## 📊 Databasschema

### Profiles Tabell
```sql
- id: UUID (primärnyckel)
- name: text (valfritt)
- title: text (valfritt)  
- linkedin_url: text (obligatoriskt)
- enriched_data: JSONB (hela råsvaret från Bright Data)
- enriched_provider: text ("brightdata")
- enriched_status: text ("never", "pending", "processing", "success", "failed")
- enriched_at: timestamptz
- created_at: timestamptz
- updated_at: timestamptz
```

### Enrichment Jobs Tabell (Audit Log)
```sql
- id: UUID (primärnyckel)
- profile_id: UUID (FK till profiles.id)
- provider: text ("brightdata")
- status: text ("queued", "running", "success", "failed")
- request_payload_summary: text
- response_payload_excerpt: text
- error_message: text
- requested_at, started_at, finished_at: timestamptz
```

## 🔒 Säkerhet

- **RLS Policies**: Endast autentiserade användare kan läsa profiler
- **Service Role**: Edge Functions använder service role för privilegierade operationer
- **API Keys**: Aldrig exponerade i frontend, endast i Edge Functions
- **CORS**: Konfigurerat för säker kommunikation

## 🎯 Funktioner

### ✅ Implementerat (MVP)
- [x] Manuell enrichment via UI-knapp
- [x] Automatisk statusuppdatering
- [x] Expanderbar vy av berikad data
- [x] Idempotens (24h cache)
- [x] Force refresh-option
- [x] Felhantering och retry-logik
- [x] Audit logging av alla körningar
- [x] Real-time uppdateringar via React Query

### 🔄 Planerat (Skalning)
- [ ] Batch-enrichment av flera profiler
- [ ] Kö-system för stora volymer
- [ ] Multi-provider support (fallback)
- [ ] Avancerad filtrering och sökning
- [ ] Export av berikad data
- [ ] Kostnadsspårning per provider

## 🐛 Felsökning

### Vanliga problem

**Edge Function timeout:**
```bash
# Kontrollera Edge Function logs
supabase functions logs enrich-profile
```

**Bright Data API fel:**
- Verifiera API-nyckel i Supabase secrets
- Kontrollera rate limits (standard: 5 RPS)
- Validera LinkedIn URL-format

**Frontend kan inte ansluta:**
- Kontrollera CORS-inställningar
- Verifiera Supabase URL och anon key
- Kontrollera nätverksflikar i DevTools

### Testning

```bash
# Testa Edge Function lokalt
supabase functions serve enrich-profile

# Testa med dry_run
curl -X POST 'http://localhost:54321/functions/v1/enrich-profile' \
  -H 'Content-Type: application/json' \
  -d '{"profile_id": "test-uuid", "options": {"dry_run": true}}'
```

## 📈 Prestanda

- **Enrichment tid**: ~2-5 sekunder per profil
- **Rate limits**: Respekterar Bright Data's gränser
- **Caching**: 24h för att undvika onödiga anrop
- **Real-time**: UI uppdateras automatiskt via subscriptions

## 🔄 Deployment

### Frontend (Lovable Cloud)
```bash
npm run build
# Deploy till Lovable enligt deras instruktioner
```

### Edge Functions (Supabase)
```bash
supabase functions deploy enrich-profile --no-verify-jwt
```

## 📝 Licens

Detta är ett proof-of-concept projekt för automatiserad rekrytering med Bright Data integration.

## 🤝 Bidrag

1. Forka projektet
2. Skapa en feature branch
3. Commita dina ändringar
4. Pusha till branchen
5. Öppna en Pull Request

---

**Viktigt**: Se till att följa GDPR och LinkedIn's användarvillkor när du använder detta system i produktion.
