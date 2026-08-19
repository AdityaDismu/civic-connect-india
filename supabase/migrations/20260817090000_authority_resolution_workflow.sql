CREATE OR REPLACE FUNCTION public.record_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE action_note text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.status_history (complaint_id, from_status, to_status, changed_by, note)
    VALUES (NEW.id, NULL, NEW.status, NEW.user_id, 'Complaint submitted');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    action_note := CASE NEW.status
      WHEN 'ASSIGNED' THEN 'Department assigned for action'
      WHEN 'IN_PROGRESS' THEN 'Department started work on site'
      WHEN 'CITIZEN_VERIFICATION' THEN 'Department submitted final resolution evidence'
      WHEN 'RESOLVED' THEN 'Citizen confirmed the resolution'
      WHEN 'REOPENED' THEN 'Citizen reopened the issue for further work'
      WHEN 'ESCALATED' THEN 'Report escalated for senior municipal review'
      ELSE '' END;
    INSERT INTO public.status_history (complaint_id, from_status, to_status, changed_by, note)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), action_note);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_admins_when_case_reopened()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE case_id text;
BEGIN
  IF NEW.is_verified = false THEN
    SELECT display_id INTO case_id FROM public.complaints WHERE id = NEW.complaint_id;
    INSERT INTO public.notifications (user_id, complaint_id, event, title, body)
    SELECT user_id, NEW.complaint_id, 'CITIZEN_REOPENED',
      COALESCE(case_id, 'Case') || ': citizen reopened the issue',
      CASE WHEN NEW.reason <> '' THEN NEW.reason ELSE 'The citizen reported that the issue still needs attention.' END
    FROM public.user_roles WHERE role = 'ADMIN';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS citizen_reopen_notification ON public.citizen_verifications;
CREATE TRIGGER citizen_reopen_notification AFTER INSERT ON public.citizen_verifications
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_when_case_reopened();
