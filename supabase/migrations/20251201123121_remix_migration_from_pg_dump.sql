CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  RETURN new;
END;
$$;


--
-- Name: has_role(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: update_bundle_final_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_bundle_final_status() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_bundle_id uuid;
  v_total_predictions integer;
  v_won_predictions integer;
  v_lost_predictions integer;
  v_pending_predictions integer;
BEGIN
  -- Get the bundle_id from the updated prediction
  v_bundle_id := COALESCE(NEW.bundle_id, OLD.bundle_id);
  
  -- If no bundle_id, nothing to update
  IF v_bundle_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Count predictions by result status
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE result = 'won'),
    COUNT(*) FILTER (WHERE result = 'lost'),
    COUNT(*) FILTER (WHERE result = 'pending' OR result IS NULL)
  INTO 
    v_total_predictions,
    v_won_predictions,
    v_lost_predictions,
    v_pending_predictions
  FROM public.predictions
  WHERE bundle_id = v_bundle_id;
  
  -- Update bundle final_status based on results
  IF v_lost_predictions > 0 THEN
    -- If any prediction is lost, bundle is lost
    UPDATE public.prediction_bundles
    SET final_status = 'lost'
    WHERE id = v_bundle_id;
  ELSIF v_total_predictions > 0 AND v_won_predictions = v_total_predictions THEN
    -- If all predictions are won, bundle is won
    UPDATE public.prediction_bundles
    SET final_status = 'won'
    WHERE id = v_bundle_id;
  ELSIF v_pending_predictions > 0 THEN
    -- If there are pending predictions, bundle is pending
    UPDATE public.prediction_bundles
    SET final_status = 'pending'
    WHERE id = v_bundle_id;
  END IF;
  
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    name text NOT NULL,
    email text NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: newsletter_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.newsletter_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    subscribed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: prediction_bundles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prediction_bundles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    total_odds numeric DEFAULT 1.0 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    prediction_type text DEFAULT 'free'::text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    final_status text DEFAULT 'pending'::text,
    booking_code text,
    betting_platform text DEFAULT 'football.com'::text,
    CONSTRAINT prediction_bundles_final_status_check CHECK ((final_status = ANY (ARRAY['pending'::text, 'won'::text, 'lost'::text])))
);


--
-- Name: predictions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.predictions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_name text NOT NULL,
    prediction_text text NOT NULL,
    prediction_type text NOT NULL,
    odds numeric(10,2) NOT NULL,
    confidence integer NOT NULL,
    match_date date DEFAULT CURRENT_DATE NOT NULL,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    bundle_id uuid,
    sport_category text,
    team_a text,
    team_b text,
    result text DEFAULT 'pending'::text,
    CONSTRAINT predictions_confidence_check CHECK (((confidence >= 0) AND (confidence <= 100))),
    CONSTRAINT predictions_prediction_type_check CHECK ((prediction_type = ANY (ARRAY['free'::text, 'vip'::text]))),
    CONSTRAINT predictions_result_check CHECK ((result = ANY (ARRAY['pending'::text, 'won'::text, 'lost'::text]))),
    CONSTRAINT predictions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'won'::text, 'lost'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    predictions_viewed integer DEFAULT 0,
    correct_predictions integer DEFAULT 0
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    plan_type text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'user'::text])))
);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: newsletter_subscriptions newsletter_subscriptions_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscriptions
    ADD CONSTRAINT newsletter_subscriptions_email_key UNIQUE (email);


--
-- Name: newsletter_subscriptions newsletter_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscriptions
    ADD CONSTRAINT newsletter_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: prediction_bundles prediction_bundles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prediction_bundles
    ADD CONSTRAINT prediction_bundles_pkey PRIMARY KEY (id);


--
-- Name: predictions predictions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predictions
    ADD CONSTRAINT predictions_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: predictions trigger_update_bundle_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_bundle_status AFTER INSERT OR DELETE OR UPDATE OF result ON public.predictions FOR EACH ROW EXECUTE FUNCTION public.update_bundle_final_status();


--
-- Name: predictions predictions_bundle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predictions
    ADD CONSTRAINT predictions_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES public.prediction_bundles(id) ON DELETE CASCADE;


--
-- Name: predictions predictions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predictions
    ADD CONSTRAINT predictions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: prediction_bundles Admins can delete bundles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete bundles" ON public.prediction_bundles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: newsletter_subscriptions Admins can delete newsletter subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete newsletter subscriptions" ON public.newsletter_subscriptions FOR DELETE USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: predictions Admins can delete predictions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete predictions" ON public.predictions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: subscriptions Admins can delete subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete subscriptions" ON public.subscriptions FOR DELETE USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: user_roles Admins can delete user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete user roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: prediction_bundles Admins can insert bundles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert bundles" ON public.prediction_bundles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: predictions Admins can insert predictions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert predictions" ON public.predictions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: subscriptions Admins can insert subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: user_roles Admins can insert user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert user roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: profiles Admins can update all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: prediction_bundles Admins can update bundles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update bundles" ON public.prediction_bundles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: predictions Admins can update predictions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update predictions" ON public.predictions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: subscriptions Admins can update subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update subscriptions" ON public.subscriptions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: prediction_bundles Admins can view all bundles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all bundles" ON public.prediction_bundles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: predictions Admins can view all predictions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all predictions" ON public.predictions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: subscriptions Admins can view all subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: newsletter_subscriptions Admins can view newsletter subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view newsletter subscriptions" ON public.newsletter_subscriptions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: comments Anyone can insert comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert comments" ON public.comments FOR INSERT WITH CHECK (true);


--
-- Name: newsletter_subscriptions Anyone can subscribe to newsletter; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscriptions FOR INSERT WITH CHECK (true);


--
-- Name: prediction_bundles Authenticated users can view free bundles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view free bundles" ON public.prediction_bundles FOR SELECT TO authenticated USING (((auth.uid() IS NOT NULL) AND (prediction_type = 'free'::text)));


--
-- Name: predictions Authenticated users can view free predictions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view free predictions" ON public.predictions FOR SELECT USING (((auth.uid() IS NOT NULL) AND (prediction_type = 'free'::text)));


--
-- Name: profiles Profiles can be created during signup; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles can be created during signup" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: comments Public can view comment content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view comment content" ON public.comments FOR SELECT USING (true);


--
-- Name: prediction_bundles Subscribed users can view VIP bundles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Subscribed users can view VIP bundles" ON public.prediction_bundles FOR SELECT TO authenticated USING (((prediction_type = 'vip'::text) AND (EXISTS ( SELECT 1
   FROM public.subscriptions
  WHERE ((subscriptions.user_id = auth.uid()) AND (subscriptions.status = 'active'::text) AND (subscriptions.expires_at > now()))))));


--
-- Name: predictions Subscribed users can view VIP predictions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Subscribed users can view VIP predictions" ON public.predictions FOR SELECT USING (((prediction_type = 'vip'::text) AND (EXISTS ( SELECT 1
   FROM public.subscriptions
  WHERE ((subscriptions.user_id = auth.uid()) AND (subscriptions.status = 'active'::text) AND (subscriptions.expires_at > now()))))));


--
-- Name: subscriptions Users can insert their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: comments Users can view their own comments with email; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own comments with email" ON public.comments FOR SELECT USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::text)));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: subscriptions Users can view their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

--
-- Name: newsletter_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: prediction_bundles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prediction_bundles ENABLE ROW LEVEL SECURITY;

--
-- Name: predictions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


