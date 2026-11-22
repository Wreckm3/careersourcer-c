-- Local-only follow-up for the Atlas request limiter. Do not apply automatically.
--
-- The original SELECT ... FOR UPDATE / INSERT path races when a user has no
-- existing window row. The initial insert below is conflict-safe, then the
-- locked row path preserves the original 12-per-minute behavior.
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
  IF auth.uid() IS NULL OR _limit IS NULL OR _limit < 1 OR _limit > 60 THEN
    RAISE EXCEPTION 'Invalid Atlas request limit';
  END IF;

  INSERT INTO public.atlas_request_windows (user_id, window_started_at, request_count)
  VALUES (auth.uid(), current_window, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO usage
  FROM public.atlas_request_windows
  WHERE user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Atlas request window is unavailable';
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
