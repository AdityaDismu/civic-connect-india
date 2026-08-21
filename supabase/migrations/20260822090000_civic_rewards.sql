-- Civic Rewards: database-enforced, capped points ledger.
CREATE TABLE public.civic_point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('VALID_COMPLAINT', 'GENUINE_SUPPORT', 'RESOLUTION_VERIFICATION', 'REDEMPTION')),
  points INTEGER NOT NULL,
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE SET NULL,
  reward_code TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX civic_point_transactions_user_created_idx ON public.civic_point_transactions (user_id, created_at DESC);
CREATE UNIQUE INDEX civic_point_transactions_once_per_action_idx
  ON public.civic_point_transactions (user_id, action, complaint_id)
  WHERE complaint_id IS NOT NULL;
GRANT SELECT ON public.civic_point_transactions TO authenticated;
GRANT ALL ON public.civic_point_transactions TO service_role;
ALTER TABLE public.civic_point_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "civic points read own" ON public.civic_point_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.civic_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reward_code TEXT NOT NULL,
  reward_name TEXT NOT NULL,
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  confirmation_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX civic_redemptions_user_created_idx ON public.civic_redemptions (user_id, created_at DESC);
GRANT SELECT ON public.civic_redemptions TO authenticated;
GRANT ALL ON public.civic_redemptions TO service_role;
ALTER TABLE public.civic_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "civic redemptions read own" ON public.civic_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.award_civic_points(_action TEXT, _complaint_id UUID)
RETURNS TABLE (awarded INTEGER, reason TEXT, monthly_total INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user UUID := auth.uid();
  _points INTEGER;
  _valid BOOLEAN := false;
  _used INTEGER;
  _award INTEGER;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Please sign in to earn CivicPoints'; END IF;
  IF _action NOT IN ('VALID_COMPLAINT', 'GENUINE_SUPPORT', 'RESOLUTION_VERIFICATION') THEN RAISE EXCEPTION 'Invalid civic points action'; END IF;
  _points := CASE _action WHEN 'VALID_COMPLAINT' THEN 20 WHEN 'GENUINE_SUPPORT' THEN 5 ELSE 10 END;

  IF _action = 'VALID_COMPLAINT' THEN
    SELECT c.user_id = _user
      AND c.status IN ('AI_VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED', 'CITIZEN_VERIFICATION', 'RESOLVED')
      AND NOT EXISTS (
        SELECT 1 FROM public.ai_analyses a
        WHERE a.complaint_id = c.id AND a.kind = 'ISSUE'
          AND (COALESCE(a.raw->'report_integrity'->>'requires_authority_review', 'false') = 'true'
            OR COALESCE(a.raw->'report_integrity'->>'level', '') = 'HIGH'
            OR COALESCE(a.raw->'duplicate_signal'->>'matchedComplaintId', '') <> '')
      ) INTO _valid FROM public.complaints c WHERE c.id = _complaint_id;
  ELSIF _action = 'GENUINE_SUPPORT' THEN
    SELECT c.user_id <> _user
      AND c.status NOT IN ('REOPENED', 'ESCALATED')
      AND EXISTS (SELECT 1 FROM public.community_support s WHERE s.complaint_id = c.id AND s.user_id = _user)
      AND NOT EXISTS (
        SELECT 1 FROM public.ai_analyses a WHERE a.complaint_id = c.id AND a.kind = 'ISSUE'
          AND (COALESCE(a.raw->'report_integrity'->>'requires_authority_review', 'false') = 'true'
            OR COALESCE(a.raw->'report_integrity'->>'level', '') = 'HIGH'
            OR COALESCE(a.raw->'duplicate_signal'->>'matchedComplaintId', '') <> '')
      ) INTO _valid FROM public.complaints c WHERE c.id = _complaint_id;
  ELSE
    SELECT c.user_id = _user
      AND EXISTS (SELECT 1 FROM public.citizen_verifications v WHERE v.complaint_id = c.id AND v.user_id = _user AND v.is_verified)
      INTO _valid FROM public.complaints c WHERE c.id = _complaint_id;
  END IF;

  IF NOT COALESCE(_valid, false) THEN RETURN QUERY SELECT 0, 'This action is not eligible for CivicPoints.', 0; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.civic_point_transactions WHERE user_id = _user AND action = _action AND complaint_id = _complaint_id) THEN
    SELECT COALESCE(sum(points), 0)::INTEGER INTO _used FROM public.civic_point_transactions WHERE user_id = _user AND points > 0 AND created_at >= date_trunc('month', now());
    RETURN QUERY SELECT 0, 'Points for this action were already awarded.', _used; RETURN;
  END IF;
  SELECT COALESCE(sum(points), 0)::INTEGER INTO _used FROM public.civic_point_transactions WHERE user_id = _user AND points > 0 AND created_at >= date_trunc('month', now());
  _award := GREATEST(LEAST(_points, 100 - _used), 0);
  IF _award = 0 THEN RETURN QUERY SELECT 0, 'You have reached the 100 CivicPoints monthly earning limit.', _used; RETURN; END IF;
  INSERT INTO public.civic_point_transactions (user_id, action, points, complaint_id, description)
  VALUES (_user, _action, _award, _complaint_id, CASE _action WHEN 'VALID_COMPLAINT' THEN 'Valid civic report submitted' WHEN 'GENUINE_SUPPORT' THEN 'Supported a verified community report' ELSE 'Completed resolution verification' END);
  RETURN QUERY SELECT _award, CASE WHEN _award < _points THEN 'Monthly limit applied.' ELSE 'CivicPoints awarded.' END, _used + _award;
