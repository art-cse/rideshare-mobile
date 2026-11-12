BEGIN;
CREATE TABLE IF NOT EXISTS public.local_accounts (
  profile_id TEXT PRIMARY KEY REFERENCES public.profilet(github_id),
  username TEXT NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{3,32}$'),
  password_hash TEXT NOT NULL,
  disabled BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.udhetimet ADD COLUMN IF NOT EXISTS aktiv BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.udhetimet ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS public.preferimet (
  perdoruesi_id TEXT NOT NULL REFERENCES public.profilet(github_id),
  udhetimi_id TEXT NOT NULL REFERENCES public.udhetimet(id),
  krijuar TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (perdoruesi_id, udhetimi_id)
);
CREATE OR REPLACE FUNCTION public.rideshare_identity(actor TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
  SELECT COALESCE(actor ~ '^[0-9]+$' OR
    (actor ~ '^local:[0-9a-f-]{36}$' AND EXISTS (SELECT 1 FROM public.local_accounts WHERE profile_id=actor AND NOT disabled)), false);
$$;
-- Every trip update (including legacy time edits and seat approvals) advances the version.
CREATE OR REPLACE FUNCTION public.rideshare_trip_version() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
  IF (NEW.nisja,NEW.destinacioni,NEW.ora,NEW.vendtakimi,NEW.aktiv) IS DISTINCT FROM
     (OLD.nisja,OLD.destinacioni,OLD.ora,OLD.vendtakimi,OLD.aktiv)
     AND EXISTS (SELECT 1 FROM public.kerkesat WHERE udhetimi_id=OLD.id AND statusi='accepted')
  THEN RAISE EXCEPTION 'Trip has accepted passengers'; END IF;
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS rideshare_trip_version ON public.udhetimet;
CREATE TRIGGER rideshare_trip_version BEFORE UPDATE ON public.udhetimet
FOR EACH ROW EXECUTE FUNCTION public.rideshare_trip_version();

CREATE OR REPLACE FUNCTION public.rideshare_manage_trip(actor TEXT, operation TEXT, trip_id TEXT,
  expected_version BIGINT, departure TEXT, destination TEXT, departure_time TEXT, meeting TEXT, seats INTEGER)
RETURNS TEXT LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE trip public.udhetimet%ROWTYPE;
BEGIN
  IF NOT public.rideshare_identity(actor) THEN RETURN 'hyr'; END IF;
  PERFORM 1 FROM public.profilet WHERE github_id=actor AND roli='shofer' FOR SHARE;
  IF NOT FOUND THEN RETURN 'ndaluar'; END IF;
  IF operation IS NULL OR operation NOT IN ('create','edit','archive') THEN RETURN 'fushe'; END IF;
  IF operation <> 'archive' AND (departure IS NULL OR length(trim(departure)) NOT BETWEEN 1 AND 120 OR
    destination IS NULL OR length(trim(destination)) NOT BETWEEN 1 AND 120 OR
    meeting IS NULL OR length(trim(meeting)) NOT BETWEEN 1 AND 200 OR
    departure_time IS NULL OR departure_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR
    seats IS NULL OR seats NOT BETWEEN 0 AND 8) THEN RETURN 'fushe'; END IF;
  IF operation='create' THEN
    IF trip_id IS NULL OR length(trip_id) NOT BETWEEN 1 AND 100 THEN RETURN 'fushe'; END IF;
    INSERT INTO public.udhetimet(id,nisja,destinacioni,ora,vendtakimi,vende,shofer_id)
      VALUES(trip_id,trim(departure),trim(destination),departure_time,trim(meeting),seats,actor);
    RETURN 'ruajtur';
  END IF;
  SELECT * INTO trip FROM public.udhetimet WHERE id=trip_id FOR UPDATE;
  IF NOT FOUND OR trip.shofer_id IS DISTINCT FROM actor OR NOT trip.aktiv THEN RETURN 'ndaluar'; END IF;
  IF expected_version IS DISTINCT FROM trip.version THEN RETURN 'vjetruar'; END IF;
  IF EXISTS (SELECT 1 FROM public.kerkesat WHERE udhetimi_id=trip_id AND statusi='accepted') AND
    (operation='archive' OR (trip.nisja,trip.destinacioni,trip.ora,trip.vendtakimi) IS DISTINCT FROM
      (trim(departure),trim(destination),departure_time,trim(meeting))) THEN RETURN 'ka_pasagjere'; END IF;
  IF operation='archive' THEN
    UPDATE public.udhetimet SET aktiv=false WHERE id=trip_id;
    UPDATE public.kerkesat SET statusi='rejected',ndryshuar=now() WHERE udhetimi_id=trip_id AND statusi='pending';
    RETURN 'hequr';
  END IF;
  UPDATE public.udhetimet SET nisja=trim(departure),destinacioni=trim(destination),ora=departure_time,
    vendtakimi=trim(meeting),vende=seats WHERE id=trip_id;
  RETURN 'ruajtur';
END;
$$;
REVOKE ALL ON FUNCTION public.rideshare_manage_trip(TEXT,TEXT,TEXT,BIGINT,TEXT,TEXT,TEXT,TEXT,INTEGER) FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.rideshare_request_action(
  actor TEXT, operation TEXT, trip_id TEXT, request_id BIGINT, seat_count INTEGER
) RETURNS TEXT LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  actor_role TEXT;
  trip public.udhetimet%ROWTYPE;
  req public.kerkesat%ROWTYPE;
  target_trip TEXT;
BEGIN
  IF NOT public.rideshare_identity(actor) THEN RETURN 'hyr'; END IF;
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
  IF NOT FOUND OR NOT trip.aktiv THEN RETURN 'mungon'; END IF;

  IF operation = 'create' THEN
    IF NOT public.rideshare_identity(trip.shofer_id)
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

COMMIT;
