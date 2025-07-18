--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Debian 16.9-1.pgdg120+1)
-- Dumped by pg_dump version 16.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: database_92s8_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO database_92s8_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_actions; Type: TABLE; Schema: public; Owner: database_92s8_user
--

CREATE TABLE public.admin_actions (
    id text NOT NULL,
    admin_id text NOT NULL,
    action text NOT NULL,
    target_id text,
    target_type text,
    reason text,
    metadata jsonb,
    created_at text DEFAULT (now())::text
);


ALTER TABLE public.admin_actions OWNER TO database_92s8_user;

--
-- Name: conversations; Type: TABLE; Schema: public; Owner: database_92s8_user
--

CREATE TABLE public.conversations (
    id text NOT NULL,
    participant1_id text NOT NULL,
    participant2_id text NOT NULL,
    swap_request_id text,
    last_message_at text DEFAULT (now())::text,
    created_at text DEFAULT (now())::text
);


ALTER TABLE public.conversations OWNER TO database_92s8_user;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: database_92s8_user
--

CREATE TABLE public.messages (
    id text NOT NULL,
    conversation_id text NOT NULL,
    sender_id text NOT NULL,
    content text NOT NULL,
    message_type text DEFAULT 'text'::text,
    is_read boolean DEFAULT false,
    created_at text DEFAULT (now())::text
);


ALTER TABLE public.messages OWNER TO database_92s8_user;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: database_92s8_user
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    user_id text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    related_id text,
    is_read boolean DEFAULT false,
    created_at text DEFAULT (now())::text
);


ALTER TABLE public.notifications OWNER TO database_92s8_user;

--
-- Name: platform_messages; Type: TABLE; Schema: public; Owner: database_92s8_user
--

CREATE TABLE public.platform_messages (
    id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by text NOT NULL
);


ALTER TABLE public.platform_messages OWNER TO database_92s8_user;

--
-- Name: reported_content; Type: TABLE; Schema: public; Owner: database_92s8_user
--

CREATE TABLE public.reported_content (
    id text NOT NULL,
    reporter_id text NOT NULL,
    content_type text NOT NULL,
    content_id text NOT NULL,
    reason text NOT NULL,
    description text,
    status text DEFAULT 'pending'::text,
    reviewed_by text,
    reviewed_at text,
    created_at text DEFAULT (now())::text
);


ALTER TABLE public.reported_content OWNER TO database_92s8_user;

--
-- Name: skill_endorsements; Type: TABLE; Schema: public; Owner: database_92s8_user
--

CREATE TABLE public.skill_endorsements (
    id text NOT NULL,
    user_id text NOT NULL,
    skill_id integer NOT NULL,
    endorser_id text NOT NULL,
    comment text,
    created_at text DEFAULT (now())::text
);


ALTER TABLE public.skill_endorsements OWNER TO database_92s8_user;

--
-- Name: skills; Type: TABLE; Schema: public; Owner: database_92s8_user
--

CREATE TABLE public.skills (
    id integer NOT NULL,
    name text NOT NULL,
    category text NOT NULL
);


ALTER TABLE public.skills OWNER TO database_92s8_user;

--
-- Name: skills_id_seq; Type: SEQUENCE; Schema: public; Owner: database_92s8_user
--

CREATE SEQUENCE public.skills_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.skills_id_seq OWNER TO database_92s8_user;

--
-- Name: skills_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: database_92s8_user
--

ALTER SEQUENCE public.skills_id_seq OWNED BY public.skills.id;


--
-- Name: swap_ratings; Type: TABLE; Schema: public; Owner: database_92s8_user
--

CREATE TABLE public.swap_ratings (
    id text NOT NULL,
    swap_request_id text NOT NULL,
    rater_id text NOT NULL,
    rated_id text NOT NULL,
    rating integer NOT NULL,
    feedback text,
    created_at text DEFAULT (now())::text,
    rating_type text DEFAULT 'post_request'::text,
    CONSTRAINT swap_ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.swap_ratings OWNER TO database_92s8_user;

--
-- Name: swap_requests; Type: TABLE; Schema: public; Owner: database_92s8_user
--

CREATE TABLE public.swap_requests (
    id text NOT NULL,
    sender_id text NOT NULL,
    receiver_id text NOT NULL,
    sender_skill text,
    receiver_skill text,
    message text,
    status text DEFAULT 'pending'::text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    rating integer,
    feedback text
);


ALTER TABLE public.swap_requests OWNER TO database_92s8_user;

--
-- Name: system_messages; Type: TABLE; Schema: public; Owner: database_92s8_user
--

CREATE TABLE public.system_messages (
    id text NOT NULL,
    admin_id text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL,
    is_active boolean DEFAULT true,
    created_at text DEFAULT (now())::text,
    expires_at text
);


ALTER TABLE public.system_messages OWNER TO database_92s8_user;

--
-- Name: user_skills_offered; Type: TABLE; Schema: public; Owner: database_92s8_user
--

CREATE TABLE public.user_skills_offered (
    id integer NOT NULL,
    user_id text NOT NULL,
    skill_id integer NOT NULL
);


ALTER TABLE public.user_skills_offered OWNER TO database_92s8_user;

--
-- Name: user_skills_offered_id_seq; Type: SEQUENCE; Schema: public; Owner: database_92s8_user
--

CREATE SEQUENCE public.user_skills_offered_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_skills_offered_id_seq OWNER TO database_92s8_user;

--
-- Name: user_skills_offered_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: database_92s8_user
--

ALTER SEQUENCE public.user_skills_offered_id_seq OWNED BY public.user_skills_offered.id;


--
-- Name: user_skills_wanted; Type: TABLE; Schema: public; Owner: database_92s8_user
--

CREATE TABLE public.user_skills_wanted (
    id integer NOT NULL,
    user_id text NOT NULL,
    skill_id integer NOT NULL
);


ALTER TABLE public.user_skills_wanted OWNER TO database_92s8_user;

--
-- Name: user_skills_wanted_id_seq; Type: SEQUENCE; Schema: public; Owner: database_92s8_user
--

CREATE SEQUENCE public.user_skills_wanted_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_skills_wanted_id_seq OWNER TO database_92s8_user;

--
-- Name: user_skills_wanted_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: database_92s8_user
--

ALTER SEQUENCE public.user_skills_wanted_id_seq OWNED BY public.user_skills_wanted.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: database_92s8_user
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    location text,
    bio text,
    skills_offered jsonb DEFAULT '[]'::jsonb,
    skills_wanted jsonb DEFAULT '[]'::jsonb,
    availability jsonb DEFAULT '[]'::jsonb,
    is_public boolean DEFAULT true,
    is_admin boolean DEFAULT false,
    rating numeric(3,2) DEFAULT 0,
    join_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_banned boolean DEFAULT false,
    profile_photo text,
    password text,
    role text DEFAULT 'user'::text,
    ban_reason text,
    banned_at text,
    created_at text DEFAULT (now())::text,
    security_question text,
    security_answer text
);


