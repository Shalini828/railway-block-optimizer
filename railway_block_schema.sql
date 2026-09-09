--
-- PostgreSQL database dump
--

\restrict CwLZoqn9XI1xWe7XkL0IcqnFtsjqHHyZjOBIHAWgdiz9VAWo0J99ocyxOe6oP29

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: assets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assets (
    asset_id character varying(30) NOT NULL,
    corridor_id character varying(20),
    department character varying(20) NOT NULL,
    asset_type character varying(100) NOT NULL,
    location_km numeric(8,3),
    criticality integer,
    health_score numeric(5,2),
    failure_risk numeric(5,2),
    installation_date date,
    last_inspection_date date,
    operational_status character varying(30) DEFAULT 'OPERATIONAL'::character varying,
    CONSTRAINT assets_criticality_check CHECK (((criticality >= 1) AND (criticality <= 5)))
);


ALTER TABLE public.assets OWNER TO postgres;

--
-- Name: block_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.block_requests (
    request_id character varying(30) NOT NULL,
    task_id character varying(30),
    team_id character varying(30),
    corridor_id character varying(20),
    requested_date date,
    requested_start time without time zone,
    requested_end time without time zone,
    requested_duration_min integer,
    block_type character varying(50),
    request_status character varying(30) DEFAULT 'PENDING'::character varying,
    submitted_date date
);


ALTER TABLE public.block_requests OWNER TO postgres;

--
-- Name: block_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.block_tasks (
    block_id character varying(30) NOT NULL,
    task_id character varying(30) NOT NULL
);


ALTER TABLE public.block_tasks OWNER TO postgres;

--
-- Name: block_train_impact; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.block_train_impact (
    block_id character varying(30) NOT NULL,
    train_id character varying(30) NOT NULL,
    impact_type character varying(50),
    estimated_delay_min integer DEFAULT 0
);


ALTER TABLE public.block_train_impact OWNER TO postgres;

--
-- Name: corridors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.corridors (
    corridor_id character varying(20) NOT NULL,
    division_id integer,
    corridor_name character varying(150),
    source_station character varying(100),
    destination_station character varying(100),
    distance_km numeric(8,2),
    traffic_level character varying(20),
    electrified boolean DEFAULT true,
    max_block_duration_min integer
);


ALTER TABLE public.corridors OWNER TO postgres;

--
-- Name: defects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.defects (
    defect_id character varying(30) NOT NULL,
    asset_id character varying(30),
    defect_type character varying(100),
    severity character varying(20),
    detected_date date,
    description text,
    safety_impact integer,
    repeat_failure boolean DEFAULT false,
    status character varying(30) DEFAULT 'OPEN'::character varying,
    target_resolution_date date,
    CONSTRAINT defects_safety_impact_check CHECK (((safety_impact >= 1) AND (safety_impact <= 5)))
);


ALTER TABLE public.defects OWNER TO postgres;

--
-- Name: goods_train_forecast; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goods_train_forecast (
    forecast_id integer NOT NULL,
    corridor_id character varying(20),
    forecast_date date,
    expected_goods_trains integer,
    forecast_confidence numeric(5,2),
    traffic_level character varying(20)
);


ALTER TABLE public.goods_train_forecast OWNER TO postgres;

--
-- Name: goods_train_forecast_forecast_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.goods_train_forecast_forecast_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.goods_train_forecast_forecast_id_seq OWNER TO postgres;

--
-- Name: goods_train_forecast_forecast_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.goods_train_forecast_forecast_id_seq OWNED BY public.goods_train_forecast.forecast_id;


--
-- Name: maintenance_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_history (
    history_id integer NOT NULL,
    asset_id character varying(30),
    maintenance_type character varying(50),
    maintenance_date date,
    duration_min integer,
    team_id character varying(30),
    failure_after_maintenance boolean DEFAULT false,
    remarks text
);


ALTER TABLE public.maintenance_history OWNER TO postgres;

--
-- Name: maintenance_history_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.maintenance_history_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.maintenance_history_history_id_seq OWNER TO postgres;

