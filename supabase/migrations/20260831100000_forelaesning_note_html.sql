ALTER TABLE public.forelaesning ADD COLUMN note_html text;
ALTER TABLE public.forelaesning ADD CONSTRAINT forelaesning_fag_id_nummer_key UNIQUE (fag_id, nummer);
