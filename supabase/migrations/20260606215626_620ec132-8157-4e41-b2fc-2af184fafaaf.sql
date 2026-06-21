UPDATE public.orders
SET requested_time = requested_time + INTERVAL '1 day',
    prep_start_time = CASE WHEN prep_start_time IS NULL THEN NULL ELSE prep_start_time + INTERVAL '1 day' END
WHERE status IN ('to_prepare','in_oven')
  AND requested_time < now() - INTERVAL '6 hours';