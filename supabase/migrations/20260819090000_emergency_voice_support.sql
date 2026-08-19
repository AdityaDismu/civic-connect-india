ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS is_emergency boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_assessment jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS voice_note_url text,
  ADD COLUMN IF NOT EXISTS voice_transcript text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "voice_notes_read" ON storage.objects FOR SELECT USING (bucket_id = 'voice-notes');
CREATE POLICY "voice_notes_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'voice-notes');