ALTER TABLE public.users OWNER TO database_92s8_user;

--
-- Name: skills id; Type: DEFAULT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.skills ALTER COLUMN id SET DEFAULT nextval('public.skills_id_seq'::regclass);


--
-- Name: user_skills_offered id; Type: DEFAULT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.user_skills_offered ALTER COLUMN id SET DEFAULT nextval('public.user_skills_offered_id_seq'::regclass);


--
-- Name: user_skills_wanted id; Type: DEFAULT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.user_skills_wanted ALTER COLUMN id SET DEFAULT nextval('public.user_skills_wanted_id_seq'::regclass);


--
-- Data for Name: admin_actions; Type: TABLE DATA; Schema: public; Owner: database_92s8_user
--

COPY public.admin_actions (id, admin_id, action, target_id, target_type, reason, metadata, created_at) FROM stdin;
action_1752774165187_wn9a6lg3f	admin_user_1	ban_user	user_1752771341219_2ph2sa2xc	user	Testing	\N	2025-07-17 17:42:44.819332+00
action_1752813111518_dzbiaa6j3	admin_user_1	delete_user	user_1752771341219_2ph2sa2xc	user	Test	\N	2025-07-18 04:31:49.015934+00
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: database_92s8_user
--

COPY public.conversations (id, participant1_id, participant2_id, swap_request_id, last_message_at, created_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: database_92s8_user
--

COPY public.messages (id, conversation_id, sender_id, content, message_type, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: database_92s8_user
--

COPY public.notifications (id, user_id, type, title, content, related_id, is_read, created_at) FROM stdin;
notif_1752820786954_52lcznoug	user_1752820786720_qemunpz3h	system	Welcome to SkillSwap!	Welcome to SkillSwap! Start by adding your skills and browsing other users to find skill exchange opportunities.	\N	f	2025-07-18 06:39:47.074357+00
notif_1752820799325_quksvx8yg	user1	swap_request	New Skill Swap Request	New Test User wants to exchange skills with you: Teaching for Graphic Design	swap_1752820798618_kyfo6rn1q	f	2025-07-18 06:39:59.445273+00
notif_1752821032127_x10bnbwol	user16	swap_request	New Skill Swap Request	Harsh Kumar Saw wants to exchange skills with you: Car Restoration for Space Planning	swap_1752821031434_94hfu7m1a	f	2025-07-18 06:43:52.244326+00
\.


--
-- Data for Name: platform_messages; Type: TABLE DATA; Schema: public; Owner: database_92s8_user
--

COPY public.platform_messages (id, title, content, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: reported_content; Type: TABLE DATA; Schema: public; Owner: database_92s8_user
--

COPY public.reported_content (id, reporter_id, content_type, content_id, reason, description, status, reviewed_by, reviewed_at, created_at) FROM stdin;
\.


--
-- Data for Name: skill_endorsements; Type: TABLE DATA; Schema: public; Owner: database_92s8_user
--

COPY public.skill_endorsements (id, user_id, skill_id, endorser_id, comment, created_at) FROM stdin;
\.


--
-- Data for Name: skills; Type: TABLE DATA; Schema: public; Owner: database_92s8_user
--

COPY public.skills (id, name, category) FROM stdin;
1	Graphic Design	Design
2	UI/UX Design	Design
3	Logo Design	Design
4	Web Design	Design
5	Brand Identity	Design
6	Adobe Photoshop	Design
7	Adobe Illustrator	Design
8	Figma	Design
9	Color Theory	Design
10	Typography	Design
11	Space Planning	Design
12	Interior Design	Design
13	Web Development	Programming
14	JavaScript	Programming
15	React	Programming
16	Node.js	Programming
17	Python	Programming
18	Java	Programming
19	PHP	Programming
20	Mobile Development	Programming
21	Swift	Programming
22	Android Development	Programming
23	Database Design	Programming
24	API Development	Programming
25	CSS Design	Programming
26	Digital Marketing	Marketing
27	SEO	Marketing
28	Social Media Marketing	Marketing
29	Content Marketing	Marketing
30	Email Marketing	Marketing
31	PPC Advertising	Marketing
32	Brand Strategy	Marketing
33	Market Research	Marketing
34	Sales Strategy	Marketing
35	Business Development	Marketing
36	Spanish	Languages
37	French	Languages
38	German	Languages
39	Mandarin	Languages
40	Japanese	Languages
41	Italian	Languages
42	Portuguese	Languages
43	Russian	Languages
44	Korean	Languages
45	Arabic	Languages
46	Culinary Arts	Culinary
47	Baking	Culinary
48	Pastry Making	Culinary
49	Wine Pairing	Culinary
50	Nutrition Coaching	Culinary
51	Meal Planning	Culinary
52	Food Photography	Culinary
53	Food Styling	Culinary
54	Restaurant Management	Culinary
55	Personal Training	Fitness
56	Yoga Instruction	Fitness
57	Rock Climbing	Fitness
58	Swimming	Fitness
59	Marathon Running	Fitness
60	CrossFit	Fitness
61	Pilates	Fitness
62	Martial Arts	Fitness
63	Dance	Fitness
64	Sports Coaching	Fitness
65	Outdoor Safety	Fitness
66	Guitar	Music
67	Piano	Music
68	Violin	Music
69	Drums	Music
70	Singing	Music
71	Music Production	Music
72	Sound Engineering	Music
73	Songwriting	Music
74	Music Theory	Music
75	DJ Skills	Music
76	Data Science	Technology
77	Machine Learning	Technology
78	Cybersecurity	Technology
79	Cloud Computing	Technology
80	DevOps	Technology
81	3D Modeling	Technology
82	3D Printing	Technology
83	Electronics	Technology
84	Drone Photography	Technology
85	Video Editing	Technology
86	Woodworking	Crafts
87	Furniture Making	Crafts
88	Pottery	Crafts
89	Jewelry Making	Crafts
90	Leather Working	Crafts
91	Knitting	Crafts
92	Sewing	Crafts
93	Painting	Crafts
94	Sculpture	Crafts
95	Metalworking	Crafts
96	Project Management	Professional
97	Public Speaking	Professional
98	Technical Writing	Professional
99	Grant Writing	Professional
100	Policy Research	Professional
101	Data Analysis	Professional
102	Financial Planning	Professional
103	Teaching	Professional
104	Coaching	Professional
105	Consulting	Professional
106	Debate Coaching	Professional
107	Data Visualization	Professional
108	Survey Design	Professional
109	Interview Techniques	Professional
110	Automotive Engineering	Automotive
111	Car Restoration	Automotive
112	Mechanical Repair	Automotive
113	Welding	Automotive
114	Motorcycle Maintenance	Automotive
115	Engine Diagnostics	Automotive
116	Hiking	Outdoors
117	Camping	Outdoors
118	Survival Skills	Outdoors
119	Photography	Outdoors
120	Travel Planning	Outdoors
121	Surfing	Outdoors
122	Sailing	Outdoors
123	Plant Care	Home
124	Sustainable Living	Home
125	Home Renovation	Home
126	Gardening	Home
127	Landscaping	Home
\.


--
-- Data for Name: swap_ratings; Type: TABLE DATA; Schema: public; Owner: database_92s8_user
--

COPY public.swap_ratings (id, swap_request_id, rater_id, rated_id, rating, feedback, created_at, rating_type) FROM stdin;
rating_sample_1	req3	user3	user4	5	Great communication and very responsive! Looking forward to our skill exchange.	2025-07-13 13:27:19.097611+00	post_request
rating_sample_2	req6	user7	user11	4	Seems knowledgeable and professional. Excited to learn from them.	2025-07-14 13:27:19.097611+00	post_request
rating_sample_3	req8	user10	user14	5	Very friendly and clear about expectations. Perfect match!	2025-07-12 13:27:19.097611+00	post_request
rating_sample_4	req5	user6	user8	4	Quick to respond and well-organized. This should be a good exchange.	2025-07-14 13:27:19.097611+00	post_request
rating_sample_5	req7	user9	user12	3	Decent communication, hope the actual session goes well.	2025-07-13 13:27:19.097611+00	post_request
rating_sample_6	req3	user4	user3	5	Fantastic teacher! Very patient and thorough. Learned so much about web development.	2025-07-10 13:27:19.097611+00	post_completion
rating_sample_7	req6	user11	user7	4	Great session on marketing. Clear explanations and good examples.	2025-07-12 13:27:19.097611+00	post_completion
rating_sample_8	req8	user14	user10	5	Outstanding instruction! Really helped improve my skills.	2025-07-09 13:27:19.097611+00	post_completion
\.


--
-- Data for Name: swap_requests; Type: TABLE DATA; Schema: public; Owner: database_92s8_user
--

COPY public.swap_requests (id, sender_id, receiver_id, sender_skill, receiver_skill, message, status, created_at, updated_at, rating, feedback) FROM stdin;
req3	user3	user4	Digital Marketing	Data Analysis	Hi Alex! Your data science background is impressive. I'd love to learn data analysis for marketing campaigns. In return, I can teach you content marketing and social media strategy.	accepted	2025-07-07 05:29:16.353606	2025-07-10 05:29:16.353606	\N	\N
req4	user5	user1	UI/UX Design	Video Editing	Sarah, your video work is fantastic! I'd love to learn video editing techniques. I can help you with user experience design and prototyping in Figma.	completed	2025-06-30 05:29:16.353606	2025-07-07 05:29:16.353606	5	Lisa was an amazing teacher! Her UX design insights completely transformed how I approach video projects. Highly recommend!
req5	user6	user8	Digital Marketing	Graphic Design	David, I love your outdoor-themed designs! Could you help me with graphic design for my marketing campaigns? I can teach you SEO and digital marketing strategies.	pending	2025-07-13 05:29:16.353606	2025-07-13 05:29:16.353606	\N	\N
req6	user7	user11	Python	React	Hi Priya! I'd love to learn React from an experienced developer. I can teach you Django and backend Python development in return.	accepted	2025-07-11 05:29:16.353606	2025-07-13 05:29:16.353606	\N	\N
req7	user9	user12	Voice Training	Music Production	Thomas, your music production skills are incredible! I'd love to learn music production. I can help you with voice training and vocal techniques for your recordings.	pending	2025-07-08 05:29:16.353606	2025-07-08 05:29:16.353606	\N	\N
req8	user10	user14	Woodworking	Architecture	James, I'm fascinated by your architectural work! Could you teach me about design principles? I can show you woodworking and furniture making techniques.	accepted	2025-07-06 05:29:16.353606	2025-07-09 05:29:16.353606	\N	\N
req9	user13	user4	Chinese Cooking	Machine Learning	Alex, I'd love to dive deeper into machine learning algorithms. In exchange, I can teach you authentic Chinese cooking techniques and recipes.	pending	2025-07-10 05:29:16.353606	2025-07-10 05:29:16.353606	\N	\N
req10	user15	user6	Content Writing	Spanish Language	Carlos, I need to improve my Spanish for international clients. Could you help me learn Spanish? I can teach you content writing and copywriting strategies.	rejected	2025-07-04 05:29:16.353606	2025-07-06 05:29:16.353606	\N	\N
swap_1752820798618_kyfo6rn1q	user_1752820786720_qemunpz3h	user1	Teaching	Graphic Design	Hi! I would love to teach you some skills in exchange for learning graphic design!	accepted	2025-07-18 06:39:58.738686	2025-07-18 06:40:36.771073	\N	\N
swap_1752821031434_94hfu7m1a	user_1752820480180_q6ja2w12d	user16	Car Restoration	Space Planning	Hi Leila Hosseini! I'd like to swap skills with you.	pending	2025-07-18 06:43:51.55354	2025-07-18 06:43:51.55354	\N	\N
\.


--
-- Data for Name: system_messages; Type: TABLE DATA; Schema: public; Owner: database_92s8_user
--

COPY public.system_messages (id, admin_id, title, message, type, is_active, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: user_skills_offered; Type: TABLE DATA; Schema: public; Owner: database_92s8_user
--

COPY public.user_skills_offered (id, user_id, skill_id) FROM stdin;
1	user1	119
2	user1	1
3	user1	6
4	user1	85
5	user2	14
6	user2	17
7	user2	15
8	user2	16
9	user2	23
10	user3	26
11	user3	56
12	user4	76
13	user4	17
14	user4	77
15	user5	2
16	user5	8
17	user6	26
18	user6	55
19	user6	27
20	user7	17
21	user8	1
22	user8	116
23	user8	57
24	user9	97
25	user9	70
26	user10	102
27	user10	86
28	user10	87
29	user11	15
30	user11	16
31	user11	56
32	user12	71
33	user12	66
34	user13	101
35	user16	12
36	user16	124
37	user16	9
38	user16	11
39	user17	20
40	user17	21
41	user17	57
42	user17	65
43	user18	46
44	user18	50
45	user18	51
46	user18	52
47	user19	110
48	user19	111
49	user19	112
50	user19	113
51	user20	100
52	user20	106
53	user20	97
54	user20	99
58	user14	13
59	user14	14
60	user14	101
61	user15	27
62	user15	28
63	user15	103
85	user_1752820480180_q6ja2w12d	111
\.


--
-- Data for Name: user_skills_wanted; Type: TABLE DATA; Schema: public; Owner: database_92s8_user
--

COPY public.user_skills_wanted (id, user_id, skill_id) FROM stdin;
1	user1	13
2	user1	14
3	user1	15
4	user2	26
5	user3	101
6	user3	97
7	user4	2
8	user4	8
9	user5	15
10	user6	85
11	user7	119
12	user7	28
13	user8	84
14	user8	13
15	user9	71
16	user10	82
17	user10	125
18	user11	2
19	user12	85
20	user12	74
21	user12	67
22	user13	77
23	user15	30
24	user16	81
25	user16	87
26	user16	123
27	user17	84
28	user17	120
29	user17	121
30	user18	53
31	user18	54
32	user18	49
33	user19	82
34	user19	83
35	user19	114
36	user20	107
37	user20	108
38	user20	109
42	user14	1
43	user14	15
61	user_1752820480180_q6ja2w12d	115
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: database_92s8_user
--

COPY public.users (id, email, name, location, bio, skills_offered, skills_wanted, availability, is_public, is_admin, rating, join_date, is_banned, profile_photo, password, role, ban_reason, banned_at, created_at, security_question, security_answer) FROM stdin;
user2	hiroshi.tanaka@email.com	Hiroshi Tanaka	Tokyo, Japan	Passionate professional eager to share knowledge and learn new skills through meaningful exchanges.	["JavaScript", "Python", "React", "Node.js", "Database Design"]	["Spanish Language", "Guitar Playing", "Digital Marketing"]	{"dates": ["weekdays"], "times": ["evening"]}	t	f	4.90	2025-07-14 05:26:43.397693	f	https://images.unsplash.com/photo-1556474835-b0f3ac40d4d1?w=400&h=400&fit=crop&crop=face	\N	user	\N	\N	2025-07-15 11:59:51.439245+00	\N	\N
user3	camila.santos@email.com	Camila Santos	São Paulo, Brazil	Passionate professional eager to share knowledge and learn new skills through meaningful exchanges.	["Digital Marketing", "Content Writing", "Yoga Instruction", "Social Media Strategy"]	["Data Analysis", "Excel Advanced", "Public Speaking"]	{"dates": ["weekends"], "times": ["morning"]}	t	f	4.70	2025-07-14 05:26:43.442411	f	https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face	\N	user	\N	\N	2025-07-15 11:59:51.439245+00	\N	\N
user4	rajesh.gupta@email.com	Rajesh Gupta	Mumbai, India	Passionate professional eager to share knowledge and learn new skills through meaningful exchanges.	["Data Science", "Python", "Machine Learning", "Statistics", "Excel"]	["UI/UX Design", "Figma", "Creative Writing"]	{"dates": ["everyday"], "times": ["morning", "night"]}	t	f	4.60	2025-07-14 05:26:43.488037	f	https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=400&fit=crop&crop=face	\N	user	\N	\N	2025-07-15 11:59:51.439245+00	\N	\N
user5	ingrid.larsson@email.com	Ingrid Larsson	Stockholm, Sweden	Passionate professional eager to share knowledge and learn new skills through meaningful exchanges.	["UI/UX Design", "Figma", "User Research", "Prototyping"]	["Frontend Development", "CSS Animations", "React"]	{"dates": ["weekends"], "times": ["evening"]}	t	f	4.90	2025-07-14 05:26:43.533037	f	https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face	\N	user	\N	\N	2025-07-15 11:59:51.439245+00	\N	\N
user_1752820480180_q6ja2w12d	harshsaw01@gmail.com	Harsh Kumar Saw	Bhilai, Chhattisgarh 	New user on skill swap platform	[]	[]	{"dates": ["weekends"], "times": ["evening"]}	t	f	0.00	2025-07-18 06:34:40.18	f	https://res.cloudinary.com/dnvfbbbfr/image/upload/v1752820993/skill-swap/profile-photos/profile_1752820991154_1000040258.png.png	123456	user	\N	\N	2025-07-18 06:34:40.301643+00	In what city were you born?	Bhilai
user6	mohammed.alrashid@email.com	Mohammed Al-Rashid	Dubai, UAE	Passionate professional eager to share knowledge and learn new skills through meaningful exchanges.	["Spanish Language", "Digital Marketing", "Personal Training", "SEO"]	["Video Editing", "Podcast Production", "Content Strategy"]	{"dates": ["weekdays"], "times": ["morning"]}	t	f	4.40	2025-07-14 05:28:57.73061	f	https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=face	\N	user	\N	\N	2025-07-15 11:59:51.439245+00	\N	\N
user_1752820786720_qemunpz3h	newtest@example.com	New Test User	Test City	New user on skill swap platform	[]	[]	{"dates": ["weekends"], "times": ["evening"]}	t	f	0.00	2025-07-18 06:39:46.72	f	https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150	testpass123	user	\N	\N	2025-07-18 06:39:46.840443+00	\N	\N
user10	liam.murphy@email.com	Liam Murphy	Dublin, Ireland	Passionate professional eager to share knowledge and learn new skills through meaningful exchanges.	["Financial Planning", "Excel", "Woodworking", "Furniture Making"]	["3D Printing", "CAD Design", "Home Renovation"]	{"dates": ["weekends"], "times": ["night"]}	t	f	4.50	2025-07-14 05:28:57.73061	f	https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face	\N	user	\N	\N	2025-07-15 11:59:51.439245+00	\N	\N
user13	fatima.alzahra@email.com	Fatima Al-Zahra	Casablanca, Morocco	Backend developer specializing in API design and microservices architecture. I enjoy building robust systems that scale. Passionate about clean code and test-driven development. Mentor at coding bootcamps and women in tech advocate.	["Data Analysis", "R Programming", "Chinese Cooking", "Statistics"]	["Machine Learning", "Tableau", "Wine Tasting"]	{"dates": ["weekends"], "times": ["morning"]}	t	f	4.60	2025-07-14 05:28:57.73061	f	https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face	\N	user	\N	\N	2025-07-15 11:59:51.439245+00	\N	\N
user18	sophia.kowalski@email.com	Sophia Kowalski	Warsaw, Poland	Passionate professional eager to share knowledge and learn new skills through meaningful exchanges.	["Culinary Arts", "Nutrition Coaching", "Meal Planning", "Food Photography"]	["Food Styling", "Restaurant Management", "Wine Pairing"]	{"dates": ["weekdays"], "times": ["morning", "night"]}	t	f	4.60	2025-07-14 05:29:50.668067	f	https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face	\N	user	\N	\N	2025-07-15 11:59:51.439245+00	\N	\N
user12	zhou.wei@email.com	Zhou Wei	Shanghai, China	Passionate professional eager to share knowledge and learn new skills through meaningful exchanges.	["Music Production", "Audio Engineering", "Guitar", "Sound Design"]	["Video Editing", "Music Theory", "Piano"]	{"dates": ["weekdays"], "times": ["evening"]}	t	f	4.70	2025-07-14 05:28:57.73061	f	https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face	\N	user	\N	\N	2025-07-15 11:59:51.439245+00	\N	\N
user8	kwame.asante@email.com	Kwame Asante	Accra, Ghana	Passionate professional eager to share knowledge and learn new skills through meaningful exchanges.	["Graphic Design", "Hiking", "Rock Climbing", "Adobe Creative Suite"]	["Video Production", "Drone Photography", "Web Development"]	{"dates": ["everyday"], "times": ["evening"]}	t	f	4.60	2025-07-14 05:28:57.73061	f	https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=400&fit=crop&crop=face	\N	user	\N	\N	2025-07-15 11:59:51.439245+00	\N	\N
user19	diego.herrera@email.com	Diego Herrera	Mexico City, Mexico	Passionate professional eager to share knowledge and learn new skills through meaningful exchanges.	["Automotive Engineering", "Car Restoration", "Mechanical Repair", "Welding"]	["3D Printing", "Electronics", "Motorcycle Maintenance"]	{"dates": ["weekends"], "times": ["evening"]}	t	f	4.80	2025-07-14 05:29:50.668067	f	https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=400&fit=crop&crop=face	\N	user	\N	\N	2025-07-15 11:59:51.439245+00	\N	\N
user1	aisha.okafor@email.com	Aisha Okafor	Lagos, Nigeria	Passionate graphic designer and digital artist with 5+ years creating compelling visual stories. I love experimenting with new design trends and helping others bring their creative visions to life. When I'm not designing, you'll find me exploring local art galleries or teaching kids digital art workshops.	["Photography", "Graphic Design", "Adobe Photoshop", "Video Editing"]	["Web Development", "JavaScript", "React"]	{"dates": ["weekends"], "times": ["morning"]}	t	f	4.80	2025-07-14 05:26:43.352551	f	https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face	\N	user	\N	\N	2025-07-15 11:59:51.439245+00	\N	\N
user17	chen.ming@email.com	Chen Ming	Taipei, Taiwan	Passionate professional eager to share knowledge and learn new skills through meaningful exchanges.	["Mobile Development", "Swift", "Rock Climbing", "Outdoor Safety"]	["Drone Photography", "Travel Planning", "Surfing"]	{"dates": ["everyday"], "times": ["morning"]}	t	f	4.70	2025-07-14 05:29:50.668067	f	https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face	\N	user	\N	\N	2025-07-15 11:59:51.439245+00	\N	\N
user20	kenji.nakamura@email.com	Kenji Nakamura	Osaka, Japan	Passionate professional eager to share knowledge and learn new skills through meaningful exchanges.	["Policy Research", "Debate Coaching", "Public Speaking", "Grant Writing"]	["Data Visualization", "Survey Design", "Interview Techniques"]	{"dates": ["everyday"], "times": ["evening", "night"]}	t	f	4.40	2025-07-14 05:29:50.668067	f	https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&h=400&fit=crop&crop=face	\N	user	\N	\N	2025-07-15 11:59:51.439245+00	\N	\N
user14	jakob.nielsen@email.com	Jakob Nielsen	Copenhagen, Denmark	Business intelligence analyst and data visualization expert. I transform complex datasets into actionable insights using tools like Tableau and Power BI. Help organizations make data-driven decisions. Chess master and strategy game enthusiast.	["Architecture", "Urban Planning", "Sustainable Design", "AutoCAD"]	["Renewable Energy", "Permaculture", "Community Organizing"]	{"dates": ["everyday"], "times": ["morning", "evening", "night"]}	t	f	4.80	2025-07-14 05:28:57.73061	f	https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face	\N	user	\N	\N	2025-07-15 11:59:51.439245+00	\N	\N
user9	isabella.martinez@email.com	Isabella Martinez	Barcelona, Spain	Passionate professional eager to share knowledge and learn new skills through meaningful exchanges.	["Voice Training", "Portuguese Language", "Public Speaking", "Singing"]	["Music Production", "Audio Engineering", "Podcast Hosting"]	{"dates": ["weekdays"], "times": ["morning", "evening"]}	t	f	4.80	2025-07-14 05:28:57.73061	f	https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop&crop=face	\N	user	\N	\N	2025-07-15 11:59:51.439245+00	\N	\N
user7	elena.petrov@email.com	Elena Petrov	Moscow, Russia	Passionate professional eager to share knowledge and learn new skills through meaningful exchanges.	["Python", "Django", "Bread Making", "Pastry Arts"]	["Photography", "Social Media Marketing", "Business Planning"]	{"dates": ["weekends"], "times": ["night"]}	t	f	4.70	2025-07-14 05:28:57.73061	f	https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face	\N	user	\N	\N	2025-07-15 11:59:51.439245+00	\N	\N
user11	priya.sharma@email.com	Priya Sharma	Bangalore, India	Business analyst and project manager with experience bridging the gap between technical and business teams. I excel at requirements gathering and stakeholder management. Certified Scrum Master. Love cooking traditional Indian cuisine.	["React", "Node.js", "Yoga Instruction", "Meditation"]	["UI/UX Design", "Mobile App Development", "Ayurveda"]	{"dates": ["everyday"], "times": ["morning", "night"]}	t	f	4.90	2025-07-14 05:28:57.73061	f	https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face	\N	user	\N	\N	2025-07-15 11:59:51.439245+00	\N	\N
user15	amara.okonkwo@email.com	Amara Okonkwo	Nairobi, Kenya	Software quality assurance engineer and automation testing specialist. I ensure products meet the highest standards before reaching users. Expert in test automation frameworks and continuous integration. Volunteer coding instructor for underserved communities.	["Content Writing", "Social Media Strategy", "Copywriting", "Brand Storytelling"]	["Podcast Production", "Email Marketing", "Influencer Marketing"]	{"dates": ["weekdays"], "times": ["night"]}	t	f	4.50	2025-07-14 05:28:57.73061	f	https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face	\N	user	\N	\N	2025-07-15 11:59:51.439245+00	\N	\N
user16	leila.hosseini@email.com	Leila Hosseini	Tehran, Iran	Product manager with a background in user research and agile methodologies. I excel at turning user insights into successful products. Experience in both B2B and B2C environments. Passionate about accessibility and inclusive design.	["Interior Design", "Sustainable Living", "Color Theory", "Space Planning"]	["3D Modeling", "Furniture Making", "Plant Care"]	{"dates": ["weekends"], "times": ["evening"]}	t	f	4.30	2025-07-14 05:29:50.668067	f	https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face	\N	user	\N	\N	2025-07-15 11:59:51.439245+00	\N	\N
user_1752509806910_s3b3bsodq	test@example.com	Test User	Test City	Passionate professional eager to share knowledge and learn new skills through meaningful exchanges.	[]	[]	{"dates": ["weekends"], "times": ["evening"]}	t	f	0.00	2025-07-14 16:16:46.91	f	https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150	password123	user	\N	\N	2025-07-15 11:59:51.439245+00	\N	\N
admin_user_1	admin@skillswap.com	Admin User	\N	Passionate professional eager to share knowledge and learn new skills through meaningful exchanges.	[]	[]	[]	f	f	0.00	2025-07-15 11:59:53.885594	f	\N	12345	admin	\N	\N	2025-07-15 11:59:53.885594+00	\N	\N
\.


--
-- Name: skills_id_seq; Type: SEQUENCE SET; Schema: public; Owner: database_92s8_user
--

SELECT pg_catalog.setval('public.skills_id_seq', 127, true);


--
-- Name: user_skills_offered_id_seq; Type: SEQUENCE SET; Schema: public; Owner: database_92s8_user
--

SELECT pg_catalog.setval('public.user_skills_offered_id_seq', 85, true);


--
-- Name: user_skills_wanted_id_seq; Type: SEQUENCE SET; Schema: public; Owner: database_92s8_user
--

SELECT pg_catalog.setval('public.user_skills_wanted_id_seq', 61, true);


--
-- Name: admin_actions admin_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.admin_actions
    ADD CONSTRAINT admin_actions_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_participant1_id_participant2_id_key; Type: CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_participant1_id_participant2_id_key UNIQUE (participant1_id, participant2_id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: platform_messages platform_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.platform_messages
    ADD CONSTRAINT platform_messages_pkey PRIMARY KEY (id);


--
-- Name: reported_content reported_content_pkey; Type: CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.reported_content
    ADD CONSTRAINT reported_content_pkey PRIMARY KEY (id);


--
-- Name: skill_endorsements skill_endorsements_pkey; Type: CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.skill_endorsements
    ADD CONSTRAINT skill_endorsements_pkey PRIMARY KEY (id);


--
-- Name: skill_endorsements skill_endorsements_user_id_skill_id_endorser_id_key; Type: CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.skill_endorsements
    ADD CONSTRAINT skill_endorsements_user_id_skill_id_endorser_id_key UNIQUE (user_id, skill_id, endorser_id);


--
-- Name: skills skills_name_key; Type: CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_name_key UNIQUE (name);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);


--
-- Name: swap_ratings swap_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.swap_ratings
    ADD CONSTRAINT swap_ratings_pkey PRIMARY KEY (id);


--
-- Name: swap_requests swap_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.swap_requests
    ADD CONSTRAINT swap_requests_pkey PRIMARY KEY (id);


--
-- Name: system_messages system_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.system_messages
    ADD CONSTRAINT system_messages_pkey PRIMARY KEY (id);


--
-- Name: user_skills_offered user_skills_offered_pkey; Type: CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.user_skills_offered
    ADD CONSTRAINT user_skills_offered_pkey PRIMARY KEY (id);


--
-- Name: user_skills_wanted user_skills_wanted_pkey; Type: CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.user_skills_wanted
    ADD CONSTRAINT user_skills_wanted_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_admin_actions_admin; Type: INDEX; Schema: public; Owner: database_92s8_user
--

CREATE INDEX idx_admin_actions_admin ON public.admin_actions USING btree (admin_id);


--
-- Name: idx_admin_actions_target; Type: INDEX; Schema: public; Owner: database_92s8_user
--

CREATE INDEX idx_admin_actions_target ON public.admin_actions USING btree (target_id, target_type);


--
-- Name: idx_conversations_participants; Type: INDEX; Schema: public; Owner: database_92s8_user
--

CREATE INDEX idx_conversations_participants ON public.conversations USING btree (participant1_id, participant2_id);


--
-- Name: idx_messages_conversation; Type: INDEX; Schema: public; Owner: database_92s8_user
--

CREATE INDEX idx_messages_conversation ON public.messages USING btree (conversation_id, created_at);


--
-- Name: idx_messages_unread; Type: INDEX; Schema: public; Owner: database_92s8_user
--

CREATE INDEX idx_messages_unread ON public.messages USING btree (is_read, conversation_id);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: database_92s8_user
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id, is_read);


--
-- Name: idx_reported_content_status; Type: INDEX; Schema: public; Owner: database_92s8_user
--

CREATE INDEX idx_reported_content_status ON public.reported_content USING btree (status);


--
-- Name: idx_skill_endorsements_user; Type: INDEX; Schema: public; Owner: database_92s8_user
--

CREATE INDEX idx_skill_endorsements_user ON public.skill_endorsements USING btree (user_id, skill_id);


--
-- Name: idx_swap_ratings_rated; Type: INDEX; Schema: public; Owner: database_92s8_user
--

CREATE INDEX idx_swap_ratings_rated ON public.swap_ratings USING btree (rated_id);


--
-- Name: idx_swap_ratings_rater; Type: INDEX; Schema: public; Owner: database_92s8_user
--

CREATE INDEX idx_swap_ratings_rater ON public.swap_ratings USING btree (rater_id);


--
-- Name: idx_swap_ratings_swap_request; Type: INDEX; Schema: public; Owner: database_92s8_user
--

CREATE INDEX idx_swap_ratings_swap_request ON public.swap_ratings USING btree (swap_request_id);


--
-- Name: idx_swap_requests_created_at; Type: INDEX; Schema: public; Owner: database_92s8_user
--

CREATE INDEX idx_swap_requests_created_at ON public.swap_requests USING btree (created_at);


--
-- Name: idx_system_messages_active; Type: INDEX; Schema: public; Owner: database_92s8_user
--

CREATE INDEX idx_system_messages_active ON public.system_messages USING btree (is_active, expires_at);


--
-- Name: idx_user_skills_offered_user_id; Type: INDEX; Schema: public; Owner: database_92s8_user
--

CREATE INDEX idx_user_skills_offered_user_id ON public.user_skills_offered USING btree (user_id);


--
-- Name: idx_user_skills_wanted_user_id; Type: INDEX; Schema: public; Owner: database_92s8_user
--

CREATE INDEX idx_user_skills_wanted_user_id ON public.user_skills_wanted USING btree (user_id);


--
-- Name: idx_users_banned; Type: INDEX; Schema: public; Owner: database_92s8_user
--

CREATE INDEX idx_users_banned ON public.users USING btree (is_banned);


--
-- Name: idx_users_id_public; Type: INDEX; Schema: public; Owner: database_92s8_user
--

CREATE INDEX idx_users_id_public ON public.users USING btree (id) WHERE (is_public = true);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: database_92s8_user
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: admin_actions admin_actions_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.admin_actions
    ADD CONSTRAINT admin_actions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_participant1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_participant1_id_fkey FOREIGN KEY (participant1_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_participant2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_participant2_id_fkey FOREIGN KEY (participant2_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_swap_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_swap_request_id_fkey FOREIGN KEY (swap_request_id) REFERENCES public.swap_requests(id) ON DELETE SET NULL;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: platform_messages platform_messages_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.platform_messages
    ADD CONSTRAINT platform_messages_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: reported_content reported_content_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.reported_content
    ADD CONSTRAINT reported_content_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reported_content reported_content_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.reported_content
    ADD CONSTRAINT reported_content_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: skill_endorsements skill_endorsements_endorser_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.skill_endorsements
    ADD CONSTRAINT skill_endorsements_endorser_id_fkey FOREIGN KEY (endorser_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: skill_endorsements skill_endorsements_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.skill_endorsements
    ADD CONSTRAINT skill_endorsements_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE CASCADE;


--
-- Name: skill_endorsements skill_endorsements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.skill_endorsements
    ADD CONSTRAINT skill_endorsements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: swap_ratings swap_ratings_rated_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.swap_ratings
    ADD CONSTRAINT swap_ratings_rated_id_fkey FOREIGN KEY (rated_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: swap_ratings swap_ratings_rater_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.swap_ratings
    ADD CONSTRAINT swap_ratings_rater_id_fkey FOREIGN KEY (rater_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: swap_ratings swap_ratings_swap_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.swap_ratings
    ADD CONSTRAINT swap_ratings_swap_request_id_fkey FOREIGN KEY (swap_request_id) REFERENCES public.swap_requests(id) ON DELETE CASCADE;


--
-- Name: swap_requests swap_requests_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.swap_requests
    ADD CONSTRAINT swap_requests_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id);


--
-- Name: swap_requests swap_requests_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.swap_requests
    ADD CONSTRAINT swap_requests_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: system_messages system_messages_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: database_92s8_user
--

ALTER TABLE ONLY public.system_messages
    ADD CONSTRAINT system_messages_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON SEQUENCES TO database_92s8_user;


--
-- Name: DEFAULT PRIVILEGES FOR TYPES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TYPES TO database_92s8_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON FUNCTIONS TO database_92s8_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TABLES TO database_92s8_user;


--
-- PostgreSQL database dump complete
--

