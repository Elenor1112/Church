-- Insert the four new category rows. Split from 0012 because the enum values
-- they use must be committed by an earlier transaction before they can be
-- referenced here.
--
-- `free` is pushed to the last sort slot so it stays at the end of the list in
-- the scanner picker and the member home progress grid.
INSERT INTO "friday_categories" ("slug", "label_ar", "label_en", "sort_order")
VALUES
  ('category_a', 'a', 'a', 4),
  ('category_b', 'b', 'b', 5),
  ('category_c', 'c', 'c', 6),
  ('category_d', 'd', 'd', 7)
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint

UPDATE "friday_categories" SET "sort_order" = 8 WHERE "slug" = 'free';