END; $$;
GRANT EXECUTE ON FUNCTION public.award_civic_points(TEXT, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.redeem_civic_reward(_reward_code TEXT, _reward_name TEXT, _points_cost INTEGER)
RETURNS TABLE (confirmation_code TEXT, remaining_points INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user UUID := auth.uid(); _balance INTEGER; _code TEXT;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Please sign in to redeem rewards'; END IF;
  IF (_reward_code, _points_cost) NOT IN (('BUS50', 50), ('METRO50', 50), ('EDU100', 100), ('TREE', 30), ('BADGE', 75)) THEN RAISE EXCEPTION 'Invalid reward'; END IF;
  SELECT COALESCE(sum(points), 0)::INTEGER INTO _balance FROM public.civic_point_transactions WHERE user_id = _user;
  IF _balance < _points_cost THEN RAISE EXCEPTION 'Not enough CivicPoints for this reward'; END IF;
  _code := 'CP-' || upper(substr(md5(gen_random_uuid()::text), 1, 8));
  INSERT INTO public.civic_redemptions (user_id, reward_code, reward_name, points_cost, confirmation_code) VALUES (_user, _reward_code, _reward_name, _points_cost, _code);
  INSERT INTO public.civic_point_transactions (user_id, action, points, reward_code, description) VALUES (_user, 'REDEMPTION', -_points_cost, _reward_code, 'Redeemed: ' || _reward_name);
  RETURN QUERY SELECT _code, _balance - _points_cost;
END; $$;
GRANT EXECUTE ON FUNCTION public.redeem_civic_reward(TEXT, TEXT, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_civic_rewards()
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'points', COALESCE((SELECT sum(points) FROM public.civic_point_transactions WHERE user_id = auth.uid()), 0),
    'monthly_earned', COALESCE((SELECT sum(points) FROM public.civic_point_transactions WHERE user_id = auth.uid() AND points > 0 AND created_at >= date_trunc('month', now())), 0),
    'history', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'action', action, 'points', points, 'description', description, 'created_at', created_at) ORDER BY created_at DESC) FROM public.civic_point_transactions WHERE user_id = auth.uid()), '[]'::jsonb),
    'redemptions', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'reward_name', reward_name, 'confirmation_code', confirmation_code, 'created_at', created_at) ORDER BY created_at DESC) FROM public.civic_redemptions WHERE user_id = auth.uid()), '[]'::jsonb)
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_civic_rewards() TO authenticated;
