-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: lists
CREATE TABLE IF NOT EXISTS lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table: contacts
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  subscribed BOOLEAN DEFAULT TRUE NOT NULL,
  tags TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(list_id, email)
);

-- Table: campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  stats_total INTEGER DEFAULT 0 NOT NULL,
  stats_sent INTEGER DEFAULT 0 NOT NULL,
  stats_failed INTEGER DEFAULT 0 NOT NULL,
  stats_opens INTEGER DEFAULT 0 NOT NULL,
  stats_clicks INTEGER DEFAULT 0 NOT NULL,
  stats_unsubscribes INTEGER DEFAULT 0 NOT NULL,
  attachments JSONB DEFAULT '[]'::JSONB
);

-- Table: email_records
CREATE TABLE IF NOT EXISTS email_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  "from" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  subject TEXT NOT NULL,
  provider_id TEXT, -- ID de Resend pour le tracking
  status TEXT NOT NULL,
  error TEXT,
  opens INTEGER DEFAULT 0 NOT NULL,
  clicks INTEGER DEFAULT 0 NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table: analytics_events
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_id UUID REFERENCES email_records(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  email TEXT NOT NULL,
  url TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table: inbound_emails
CREATE TABLE IF NOT EXISTS inbound_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_email TEXT NOT NULL,
  from_name TEXT,
  "to" TEXT NOT NULL,
  subject TEXT,
  html TEXT,
  text TEXT,
  attachments JSONB DEFAULT '[]'::JSONB,
  status TEXT DEFAULT 'unread' NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_emails ENABLE ROW LEVEL SECURITY;

-- Autorisation anonyme (Policies)
-- Note: On vérifie si la policy existe avant de la créer (Supabase UI le fait parfois automatiquement)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'lists') THEN
        CREATE POLICY "Public Access" ON lists FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'contacts') THEN
        CREATE POLICY "Public Access" ON contacts FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'campaigns') THEN
        CREATE POLICY "Public Access" ON campaigns FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'email_records') THEN
        CREATE POLICY "Public Access" ON email_records FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'analytics_events') THEN
        CREATE POLICY "Public Access" ON analytics_events FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'inbound_emails') THEN
        CREATE POLICY "Public Access" ON inbound_emails FOR ALL USING (true);
    END IF;
END $$;
