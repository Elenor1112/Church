-- Rename the Friday category labels to the finalised topics, and give the four
-- placeholder categories (category_a…d) their real names.
--
-- Only the labels change. `slug` is a Postgres enum baked into attendance rows,
-- so it stays as-is even where it no longer matches the label it started from
-- (e.g. `bible` now reads "Dogmatic theology").
UPDATE "friday_categories"
SET "label_ar" = 'العهد الجديد ولاهوت عقيدي', "label_en" = 'Dogmatic theology'
WHERE "slug" = 'bible';--> statement-breakpoint

UPDATE "friday_categories"
SET "label_ar" = 'ليتورجيا وطقس', "label_en" = 'Liturgy and Rite'
WHERE "slug" = 'contemporary_issues';--> statement-breakpoint

UPDATE "friday_categories"
SET "label_ar" = 'تاريخ كنيسة', "label_en" = 'Church history'
WHERE "slug" = 'saints_lives';--> statement-breakpoint

UPDATE "friday_categories"
SET "label_ar" = 'العهد القديم وترجمات', "label_en" = 'The Old Testament and Translations'
WHERE "slug" = 'category_a';--> statement-breakpoint

UPDATE "friday_categories"
SET "label_ar" = 'قضايا معاصرة وتربية صحية', "label_en" = 'Contemporary issues and health education'
WHERE "slug" = 'category_b';--> statement-breakpoint

UPDATE "friday_categories"
SET "label_ar" = 'الكراسي الرسولية والطوائف', "label_en" = 'Apostolic Sees and Sects'
WHERE "slug" = 'category_c';--> statement-breakpoint

UPDATE "friday_categories"
SET "label_ar" = 'دفاعيات', "label_en" = 'Apologetics'
WHERE "slug" = 'category_d';
