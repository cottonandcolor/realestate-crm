-- Seed projects + tasks from handwritten to-do lists (May 2026)
-- Org: My Real Estate Team

DO $$
DECLARE
  v_org UUID := 'd4031dd4-0e8f-4505-8d04-86717956448d';
  p1 UUID := 'a1000001-0000-4000-8000-000000000001';
  p2 UUID := 'a1000001-0000-4000-8000-000000000002';
  p3 UUID := 'a1000001-0000-4000-8000-000000000003';
  p4 UUID := 'a1000001-0000-4000-8000-000000000004';
  p5 UUID := 'a1000001-0000-4000-8000-000000000005';
  p6 UUID := 'a1000001-0000-4000-8000-000000000006';
  p7 UUID := 'a1000001-0000-4000-8000-000000000007';
  p8 UUID := 'a1000001-0000-4000-8000-000000000008';
  p9 UUID := 'a1000001-0000-4000-8000-000000000009';
BEGIN
  IF EXISTS (SELECT 1 FROM projects WHERE org_id = v_org AND name = '1220 Calendula Trl') THEN
    RAISE NOTICE 'Handwritten task seed already applied — skipping';
    RETURN;
  END IF;

  INSERT INTO projects (id, org_id, name, sort_order) VALUES
    (p1, v_org, '1220 Calendula Trl', 0),
    (p2, v_org, '806 Clearwell St', 1),
    (p3, v_org, '1401 Little Elm', 2),
    (p4, v_org, '107 Helen Cv', 3),
    (p5, v_org, '7206 Flagship dr', 4),
    (p6, v_org, 'Jarrell Land', 5),
    (p7, v_org, '821 W. New Hope dr', 6),
    (p8, v_org, 'Cedric – church space', 7),
    (p9, v_org, 'Johnson Rd land', 8);

  INSERT INTO tasks (org_id, project_id, title, status) VALUES
    -- 1220 Calendula Trl
    (v_org, p1, 'Mon - Remind Saurabh Utilities', 'todo'),
    (v_org, p1, 'Ask for Showcase payment', 'todo'),
    (v_org, p1, 'Lease Comps 3rd week of June', 'todo'),
    (v_org, p1, 'Follow up with open house showings', 'todo'),
    (v_org, p1, 'Clear the garage', 'todo'),
    (v_org, p1, 'My Hus - fix floor and deck', 'todo'),
    -- 806 Clearwell St
    (v_org, p2, 'Lock box auth form', 'todo'),
    (v_org, p2, 'Place signboard', 'todo'),
    (v_org, p2, 'Create a flyer', 'todo'),
    (v_org, p2, 'Priscilla - Key', 'todo'),
    (v_org, p2, 'Mon - Visit Jongkyu', 'todo'),
    -- 1401 Little Elm
    (v_org, p3, 'Upload back agent', 'todo'),
    (v_org, p3, 'Send invoice to Anitha', 'todo'),
    (v_org, p3, 'Collect rent on June 12th', 'todo'),
    (v_org, p3, 'Get renters insurance', 'todo'),
    (v_org, p3, 'Inventory form 6/25', 'todo'),
    -- 107 Helen Cv
    (v_org, p4, 'Mon - Hand keys to Manuel', 'todo'),
    (v_org, p4, 'Remove signboard', 'todo'),
    (v_org, p4, 'Give snug sign to Rafael', 'todo'),
    (v_org, p4, 'Vinaya pay brokerage', 'todo'),
    (v_org, p4, 'Han - set up tenant agent pay', 'todo'),
    (v_org, p4, 'Han - Take pictures', 'todo'),
    -- 7206 Flagship dr
    (v_org, p5, 'Figure out buildable space', 'todo'),
    (v_org, p5, 'Ask Kumar for contact', 'todo'),
    (v_org, p5, 'Ask owner for gate access', 'todo'),
    (v_org, p5, 'Visit the land', 'todo'),
    -- Jarrell Land
    (v_org, p6, 'Send pre develop mtg with county', 'todo'),
    (v_org, p6, 'Contact Sonterra Mud', 'todo'),
    (v_org, p6, 'Get easements', 'todo'),
    -- 821 W. New Hope dr
    (v_org, p7, 'Advertise in FB groups', 'todo'),
    (v_org, p7, 'Set a mtg with Arsh', 'todo'),
    -- Cedric – church space
    (v_org, p8, 'Contact agent to check availability', 'todo'),
    (v_org, p8, 'Current lease ends end of August', 'todo'),
    -- Johnson Rd land
    (v_org, p9, 'Contact Blanca', 'todo'),
    (v_org, p9, 'Figure out the right sale price', 'todo');
END $$;
