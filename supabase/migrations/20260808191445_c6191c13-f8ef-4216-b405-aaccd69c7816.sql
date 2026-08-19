-- ENUMS
CREATE TYPE public.app_role AS ENUM ('CITIZEN','ADMIN');
CREATE TYPE public.complaint_status AS ENUM ('SUBMITTED','AI_VERIFIED','ASSIGNED','IN_PROGRESS','RESOLUTION_SUBMITTED','CITIZEN_VERIFICATION','RESOLVED','REOPENED','ESCALATED');
CREATE TYPE public.severity_level AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'CITIZEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "user_roles_read_own" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'ADMIN'));

-- new user handler
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), COALESCE(NEW.email,''))
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'CITIZEN')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- DEPARTMENTS
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.departments TO anon, authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departments_public_read" ON public.departments FOR SELECT USING (true);
CREATE POLICY "departments_admin_write" ON public.departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'ADMIN')) WITH CHECK (public.has_role(auth.uid(),'ADMIN'));

-- COMPLAINTS
CREATE SEQUENCE public.complaint_display_seq START 1;
CREATE OR REPLACE FUNCTION public.next_complaint_display_id()
RETURNS TEXT LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'CP-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.complaint_display_seq')::text, 5, '0');
$$;

CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id TEXT NOT NULL UNIQUE DEFAULT public.next_complaint_display_id(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'OTHER',
  severity public.severity_level NOT NULL DEFAULT 'MEDIUM',
  status public.complaint_status NOT NULL DEFAULT 'SUBMITTED',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  priority_score INTEGER NOT NULL DEFAULT 0 CHECK (priority_score BETWEEN 0 AND 100),
  priority_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_department TEXT NOT NULL DEFAULT '',
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  support_count INTEGER NOT NULL DEFAULT 0,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX complaints_status_idx ON public.complaints(status);
CREATE INDEX complaints_priority_idx ON public.complaints(priority_score DESC);
CREATE INDEX complaints_user_idx ON public.complaints(user_id);
GRANT SELECT, INSERT, UPDATE ON public.complaints TO authenticated;
GRANT SELECT ON public.complaints TO anon;
GRANT ALL ON public.complaints TO service_role;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "complaints_public_read" ON public.complaints FOR SELECT USING (true);
CREATE POLICY "complaints_insert_own" ON public.complaints FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "complaints_update_own_or_admin" ON public.complaints FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'ADMIN'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'ADMIN'));
CREATE TRIGGER complaints_updated_at BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- COMPLAINT IMAGES
CREATE TABLE public.complaint_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'REPORT',
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX complaint_images_complaint_idx ON public.complaint_images(complaint_id);
GRANT SELECT, INSERT ON public.complaint_images TO authenticated;
GRANT SELECT ON public.complaint_images TO anon;
GRANT ALL ON public.complaint_images TO service_role;
ALTER TABLE public.complaint_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "complaint_images_public_read" ON public.complaint_images FOR SELECT USING (true);
CREATE POLICY "complaint_images_insert" ON public.complaint_images FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

-- AI ANALYSES
CREATE TABLE public.ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'REPORT',
  issue_type TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT '',
  risk TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  suggested_department TEXT NOT NULL DEFAULT '',
  confidence TEXT NOT NULL DEFAULT '',
  assessment TEXT,
  reason TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ai_analyses_complaint_idx ON public.ai_analyses(complaint_id);
GRANT SELECT, INSERT ON public.ai_analyses TO authenticated;
GRANT SELECT ON public.ai_analyses TO anon;
GRANT ALL ON public.ai_analyses TO service_role;
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_analyses_public_read" ON public.ai_analyses FOR SELECT USING (true);
CREATE POLICY "ai_analyses_insert" ON public.ai_analyses FOR INSERT TO authenticated WITH CHECK (true);

-- STATUS HISTORY
CREATE TABLE public.status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  from_status public.complaint_status,
  to_status public.complaint_status NOT NULL,
  changed_by UUID,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX status_history_complaint_idx ON public.status_history(complaint_id, created_at);
GRANT SELECT ON public.status_history TO anon, authenticated;
GRANT ALL ON public.status_history TO service_role;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "status_history_public_read" ON public.status_history FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.record_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.status_history (complaint_id, from_status, to_status, changed_by, note)
    VALUES (NEW.id, NULL, NEW.status, NEW.user_id, 'Complaint submitted');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.status_history (complaint_id, from_status, to_status, changed_by, note)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), '');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER complaints_status_history_ins AFTER INSERT ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.record_status_change();
CREATE TRIGGER complaints_status_history_upd AFTER UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.record_status_change();

