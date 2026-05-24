-- Allow activities to be linked to a contact (in addition to lead / listing / task)

ALTER TABLE activities
  ADD COLUMN contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

CREATE INDEX idx_activities_lead    ON activities(lead_id)    WHERE lead_id    IS NOT NULL;
CREATE INDEX idx_activities_contact ON activities(contact_id) WHERE contact_id IS NOT NULL;
