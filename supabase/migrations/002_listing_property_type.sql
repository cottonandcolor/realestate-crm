-- Add property_type to listings

CREATE TYPE property_type AS ENUM ('sfh', 'condo', 'townhome', 'land', 'lease', 'rental');

ALTER TABLE listings
  ADD COLUMN property_type property_type NULL;

CREATE INDEX idx_listings_property_type ON listings(org_id, property_type);
