CREATE POLICY views_select_policy ON public.user_prediction_views FOR SELECT USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::text));

CREATE POLICY views_insert_policy ON public.user_prediction_views FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY favorites_select_policy ON public.user_favorites FOR SELECT USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::text));

CREATE POLICY favorites_insert_policy ON public.user_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY favorites_delete_policy ON public.user_favorites FOR DELETE USING (auth.uid() = user_id);