--
-- Name: maintenance_history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.maintenance_history_history_id_seq OWNED BY public.maintenance_history.history_id;


--
-- Name: maintenance_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_tasks (
    task_id character varying(30) NOT NULL,
    asset_id character varying(30),
    department character varying(20) NOT NULL,
    task_type character varying(100),
    description text,
    created_date date,
    due_date date,
    estimated_duration_min integer,
    overdue_days integer DEFAULT 0,
    safety_risk integer,
    task_status character varying(30) DEFAULT 'PENDING'::character varying,
    priority_score numeric(6,2),
    priority_category character varying(20),
    CONSTRAINT maintenance_tasks_safety_risk_check CHECK (((safety_risk >= 1) AND (safety_risk <= 5)))
);


ALTER TABLE public.maintenance_tasks OWNER TO postgres;

--
-- Name: optimized_blocks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.optimized_blocks (
    block_id character varying(30) NOT NULL,
    corridor_id character varying(20),
    block_date date,
    start_time time without time zone,
    end_time time without time zone,
    duration_min integer,
    utilization_percent numeric(5,2),
    train_impact_score numeric(5,2),
    number_of_tasks integer,
    number_of_departments integer,
    optimization_score numeric(7,2),
    block_status character varying(30) DEFAULT 'PLANNED'::character varying
);


ALTER TABLE public.optimized_blocks OWNER TO postgres;

--
-- Name: teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teams (
    team_id character varying(30) NOT NULL,
    department character varying(20) NOT NULL,
    team_name character varying(100),
    skill_type character varying(100),
    base_location character varying(100),
    max_daily_hours numeric(5,2),
    available boolean DEFAULT true
);


ALTER TABLE public.teams OWNER TO postgres;

--
-- Name: trains; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trains (
    train_id character varying(30) NOT NULL,
    train_number character varying(20),
    train_name character varying(150),
    train_type character varying(30),
    corridor_id character varying(20),
    travel_date date,
    arrival_time time without time zone,
    departure_time time without time zone,
    direction character varying(20),
    operational_priority integer,
    CONSTRAINT trains_operational_priority_check CHECK (((operational_priority >= 1) AND (operational_priority <= 5)))
);


ALTER TABLE public.trains OWNER TO postgres;

--
-- Name: zones_divisions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.zones_divisions (
    division_id integer NOT NULL,
    zone_name character varying(100) NOT NULL,
    division_name character varying(100) NOT NULL,
    headquarters character varying(100)
);


ALTER TABLE public.zones_divisions OWNER TO postgres;

--
-- Name: zones_divisions_division_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.zones_divisions_division_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.zones_divisions_division_id_seq OWNER TO postgres;

--
-- Name: zones_divisions_division_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.zones_divisions_division_id_seq OWNED BY public.zones_divisions.division_id;


--
-- Name: goods_train_forecast forecast_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goods_train_forecast ALTER COLUMN forecast_id SET DEFAULT nextval('public.goods_train_forecast_forecast_id_seq'::regclass);


--
-- Name: maintenance_history history_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_history ALTER COLUMN history_id SET DEFAULT nextval('public.maintenance_history_history_id_seq'::regclass);


--
-- Name: zones_divisions division_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zones_divisions ALTER COLUMN division_id SET DEFAULT nextval('public.zones_divisions_division_id_seq'::regclass);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (asset_id);


--
-- Name: block_requests block_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.block_requests
    ADD CONSTRAINT block_requests_pkey PRIMARY KEY (request_id);


--
-- Name: block_tasks block_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.block_tasks
    ADD CONSTRAINT block_tasks_pkey PRIMARY KEY (block_id, task_id);


--
-- Name: block_train_impact block_train_impact_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.block_train_impact
    ADD CONSTRAINT block_train_impact_pkey PRIMARY KEY (block_id, train_id);


--
-- Name: corridors corridors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.corridors
    ADD CONSTRAINT corridors_pkey PRIMARY KEY (corridor_id);


