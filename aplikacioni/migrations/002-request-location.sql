-- Optional location sharing on a real request. No existing rows are overwritten.
BEGIN;
ALTER TABLE public.kerkesat ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.kerkesat ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.kerkesat'::regclass AND conname='kerkesat_location_valid') THEN
    ALTER TABLE public.kerkesat ADD CONSTRAINT kerkesat_location_valid CHECK (
      (latitude IS NULL AND longitude IS NULL) OR
      (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.rideshare_create_request_with_location(
  actor TEXT, trip_id TEXT, seat_count INTEGER, lat DOUBLE PRECISION, lng DOUBLE PRECISION
) RETURNS TEXT LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE result TEXT;
BEGIN
  IF lat IS NULL OR lng IS NULL OR NOT (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180) THEN RETURN 'vendndodhja'; END IF;
  -- The original function authenticates the role/ownership, locks the trip and
  -- creates at most one active request. Its locks last through this transaction.
  result := public.rideshare_request_action(actor, 'create', trip_id, NULL, seat_count);
  IF result = 'derguar' THEN
    UPDATE public.kerkesat SET latitude=lat, longitude=lng
      WHERE udhetari_id=actor AND udhetimi_id=trip_id AND statusi='pending';
  END IF;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.rideshare_create_request_with_location(TEXT,TEXT,INTEGER,DOUBLE PRECISION,DOUBLE PRECISION) FROM PUBLIC;
COMMIT;
