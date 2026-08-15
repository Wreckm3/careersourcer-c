-- Local-only migration: Atlas request budgets. Do not apply automatically.
CREATE TABLE IF NOT EXISTS public.atlas_request_windows (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_started_at timestamptz NOT NULL DEFAULT date_trunc('minute', now()),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.atlas_request_windows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.atlas_request_windows FROM anon, authenticated;
GRANT ALL ON public.atlas_request_windows TO service_role;

CREATE OR REPLACE FUNCTION public.consume_atlas_request(_limit integer DEFAULT 12)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_window timestamptz := date_trunc('minute', now());
  usage public.atlas_request_windows%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR _limit < 1 OR _limit > 60 THEN
    RAISE EXCEPTION 'Invalid Atlas request limit';
  END IF;

  SELECT * INTO usage
  FROM public.atlas_request_windows
  WHERE user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.atlas_request_windows (user_id, window_started_at, request_count)
    VALUES (auth.uid(), current_window, 1);
    RETURN true;
  END IF;

  IF usage.window_started_at <> current_window THEN
    UPDATE public.atlas_request_windows
    SET window_started_at = current_window,
        request_count = 1,
        updated_at = now()
    WHERE user_id = auth.uid();
    RETURN true;
  END IF;

  IF usage.request_count >= _limit THEN
    RETURN false;
  END IF;

  UPDATE public.atlas_request_windows
  SET request_count = request_count + 1,
      updated_at = now()
  WHERE user_id = auth.uid();

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_atlas_request(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_atlas_request(integer) TO authenticated;
