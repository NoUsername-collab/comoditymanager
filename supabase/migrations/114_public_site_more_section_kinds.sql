-- 114 — Public site: sections for reviews, questions, facilities, nearby places and video.
-- The operator adds them from "Add a section"; nothing existing changes.

alter table public.public_site_sections
  drop constraint if exists public_site_sections_section_type_check;

alter table public.public_site_sections
  add constraint public_site_sections_section_type_check
  check (section_type in (
    'intro', 'benefits', 'gallery', 'text', 'cta', 'steps', 'stays', 'place',
    'reviews', 'faq', 'amenities', 'attractions', 'video'
  ));
