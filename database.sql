-- Table: lists
CREATE TABLE lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table: contacts
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  subscribed BOOLEAN DEFAULT TRUE NOT NULL,
  tags TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(list_id, email) -- Un email ne peut être qu'une fois dans une même liste
);

-- Table: campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'resend', 'nodemailer', 'ses'
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'failed'
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  stats_total INTEGER DEFAULT 0 NOT NULL,
  stats_sent INTEGER DEFAULT 0 NOT NULL,
  stats_failed INTEGER DEFAULT 0 NOT NULL,
  stats_opens INTEGER DEFAULT 0 NOT NULL,
  stats_clicks INTEGER DEFAULT 0 NOT NULL,
  stats_unsubscribes INTEGER DEFAULT 0 NOT NULL
);

-- Table: email_records
CREATE TABLE email_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  "from" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL, -- 'sent', 'failed', 'scheduled'
  error TEXT,
  opens INTEGER DEFAULT 0 NOT NULL,
  clicks INTEGER DEFAULT 0 NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table: analytics_events
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_id UUID REFERENCES email_records(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'open', 'click', 'unsubscribe'
  email TEXT NOT NULL,
  url TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS (pas de règles complexes pour le moment car usage serveur interne principalement)
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Autorisation anonyme: on permet tout lire/écrire, comme on est côté dashboard admin sans auth stricte pour l'instant
CREATE POLICY "Public Access" ON lists FOR ALL USING (true);
CREATE POLICY "Public Access" ON contacts FOR ALL USING (true);
CREATE POLICY "Public Access" ON campaigns FOR ALL USING (true);
CREATE POLICY "Public Access" ON email_records FOR ALL USING (true);
CREATE POLICY "Public Access" ON analytics_events FOR ALL USING (true);