-- ASSIGNMENTS
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  assigned_by UUID,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX assignments_complaint_idx ON public.assignments(complaint_id);
GRANT SELECT, INSERT ON public.assignments TO authenticated;
GRANT SELECT ON public.assignments TO anon;
GRANT ALL ON public.assignments TO service_role;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments_public_read" ON public.assignments FOR SELECT USING (true);
CREATE POLICY "assignments_admin_insert" ON public.assignments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'ADMIN'));

-- COMMUNITY SUPPORT
CREATE TABLE public.community_support (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (complaint_id, user_id)
);
CREATE INDEX community_support_complaint_idx ON public.community_support(complaint_id);
GRANT SELECT, INSERT, DELETE ON public.community_support TO authenticated;
GRANT SELECT ON public.community_support TO anon;
GRANT ALL ON public.community_support TO service_role;
ALTER TABLE public.community_support ENABLE ROW LEVEL SECURITY;
CREATE POLICY "support_public_read" ON public.community_support FOR SELECT USING (true);
CREATE POLICY "support_insert_own" ON public.community_support FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "support_delete_own" ON public.community_support FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_support_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid UUID;
BEGIN
  cid := COALESCE(NEW.complaint_id, OLD.complaint_id);
  UPDATE public.complaints SET support_count = (SELECT count(*) FROM public.community_support WHERE complaint_id = cid) WHERE id = cid;
  RETURN NULL;
END; $$;
CREATE TRIGGER support_count_sync AFTER INSERT OR DELETE ON public.community_support
  FOR EACH ROW EXECUTE FUNCTION public.sync_support_count();

-- RESOLUTION EVIDENCE
CREATE TABLE public.resolution_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  before_image_url TEXT NOT NULL DEFAULT '',
  after_image_url TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  submitted_by UUID,
  ai_assessment TEXT,
  ai_reason TEXT,
  ai_confidence TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX resolution_evidence_complaint_idx ON public.resolution_evidence(complaint_id);
GRANT SELECT, INSERT ON public.resolution_evidence TO authenticated;
GRANT SELECT ON public.resolution_evidence TO anon;
GRANT ALL ON public.resolution_evidence TO service_role;
ALTER TABLE public.resolution_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evidence_public_read" ON public.resolution_evidence FOR SELECT USING (true);
CREATE POLICY "evidence_admin_insert" ON public.resolution_evidence FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'ADMIN'));

-- CITIZEN VERIFICATIONS
CREATE TABLE public.citizen_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_verified BOOLEAN NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  comment TEXT NOT NULL DEFAULT '',
  evidence_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX citizen_verifications_complaint_idx ON public.citizen_verifications(complaint_id);
GRANT SELECT, INSERT ON public.citizen_verifications TO authenticated;
GRANT SELECT ON public.citizen_verifications TO anon;
GRANT ALL ON public.citizen_verifications TO service_role;
ALTER TABLE public.citizen_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verifications_public_read" ON public.citizen_verifications FOR SELECT USING (true);
CREATE POLICY "verifications_insert_reporter" ON public.citizen_verifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.complaints c WHERE c.id = complaint_id AND c.user_id = auth.uid()));

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  event TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_read_own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_insert_authenticated" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- ESCALATIONS
CREATE TABLE public.escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX escalations_complaint_idx ON public.escalations(complaint_id);
GRANT SELECT, INSERT, UPDATE ON public.escalations TO authenticated;
GRANT ALL ON public.escalations TO service_role;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "escalations_read" ON public.escalations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'ADMIN') OR EXISTS (SELECT 1 FROM public.complaints c WHERE c.id = complaint_id AND c.user_id = auth.uid()));
CREATE POLICY "escalations_insert" ON public.escalations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "escalations_admin_update" ON public.escalations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'ADMIN')) WITH CHECK (public.has_role(auth.uid(),'ADMIN'));

-- SEED DEPARTMENTS
INSERT INTO public.departments (name, slug, description, contact_email) VALUES
  ('Road Maintenance','road-maintenance','Potholes, damaged footpaths, road surface repairs','roads@civicpulse.gov'),
  ('Waste Management','waste-management','Garbage overflow, uncollected waste, dumping','waste@civicpulse.gov'),
  ('Water Supply','water-supply','Water leakage, pipeline bursts, supply failures','water@civicpulse.gov'),
  ('Drainage Department','drainage','Blocked drains, waterlogging, open manholes','drainage@civicpulse.gov'),
  ('Electrical','electrical','Streetlights, exposed wiring, electrical hazards','electrical@civicpulse.gov'),
  ('Garden / Disaster Response','garden-disaster','Fallen trees, obstructions, emergency response','response@civicpulse.gov');