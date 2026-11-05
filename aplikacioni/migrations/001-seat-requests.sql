-- Run after schema.sql and schema-java05.sql. No existing records are changed.
BEGIN;
CREATE TABLE IF NOT EXISTS public.kerkesat (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  udhetimi_id TEXT NOT NULL REFERENCES public.udhetimet(id),
  udhetari_id TEXT NOT NULL REFERENCES public.profilet(github_id),
  vende INTEGER NOT NULL CHECK (vende BETWEEN 1 AND 8),
  statusi TEXT NOT NULL DEFAULT 'pending'
    CHECK (statusi IN ('pending', 'accepted', 'rejected', 'cancelled')),
  krijuar TIMESTAMPTZ NOT NULL DEFAULT now(),
  ndryshuar TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS kerkesat_active_unique
  ON public.kerkesat (udhetari_id, udhetimi_id) WHERE statusi IN ('pending', 'accepted');
CREATE INDEX IF NOT EXISTS kerkesat_trip_status ON public.kerkesat (udhetimi_id, statusi);

-- Invoker privileges: only the trusted application server supplies actor from
-- its verified session. This function is not a public/browser API.
CREATE OR REPLACE FUNCTION public.rideshare_request_action(
  actor TEXT, operation TEXT, trip_id TEXT, request_id BIGINT, seat_count INTEGER
) RETURNS TEXT LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  actor_role TEXT;
  trip public.udhetimet%ROWTYPE;
  req public.kerkesat%ROWTYPE;
  target_trip TEXT;
BEGIN
  IF actor IS NULL OR actor !~ '^[0-9]+$' THEN RETURN 'hyr'; END IF;
  SELECT roli INTO actor_role FROM public.profilet WHERE github_id = actor FOR SHARE;
  IF NOT FOUND THEN RETURN 'hyr'; END IF;
  IF operation NOT IN ('create', 'accept', 'reject', 'cancel') OR operation IS NULL THEN RETURN 'fushe'; END IF;
  IF (operation IN ('create', 'cancel') AND actor_role <> 'udhetar')
    OR (operation IN ('accept', 'reject') AND actor_role <> 'shofer') THEN RETURN 'ndaluar'; END IF;

  IF operation = 'create' THEN
    IF seat_count IS NULL OR seat_count NOT BETWEEN 1 AND 8 THEN RETURN 'fushe'; END IF;
    target_trip := trip_id;
  ELSE
    SELECT udhetimi_id INTO target_trip FROM public.kerkesat WHERE id = request_id;
    IF NOT FOUND THEN RETURN 'ndaluar'; END IF;
  END IF;

  -- Every path uses the same order: profile -> trip -> request.
  -- Concurrent approvals for a trip wait here and read its latest seat count.
  SELECT * INTO trip FROM public.udhetimet WHERE id = target_trip FOR UPDATE;
  IF NOT FOUND THEN RETURN 'mungon'; END IF;

  IF operation = 'create' THEN
    IF trip.shofer_id IS NULL OR trip.shofer_id !~ '^[0-9]+$'
      OR NOT EXISTS (SELECT 1 FROM public.profilet WHERE github_id = trip.shofer_id AND roli = 'shofer')
      THEN RETURN 'pa_shofer'; END IF;
    IF EXISTS (SELECT 1 FROM public.kerkesat WHERE udhetari_id = actor
      AND udhetimi_id = target_trip AND statusi IN ('pending', 'accepted')) THEN RETURN 'dyfish'; END IF;
    IF trip.vende < seat_count THEN RETURN 'pa_vende'; END IF;
    INSERT INTO public.kerkesat (udhetimi_id, udhetari_id, vende)
      VALUES (target_trip, actor, seat_count) ON CONFLICT DO NOTHING;
    IF NOT FOUND THEN RETURN 'dyfish'; END IF;
    RETURN 'derguar';
  END IF;

  IF operation IN ('accept', 'reject') AND trip.shofer_id IS DISTINCT FROM actor THEN RETURN 'ndaluar'; END IF;
  SELECT * INTO req FROM public.kerkesat WHERE id = request_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'ndaluar'; END IF;
  IF operation = 'cancel' AND req.udhetari_id <> actor THEN RETURN 'ndaluar'; END IF;
  IF req.statusi <> 'pending' THEN RETURN 'perfunduar'; END IF;

  IF operation = 'accept' THEN
    IF trip.vende < req.vende THEN RETURN 'pa_vende'; END IF;
    UPDATE public.udhetimet SET vende = vende - req.vende WHERE id = target_trip;
    UPDATE public.kerkesat SET statusi = 'accepted', ndryshuar = now() WHERE id = request_id;
    RETURN 'pranuar';
  END IF;
  UPDATE public.kerkesat SET statusi = CASE WHEN operation = 'reject' THEN 'rejected' ELSE 'cancelled' END,
    ndryshuar = now() WHERE id = request_id;
  RETURN CASE WHEN operation = 'reject' THEN 'refuzuar' ELSE 'anuluar' END;
END;
$$;
REVOKE ALL ON FUNCTION public.rideshare_request_action(TEXT, TEXT, TEXT, BIGINT, INTEGER) FROM PUBLIC;
-- The migration owner can execute it. If the application uses a separate role,
-- grant that server-only role the required table/sequence and EXECUTE privileges.
COMMIT;
