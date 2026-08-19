CREATE POLICY "civic_images_read" ON storage.objects FOR SELECT
  USING (bucket_id IN ('complaint-images','resolution-evidence'));
CREATE POLICY "civic_images_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'complaint-images');
CREATE POLICY "civic_evidence_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resolution-evidence' AND public.has_role(auth.uid(),'ADMIN'));