-- Follow-up date for leads (date-only, no time)
ALTER TABLE leads
  ADD COLUMN contact_by DATE;

CREATE INDEX idx_leads_contact_by ON leads(org_id, contact_by)
  WHERE contact_by IS NOT NULL;
