-- =============================================================================
-- AgentCommand Real Estate CRM — Full Database Schema
-- Run this in Supabase SQL Editor (or as a migration)
-- =============================================================================

-- 1. ADMIN USERS (must come first — contacts references this)
-- =============================================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin','member')),
  permissions JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CONTACTS (leads / clients)
-- =============================================================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  service_type TEXT,
  message TEXT,
  source TEXT DEFAULT 'website',
  status TEXT DEFAULT 'new' CHECK (status IN ('new','contacted','showing_scheduled','offer_submitted','under_contract','closed','lost')),
  lead_type TEXT CHECK (lead_type IN ('buyer','seller','both','investor','renter')),
  lead_source TEXT,
  budget_min TEXT,
  budget_max TEXT,
  preferred_areas TEXT,
  scheduled_date TEXT,
  scheduled_time TEXT,
  address TEXT,
  notes TEXT,
  close_reason TEXT,
  next_follow_up TEXT,
  assigned_to UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TEMPLATES (SMS + Email)
-- =============================================================================
CREATE TABLE IF NOT EXISTS templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'sms' CHECK (type IN ('sms','email')),
  category TEXT DEFAULT 'general',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. OUTREACH LOG
-- =============================================================================
CREATE TABLE IF NOT EXISTS outreach_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  prospect_id UUID,
  type TEXT DEFAULT 'email',
  subject TEXT,
  body TEXT,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ACTIVITY LOG
-- =============================================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  note TEXT,
  user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TRANSACTIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_address TEXT NOT NULL,
  client_name TEXT,
  client_phone TEXT,
  side TEXT DEFAULT 'Buyer' CHECK (side IN ('Buyer','Seller','Dual')),
  contract_date TEXT,
  closing_date TEXT,
  sale_price NUMERIC DEFAULT 0,
  commission_pct NUMERIC DEFAULT 3,
  broker_split_pct NUMERIC DEFAULT 30,
  referral_fee NUMERIC DEFAULT 0,
  gross_commission NUMERIC DEFAULT 0,
  net_commission NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','closed','fell_through')),
  milestones JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SOI
-- =============================================================================
CREATE TABLE IF NOT EXISTS soi_people (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  relationship TEXT DEFAULT 'Past Client',
  close_date TEXT,
  birthday TEXT,
  address TEXT,
  notes TEXT,
  last_touch TIMESTAMPTZ,
  touch_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SOI TOUCHES
-- =============================================================================
CREATE TABLE IF NOT EXISTS soi_touches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  soi_id UUID REFERENCES soi_people(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_scheduled ON contacts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_contacts_assigned ON contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_outreach_contact ON outreach_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_activity_contact ON activity_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_soi_touches_soi ON soi_touches(soi_id);

-- UPDATED_AT TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contacts_updated_at ON contacts;
CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS transactions_updated_at ON transactions;
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS soi_updated_at ON soi_people;
CREATE TRIGGER soi_updated_at BEFORE UPDATE ON soi_people FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- SEED: Starter templates
INSERT INTO templates (name, body, type, category) VALUES
('New lead intro', 'Hi {name}, this is {agent_name} — I received your inquiry and would love to help! When is a good time to chat?', 'sms', 'new_lead'),
('Showing follow-up', 'Hi {name}, thanks for viewing the property today! What did you think? Let me know if you''d like to see more options.', 'sms', 'showing'),
('Offer submitted', 'Hi {name}, great news — your offer has been submitted! I''ll keep you posted as soon as I hear back.', 'sms', 'offer'),
('Under contract', 'Hi {name}, congratulations! Your offer was accepted and you''re officially under contract!', 'sms', 'under_contract'),
('Open house follow-up', 'Hi {name}, thanks for visiting the open house! Any questions about the property? Happy to schedule a private showing.', 'sms', 'showing'),
('Closing reminder', 'Hi {name}, just a reminder — your closing is scheduled for {date}. Let me know if you need anything!', 'sms', 'closing'),
('Price reduction', 'Hi {name}, a property you liked just had a price reduction. Want me to send the updated details?', 'sms', 'showing'),
('Review request', 'Hi {name}, congrats on your new home! If you had a great experience, I''d really appreciate a Google review!', 'sms', 'post_close'),
('Homeiversary', 'Hi {name}, happy home-iversary! Hope you''re loving it. Let me know if you ever need anything!', 'sms', 'post_close'),
('Listing follow-up', 'Hi {name}, any updates on your listing timeline? I''m here whenever you''re ready.', 'sms', 'listing')
ON CONFLICT DO NOTHING;

INSERT INTO templates (name, subject, body, type, category) VALUES
('New Buyer Welcome', 'Welcome to Your Home Search', 'Hi {name},

Thank you for reaching out! I''m excited to help you find your new home.

To get started, it would help to know your preferred neighborhoods, bedrooms/bathrooms, must-haves, and timeline.

I''d love to set up a quick call to discuss. Looking forward to working with you!', 'email', 'new_lead'),
('Listing Presentation Follow-up', 'Thank You for Meeting', 'Hi {name},

Thank you for meeting with me about listing your property at {property_address}. I''ll have the full CMA and marketing plan ready within 24 hours.

Don''t hesitate to reach out with any questions.', 'email', 'listing'),
('Under Contract Update', 'Transaction Update', 'Hi {name},

We''re making progress on {property_address}! Here''s where things stand. I''ll keep you informed every step of the way.

Call or text me anytime with questions.', 'email', 'under_contract'),
('Closing Congrats', 'Congratulations on Your New Home!', 'Hi {name},

Congratulations on closing on {property_address}! It was a pleasure working with you.

Keep my number handy for vendor recommendations. And if you know anyone buying or selling, referrals are the highest compliment!

Wishing you all the best in your new home!', 'email', 'post_close')
ON CONFLICT DO NOTHING;