--
-- Name: defects defects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.defects
    ADD CONSTRAINT defects_pkey PRIMARY KEY (defect_id);


--
-- Name: goods_train_forecast goods_train_forecast_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goods_train_forecast
    ADD CONSTRAINT goods_train_forecast_pkey PRIMARY KEY (forecast_id);


--
-- Name: maintenance_history maintenance_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_history
    ADD CONSTRAINT maintenance_history_pkey PRIMARY KEY (history_id);


--
-- Name: maintenance_tasks maintenance_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_tasks
    ADD CONSTRAINT maintenance_tasks_pkey PRIMARY KEY (task_id);


--
-- Name: optimized_blocks optimized_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.optimized_blocks
    ADD CONSTRAINT optimized_blocks_pkey PRIMARY KEY (block_id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (team_id);


--
-- Name: trains trains_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trains
    ADD CONSTRAINT trains_pkey PRIMARY KEY (train_id);


--
-- Name: zones_divisions zones_divisions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zones_divisions
    ADD CONSTRAINT zones_divisions_pkey PRIMARY KEY (division_id);


--
-- Name: assets assets_corridor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_corridor_id_fkey FOREIGN KEY (corridor_id) REFERENCES public.corridors(corridor_id);


--
-- Name: block_requests block_requests_corridor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.block_requests
    ADD CONSTRAINT block_requests_corridor_id_fkey FOREIGN KEY (corridor_id) REFERENCES public.corridors(corridor_id);


--
-- Name: block_requests block_requests_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.block_requests
    ADD CONSTRAINT block_requests_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.maintenance_tasks(task_id);


--
-- Name: block_requests block_requests_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.block_requests
    ADD CONSTRAINT block_requests_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(team_id);


--
-- Name: block_tasks block_tasks_block_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.block_tasks
    ADD CONSTRAINT block_tasks_block_id_fkey FOREIGN KEY (block_id) REFERENCES public.optimized_blocks(block_id);


--
-- Name: block_tasks block_tasks_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.block_tasks
    ADD CONSTRAINT block_tasks_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.maintenance_tasks(task_id);


--
-- Name: block_train_impact block_train_impact_block_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.block_train_impact
    ADD CONSTRAINT block_train_impact_block_id_fkey FOREIGN KEY (block_id) REFERENCES public.optimized_blocks(block_id);


--
-- Name: block_train_impact block_train_impact_train_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.block_train_impact
    ADD CONSTRAINT block_train_impact_train_id_fkey FOREIGN KEY (train_id) REFERENCES public.trains(train_id);


--
-- Name: corridors corridors_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.corridors
    ADD CONSTRAINT corridors_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.zones_divisions(division_id);


--
-- Name: defects defects_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.defects
    ADD CONSTRAINT defects_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(asset_id);


--
-- Name: goods_train_forecast goods_train_forecast_corridor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goods_train_forecast
    ADD CONSTRAINT goods_train_forecast_corridor_id_fkey FOREIGN KEY (corridor_id) REFERENCES public.corridors(corridor_id);


--
-- Name: maintenance_history maintenance_history_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_history
    ADD CONSTRAINT maintenance_history_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(asset_id);


--
-- Name: maintenance_tasks maintenance_tasks_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_tasks
    ADD CONSTRAINT maintenance_tasks_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(asset_id);


--
-- Name: optimized_blocks optimized_blocks_corridor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.optimized_blocks
    ADD CONSTRAINT optimized_blocks_corridor_id_fkey FOREIGN KEY (corridor_id) REFERENCES public.corridors(corridor_id);


--
-- Name: trains trains_corridor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trains
    ADD CONSTRAINT trains_corridor_id_fkey FOREIGN KEY (corridor_id) REFERENCES public.corridors(corridor_id);


--
-- PostgreSQL database dump complete
--

\unrestrict CwLZoqn9XI1xWe7XkL0IcqnFtsjqHHyZjOBIHAWgdiz9VAWo0J99ocyxOe6oP29

