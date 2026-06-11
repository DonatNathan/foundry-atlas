-- Palantir Foundry Application Map — seed data
-- Curated map of Foundry applications, their roles, and how they interconnect.
-- Learning path: applications with a learning_order form the recommended
-- "first steps" sequence for new Foundry users (1 → 12).

------------------------------------------------------------------------------
-- Categories
------------------------------------------------------------------------------
INSERT INTO category (id, name, color, sort) VALUES
  ('data-integration', 'Data Integration',         '#4C90F0', 1),
  ('ontology',         'Ontology',                 '#EC9A3C', 2),
  ('analytics',        'Analytics',                '#32A467', 3),
  ('app-building',     'Application Building',     '#9881F3', 4),
  ('ai-ml',            'AI & Machine Learning',    '#13C9BA', 5),
  ('governance',       'Governance & Operations',  '#F5498B', 6);

------------------------------------------------------------------------------
-- Applications — Data Integration
------------------------------------------------------------------------------
INSERT INTO application (id, name, category_id, description, use_case, tier, is_core, learning_order, status, era, docs_url, tips) VALUES
('data-connection', 'Data Connection', 'data-integration',
 'The gateway between Foundry and the outside world. Provides 200+ connectors (JDBC, SAP, Salesforce, S3, REST APIs, ...) plus on-premise agents to sync external systems into Foundry datasets, in batch or streaming mode.',
 'Set up syncs from source systems (databases, ERPs, cloud storage, APIs) into raw Foundry datasets, and export data back out to external systems.',
 'intermediate', 1, 4, 'stable', 'Foundational',
 'https://www.palantir.com/docs/foundry/data-connection/overview/',
 'You usually consume data someone else connected before you set up your own sync. Understand sources, agents, and sync schedules before diving into connector specifics.'),

('dataset-preview', 'Dataset Preview', 'data-integration',
 'The default view of any dataset: browse rows, inspect the schema, view file contents, explore dataset history and branches, and check build status.',
 'Inspect any dataset''s contents, schema, and transaction history — the first thing you open when exploring data you don''t know.',
 'beginner', 1, 2, 'stable', 'Foundational',
 'https://www.palantir.com/docs/foundry/dataset-preview/overview/',
 'Datasets are the fundamental storage primitive of Foundry. Learn what a dataset, a transaction, and a branch are here — everything else builds on them.'),

('pipeline-builder', 'Pipeline Builder', 'data-integration',
 'A visual, point-and-click application for building production data pipelines — batch or streaming — with transforms, joins, and cleaning steps, all version-controlled with branching and proposals.',
 'Build and deploy data transformation pipelines without writing code; the recommended starting point for most data integration work, including ontology hydration.',
 'beginner', 1, 3, 'new', 'Modern default (2023+)',
 'https://www.palantir.com/docs/foundry/pipeline-builder/overview/',
 'The modern default for pipelines. Start here before Code Repositories — most pipelines never need custom code, and Pipeline Builder outputs can hydrate the Ontology directly.'),

('code-repositories', 'Code Repositories', 'data-integration',
 'A full web-based development environment with Git version control for writing data transformations in Python (PySpark), Java, or SQL, as well as TypeScript/Python Functions — with CI checks, branching, and pull requests.',
 'Write code-based data transforms when logic outgrows Pipeline Builder, and author Functions that power Actions and application logic.',
 'intermediate', 0, 11, 'stable', 'Foundational',
 'https://www.palantir.com/docs/foundry/code-repositories/overview/',
 'The pro-code counterpart of Pipeline Builder. If you know Git and PySpark you will feel at home. Used both for heavy data transforms and for authoring Functions.'),

('code-workspaces', 'Code Workspaces', 'data-integration',
 'Hosted JupyterLab and RStudio environments running inside Foundry, with direct access to datasets and the Ontology — for exploratory data science and model development.',
 'Do iterative, notebook-style data science (EDA, feature engineering, model training) in familiar tools without leaving the platform.',
 'advanced', 0, NULL, 'new', 'AIP era (2023+)',
 'https://www.palantir.com/docs/foundry/code-workspaces/overview/',
 'The modern home for data scientists, replacing most Code Workbook use cases. Models trained here are submitted to Modeling Objectives for productionization.'),

('code-workbook', 'Code Workbook', 'data-integration',
 'The original notebook-style analysis and transformation tool, mixing Python/R/SQL nodes in a visual graph. Still encountered on many stacks but no longer the recommended option.',
 'Legacy exploratory analysis and lightweight transforms; on new projects prefer Code Workspaces (analysis) and Pipeline Builder / Code Repositories (pipelines).',
 'intermediate', 0, NULL, 'legacy', 'Legacy — superseded by Code Workspaces',
 'https://www.palantir.com/docs/foundry/code-workbook/overview/',
 'You will find plenty of existing Workbooks in older projects, so it''s worth being able to read them — but don''t start new work here.'),

('data-lineage', 'Data Lineage', 'data-integration',
 'An interactive graph of how datasets, transforms, models, and ontology objects depend on each other across the platform, with build status, schedules, and health overlays.',
 'Trace where data comes from and where it flows to, run impact analysis before changing a dataset, and debug pipeline failures end-to-end.',
 'intermediate', 0, 12, 'stable', 'Foundational',
 'https://www.palantir.com/docs/foundry/data-lineage/overview/',
 'Open Data Lineage whenever you inherit an unfamiliar pipeline — it answers "where does this column come from?" faster than reading code.'),

('media-sets', 'Media Sets', 'data-integration',
 'First-class storage for unstructured media — images, PDFs, audio, video — with schema enforcement, transactional updates, and APIs for processing media in pipelines and AIP workflows.',
 'Store and process documents, images, and other unstructured content, e.g. PDF extraction pipelines or media inputs to LLM workflows.',
 'advanced', 0, NULL, 'new', 'AIP era (2023+)',
 'https://www.palantir.com/docs/foundry/media-sets/overview/',
 'Reach for Media Sets instead of stuffing raw files into datasets whenever you work with documents or images, especially for AIP document-processing workflows.');

------------------------------------------------------------------------------
-- Applications — Ontology
------------------------------------------------------------------------------
INSERT INTO application (id, name, category_id, description, use_case, tier, is_core, learning_order, status, era, docs_url, tips) VALUES
('ontology-manager', 'Ontology Manager', 'ontology',
 'The control center for the Ontology — Foundry''s semantic layer that turns datasets into Object Types (e.g. Customer, Flight, Machine) with properties, Links between them, and Actions that write changes back.',
 'Define and maintain object types, link types, action types, and their permissions — the shared "digital twin" vocabulary every operational app is built on.',
 'beginner', 1, 6, 'stable', 'Foundational',
 'https://www.palantir.com/docs/foundry/ontology/overview/',
 'The Ontology is THE central concept of Foundry — it is what separates Foundry from a classic data platform. Understand object types, links, and actions before touching Workshop or AIP.'),

('object-explorer', 'Object Explorer', 'ontology',
 'A search-and-browse interface over all ontology objects: filter, pivot across links, build and save object sets, and view individual objects with their properties and history.',
 'Explore the ontology like a search engine — find objects, filter them into object sets, and hand those sets to Quiver, Workshop, or Actions.',
 'beginner', 1, 7, 'stable', 'Foundational',
 'https://www.palantir.com/docs/foundry/object-explorer/overview/',
 'The fastest way to "feel" what the Ontology is. Object sets you build here are reusable across the whole platform.'),

('functions', 'Functions', 'ontology',
 'Server-side logic (TypeScript or Python, authored in Code Repositories) that runs against the Ontology — powering computed values, validations, Action logic, and callable APIs for apps and agents.',
 'Encode business logic once — e.g. "compute remaining capacity" or "validate this reassignment" — and reuse it across Workshop apps, Actions, OSDK apps, and AIP agents.',
 'advanced', 0, NULL, 'stable', 'Foundational',
 'https://www.palantir.com/docs/foundry/functions/overview/',
 'Functions are the glue between the Ontology and applications. If a Workshop app does something "smart", there is usually a Function behind it.'),

('vertex', 'Vertex', 'ontology',
 'A graph-and-scenario application over the Ontology: visualize networks of linked objects as an interactive "digital twin" and simulate what-if scenarios on top of them.',
 'Model and compare scenarios on connected systems — supply chains, networks, production plans — before committing changes back through Actions.',
 'advanced', 0, NULL, 'stable', 'Foundational',
 'https://www.palantir.com/docs/foundry/vertex/overview/',
 'Powerful for supply-chain and network use cases; only worth learning once your ontology is rich in links.'),

('automate', 'Automate', 'ontology',
 'The platform''s automation engine (evolved from Object Monitoring): watch objects, metrics, or schedules for conditions and trigger effects — notifications, Actions, Logic functions — when they fire.',
 'Turn passive data into proactive operations: "notify the planner when stock drops below threshold", "auto-apply this Action when a job fails".',
 'intermediate', 0, NULL, 'new', 'AIP era (2023+)',
 'https://www.palantir.com/docs/foundry/automate/overview/',
 'The bridge from dashboards (humans watch data) to operations (the platform watches data). Pairs naturally with Actions and AIP Logic.'),

('machinery', 'Machinery', 'ontology',
 'A process-orchestration application that defines stateful, multi-step operational processes (state machines) over ontology objects, coordinating humans and automation through each stage.',
 'Model long-running business processes — approvals chains, maintenance workflows, order lifecycles — with explicit states, transitions, and task assignment.',
 'advanced', 0, NULL, 'stable', 'Foundational',
 'https://www.palantir.com/docs/foundry/machinery/overview/',
 'Niche but powerful: reach for Machinery when a workflow has real states and handoffs, not just notifications.');

------------------------------------------------------------------------------
-- Applications — Analytics
------------------------------------------------------------------------------
INSERT INTO application (id, name, category_id, description, use_case, tier, is_core, learning_order, status, era, docs_url, tips) VALUES
('contour', 'Contour', 'analytics',
 'Point-and-click analysis on top of datasets: build "analysis paths" of filters, joins, pivots, and charts on billions of rows without writing code, and save them as dashboards.',
 'Tabular, dataset-level exploration and BI-style analysis — the everyday tool for analysts to answer questions from datasets quickly.',
 'beginner', 1, 5, 'stable', 'Foundational',
 'https://www.palantir.com/docs/foundry/contour/overview/',
 'The classic first analytics tool in Foundry. Works on datasets (pre-ontology); use Quiver when you want to analyze ontology objects instead.'),

('quiver', 'Quiver', 'analytics',
 'The object-centric analytics application: charts, time series, pivots, and interactive dashboards built directly on ontology objects and their links, with drill-through to the underlying objects.',
 'Analyze the operational world via the Ontology — e.g. plot sensor time series per Machine object, then pivot to its open work orders.',
 'intermediate', 1, 9, 'stable', 'Modern object analytics',
 'https://www.palantir.com/docs/foundry/quiver/overview/',
 'Think "Contour, but for objects". Quiver cards can be embedded into Workshop apps, which makes it a building block, not just an analysis tool.'),

('fusion', 'Fusion', 'analytics',
 'Foundry''s spreadsheet application: familiar formulas and sheets, but connected live to datasets and ontology objects, with write-back and branching instead of CSV exports.',
 'Give spreadsheet-native users (finance, planning, ops) a live, governed Excel-like surface over platform data.',
 'intermediate', 0, NULL, 'stable', 'Foundational',
 'https://www.palantir.com/docs/foundry/fusion/overview/',
 'Great adoption bridge for Excel-heavy teams — the data stays governed and refreshable instead of dying in email attachments.'),

('notepad', 'Notepad', 'analytics',
 'Collaborative documents with live, embedded platform content: Contour charts, Quiver cards, object tables, and metrics stay up to date inside the narrative text.',
 'Write reports, runbooks, and decision documents whose numbers and charts update automatically with the data.',
 'beginner', 0, NULL, 'stable', 'Foundational',
 'https://www.palantir.com/docs/foundry/notepad/overview/',
 'Use Notepad for anything you''d otherwise paste screenshots into a doc for — embedded analyses keep living documents honest.'),

('map', 'Map', 'analytics',
 'The geospatial application: layer ontology objects, imagery, and geo-data on interactive maps, with spatial and temporal filtering and analysis tools.',
 'Geospatial situational awareness and analysis — fleet positions, facility networks, territory analysis — driven by ontology objects with location properties.',
 'intermediate', 0, NULL, 'stable', 'Foundational',
 'https://www.palantir.com/docs/foundry/map/overview/',
 'Only relevant if your objects have geospatial properties — but indispensable when they do. Maps embed nicely into Workshop apps.');

------------------------------------------------------------------------------
-- Applications — Application Building
------------------------------------------------------------------------------
INSERT INTO application (id, name, category_id, description, use_case, tier, is_core, learning_order, status, era, docs_url, tips) VALUES
('workshop', 'Workshop', 'app-building',
 'The drag-and-drop builder for operational applications on the Ontology: assemble pages from widgets (tables, charts, forms, maps), wire them to object sets, variables, Functions, and Actions — no code required.',
 'Build the apps end users actually work in every day: triage queues, planning tools, 360° views — reading from the Ontology and writing back via Actions.',
 'beginner', 1, 8, 'stable', 'Modern default',
 'https://www.palantir.com/docs/foundry/workshop/overview/',
 'Workshop is where the Ontology pays off — most Foundry value reaches end users through a Workshop app. The single most important app-building skill on the platform.'),

('slate', 'Slate', 'app-building',
 'The original application builder: fully custom HTML/CSS/JavaScript apps with handlebars templating and direct query wiring. Maximum flexibility, but no ontology-native widgets and a much steeper maintenance burden.',
 'Legacy custom dashboards and apps, or rare pixel-perfect/custom-JS requirements that Workshop cannot meet. New development should default to Workshop.',
 'advanced', 0, NULL, 'legacy', 'Legacy — superseded by Workshop for most uses',
 'https://www.palantir.com/docs/foundry/slate/overview/',
 'You will meet Slate apps in older deployments. Learn to maintain them if needed, but build new applications in Workshop (or OSDK for fully custom needs).'),

('developer-console', 'Developer Console', 'app-building',
 'The portal for building external applications with the Ontology SDK (OSDK): generates typed TypeScript/Python/Java SDKs from your ontology and manages OAuth clients, scopes, and API access.',
 'Build custom websites, mobile apps, or backend services outside Foundry that read and write the Ontology through generated, type-safe SDKs.',
 'advanced', 0, NULL, 'new', 'AIP era (2023+)',
 'https://www.palantir.com/docs/foundry/ontology-sdk/overview/',
 'The escape hatch beyond Workshop: full developer freedom (React, mobile, services) while keeping ontology governance. OSDK is one of the fastest-evolving parts of the platform.'),

('marketplace', 'Marketplace', 'app-building',
 'The packaging and distribution system (Foundry DevOps): bundle pipelines, ontologies, Workshop apps, and AIP logic into installable, upgradeable products that can be deployed across spaces and stacks.',
 'Ship a complete use case from a dev environment to production — or to another organization — as a versioned, parameterized product instead of manual copying.',
 'advanced', 0, NULL, 'new', 'AIP era (2023+)',
 'https://www.palantir.com/docs/foundry/marketplace/overview/',
 'This is "DevOps for use cases". Also where Palantir-built reference solutions are installed from — browsing it is a great way to learn solution patterns.'),

('solution-designer', 'Solution Designer', 'app-building',
 'A visual canvas for designing solution architectures: diagram the datasets, ontology entities, and applications of a use case before and while you build it, linked to the real resources.',
 'Plan and communicate the architecture of a Foundry use case — the blueprint that engineering, ontology, and app work align on.',
 'advanced', 0, NULL, 'new', 'AIP era (2023+)',
 'https://www.palantir.com/docs/foundry/solution-designer/overview/',
 'Useful on multi-team builds: it keeps the target architecture visible and clickable rather than buried in slide decks.');

------------------------------------------------------------------------------
-- Applications — AI & Machine Learning
------------------------------------------------------------------------------
INSERT INTO application (id, name, category_id, description, use_case, tier, is_core, learning_order, status, era, docs_url, tips) VALUES
('aip-assist', 'AIP Assist', 'ai-ml',
 'The platform-wide AI assistant: an LLM copilot embedded across Foundry that answers questions about the platform, explains resources, and helps generate pipelines, code, and app configurations.',
 'Accelerate every workflow — ask how to do something in Foundry, generate a Pipeline Builder transform, explain an unfamiliar dataset or repository.',
 'beginner', 1, 10, 'new', 'AIP era (2023+)',
 'https://www.palantir.com/docs/foundry/aip-assist/overview/',
 'Turn it on from day one — it is the best onboarding tool in the platform. Ask it "how do I…" before reaching for the docs.'),

('aip-logic', 'AIP Logic', 'ai-ml',
 'A no-code board for building LLM-powered functions: compose prompts, ontology context, tool calls, and structured outputs into testable "Logic functions" that can act on the Ontology.',
 'Build production LLM workflows — summarize objects, extract structure from documents, recommend actions — without managing models or glue code.',
 'intermediate', 0, NULL, 'new', 'AIP era (2023+)',
 'https://www.palantir.com/docs/foundry/logic/overview/',
 'The heart of "AIP on the Ontology". Because Logic functions are just Functions, everything that can call a Function (Workshop, Automate, OSDK) can call your LLM logic.'),

('agent-studio', 'AIP Agent Studio', 'ai-ml',
 'The builder for conversational AI agents: configure system prompts, retrieval over documents and objects, and tools (Functions, Actions) the agent may use, then publish chat agents to users and applications.',
 'Create governed, ontology-aware chat assistants — a maintenance copilot that knows your machines and can file work orders via Actions.',
 'advanced', 0, NULL, 'new', 'AIP era (2023+)',
 'https://www.palantir.com/docs/foundry/agent-studio/overview/',
 'Agents become genuinely useful when given ontology tools — retrieval alone is a demo, retrieval + Actions is an operational workflow.'),

('aip-evals', 'AIP Evals', 'ai-ml',
 'The evaluation framework for AI workflows: define test suites with expected outcomes, run them against Logic functions and agents across model/prompt versions, and compare results before shipping.',
 'Make LLM workflows production-grade — regression-test prompts, compare models, and quantify quality instead of eyeballing outputs.',
 'advanced', 0, NULL, 'new', 'AIP era (2023+)',
 'https://www.palantir.com/docs/foundry/evals/overview/',
 'Treat Evals like unit tests for AI: no Logic function or agent should ship to operations without an eval suite behind it.'),

('modeling-objectives', 'Modeling Objectives', 'ai-ml',
 'The model lifecycle manager: register models (Foundry-trained or external), evaluate and compare candidates against an objective, then release and deploy them as live endpoints or batch transforms.',
 'Productionize ML — manage staging/production releases, host inference endpoints, and wire model outputs into pipelines, Functions, and apps.',
 'advanced', 0, NULL, 'stable', 'Foundational',
 'https://www.palantir.com/docs/foundry/modeling-objectives/overview/',
 'The MLOps backbone of Foundry: train wherever you like (Code Workspaces, externally), but deploy and govern through Modeling Objectives.');

------------------------------------------------------------------------------
-- Applications — Governance & Operations
------------------------------------------------------------------------------
INSERT INTO application (id, name, category_id, description, use_case, tier, is_core, learning_order, status, era, docs_url, tips) VALUES
('projects', 'Projects & Files', 'governance',
 'The filesystem of Foundry (built on Compass): every resource — dataset, pipeline, app, ontology artifact — lives in folders within Projects, which are the primary unit of organization and access control.',
 'Navigate and organize all platform resources, and manage who can see and edit what through project roles and permissions.',
 'beginner', 1, 1, 'stable', 'Foundational',
 'https://www.palantir.com/docs/foundry/projects/overview/',
 'Literally the first thing you see in Foundry. Understand Projects → folders → resources and how roles cascade before creating anything.'),

('builds', 'Builds & Schedules', 'governance',
 'The execution layer for all computation: every transform run is a job inside a build. Inspect running and historical builds, read logs, and define schedules that keep pipelines fresh (time- or event-triggered).',
 'Monitor and debug pipeline executions, and schedule when datasets rebuild — the operational heartbeat of data integration.',
 'intermediate', 0, NULL, 'stable', 'Foundational',
 'https://www.palantir.com/docs/foundry/builds/overview/',
 'When a pipeline "doesn''t work", the answer is almost always in the build logs. Learn to read a build graph early — it pays off daily.'),

('data-health', 'Data Health', 'governance',
 'The data quality application: attach health checks to datasets — freshness, schema, row counts, null ratios, custom expectations — and aggregate their status into monitored check groups.',
 'Catch data quality problems before consumers do: alert when a critical dataset is late, shrinks unexpectedly, or breaks schema.',
 'intermediate', 0, NULL, 'stable', 'Foundational',
 'https://www.palantir.com/docs/foundry/data-health/overview/',
 'Production pipelines without health checks are incidents waiting to happen. Add freshness + row count checks to every dataset that feeds the Ontology.'),

('approvals', 'Approvals', 'governance',
 'The review workflow system: changes to governed resources — ontology proposals, marketplace installations, checkout requests — go through structured propose/review/approve flows with full audit trail.',
 'Gate sensitive changes behind peer review, e.g. ontology schema changes proposed by builders and approved by ontology owners.',
 'intermediate', 0, NULL, 'stable', 'Foundational',
 'https://www.palantir.com/docs/foundry/approvals/overview/',
 'Expect to meet Approvals the first time you propose an ontology change on a governed stack — it is Git-style review applied to platform configuration.'),

('checkpoints', 'Checkpoints', 'governance',
 'A governance mechanism that interrupts sensitive operations — exports, marking overrides, large queries — to require user justifications, which are recorded for audit.',
 'Enforce "stop and justify" moments on risky actions so security teams get an auditable trail of who did what and why.',
 'advanced', 0, NULL, 'stable', 'Foundational',
 'https://www.palantir.com/docs/foundry/checkpoints/overview/',
 'Mostly configured by platform administrators — as a builder you''ll experience checkpoints rather than create them.'),

('control-panel', 'Control Panel', 'governance',
 'The administration console: manage organizations, users and groups (via Multipass identity), markings and classification, enrollment settings, resource quotas, and platform-wide feature configuration.',
 'Administer the Foundry enrollment — identity providers, security markings, org boundaries, and which features and models are enabled.',
 'advanced', 0, NULL, 'stable', 'Foundational',
 'https://www.palantir.com/docs/foundry/administration/overview/',
 'Admin territory. Builders mainly need to know it exists and that markings/permissions configured here override everything downstream.');

------------------------------------------------------------------------------
-- Links — how the applications interconnect
------------------------------------------------------------------------------

-- Data flows in
INSERT INTO application_link (source_id, target_id, relationship, description) VALUES
('data-connection', 'pipeline-builder', 'feeds', 'Synced raw datasets are the typical inputs of Pipeline Builder pipelines.'),
('data-connection', 'code-repositories', 'feeds', 'Synced datasets are read by code-based transforms.'),
('data-connection', 'media-sets', 'feeds', 'File-based syncs land documents and media into media sets.'),
('media-sets', 'pipeline-builder', 'feeds', 'Media sets are processed (OCR, extraction, chunking) in pipelines.'),
('media-sets', 'aip-logic', 'feeds', 'Documents and images from media sets are inputs to LLM workflows.'),

-- Transformation layer
('pipeline-builder', 'dataset-preview', 'feeds', 'Pipeline outputs are datasets you inspect in Dataset Preview.'),
('code-repositories', 'dataset-preview', 'feeds', 'Transform outputs are datasets you inspect in Dataset Preview.'),
('pipeline-builder', 'ontology-manager', 'feeds', 'Clean pipeline outputs back (hydrate) ontology object types.'),
('code-repositories', 'ontology-manager', 'feeds', 'Code-based transform outputs back ontology object types.'),
('pipeline-builder', 'contour', 'feeds', 'Pipeline output datasets are analyzed in Contour.'),
('code-workspaces', 'code-workbook', 'supersedes', 'Code Workspaces is the modern replacement for most Code Workbook usage.'),
('pipeline-builder', 'code-workbook', 'supersedes', 'Pipeline Builder replaces Workbook-built production transforms.'),
('code-workspaces', 'modeling-objectives', 'feeds', 'Models trained in notebooks are submitted to Modeling Objectives.'),
('code-repositories', 'modeling-objectives', 'feeds', 'Model adapters and training code publish models to objectives.'),
('code-repositories', 'functions', 'powers', 'Functions are authored and versioned in Code Repositories.'),

-- Observability of the data layer
('data-lineage', 'pipeline-builder', 'monitors', 'Lineage visualizes pipeline dependency graphs and build status.'),
('data-lineage', 'code-repositories', 'monitors', 'Lineage traces code-based transforms across datasets.'),
('builds', 'pipeline-builder', 'monitors', 'Every pipeline deployment runs as builds with logs and schedules.'),
('builds', 'code-repositories', 'monitors', 'Transform jobs run as builds; schedules keep outputs fresh.'),
('data-health', 'pipeline-builder', 'monitors', 'Health checks watch freshness, size, and schema of pipeline outputs.'),
('data-health', 'data-lineage', 'complements', 'Health status overlays on the lineage graph for at-a-glance triage.'),
('data-health', 'automate', 'feeds', 'Failing health checks can trigger automations and notifications.'),

-- Ontology powers the operational layer
('ontology-manager', 'object-explorer', 'powers', 'Object Explorer searches and browses the object types defined here.'),
('ontology-manager', 'workshop', 'powers', 'Workshop apps are built on object sets, links, and Actions.'),
('ontology-manager', 'quiver', 'powers', 'Quiver analyzes ontology objects, links, and time series.'),
('ontology-manager', 'vertex', 'powers', 'Vertex graphs and scenarios run over linked ontology objects.'),
('ontology-manager', 'map', 'powers', 'Map renders objects with geospatial properties as live layers.'),
('ontology-manager', 'fusion', 'powers', 'Fusion sheets can read and write ontology objects.'),
('ontology-manager', 'automate', 'powers', 'Automations watch object conditions and trigger ontology Actions.'),
('ontology-manager', 'machinery', 'powers', 'Process states and transitions are defined over ontology objects.'),
('ontology-manager', 'aip-logic', 'powers', 'Logic functions receive ontology context and act through Actions.'),
('ontology-manager', 'agent-studio', 'powers', 'Agents retrieve objects and call Actions as governed tools.'),
('ontology-manager', 'developer-console', 'powers', 'OSDK generates typed SDKs from the ontology definition.'),

-- Functions as connective tissue
('functions', 'workshop', 'powers', 'Functions compute derived values and drive logic inside Workshop apps.'),
('functions', 'ontology-manager', 'powers', 'Function-backed Actions implement complex write logic.'),
('functions', 'developer-console', 'powers', 'External OSDK apps call published Functions as APIs.'),
('aip-logic', 'functions', 'builds-on', 'Logic boards publish as Functions, callable everywhere Functions are.'),
('modeling-objectives', 'functions', 'powers', 'Deployed models are wrapped as Functions for live inference.'),

-- Analytics interplay
('object-explorer', 'quiver', 'complements', 'Object sets built in Explorer open directly in Quiver for analysis.'),
('quiver', 'workshop', 'embeds-in', 'Quiver cards and dashboards embed inside Workshop modules.'),
('map', 'workshop', 'embeds-in', 'Maps embed as widgets inside Workshop applications.'),
('contour', 'notepad', 'embeds-in', 'Contour charts and tables embed live into Notepad documents.'),
('quiver', 'notepad', 'embeds-in', 'Quiver visualizations embed live into Notepad documents.'),
('workshop', 'slate', 'supersedes', 'Workshop is the recommended replacement for most Slate apps.'),

-- AIP layer
('aip-assist', 'pipeline-builder', 'assists', 'Assist generates and explains pipeline transforms.'),
('aip-assist', 'workshop', 'assists', 'Assist helps configure widgets and app logic.'),
('aip-assist', 'contour', 'assists', 'Assist builds analysis paths from natural-language questions.'),
('aip-assist', 'code-repositories', 'assists', 'Assist explains and generates transform code.'),
('aip-logic', 'agent-studio', 'powers', 'Logic functions serve as tools that agents can invoke.'),
('aip-logic', 'automate', 'complements', 'Automations call Logic functions to add AI to triggered workflows.'),
('aip-evals', 'aip-logic', 'monitors', 'Eval suites regression-test Logic functions across versions.'),
('aip-evals', 'agent-studio', 'monitors', 'Eval suites score agent behavior before publishing.'),
('agent-studio', 'workshop', 'embeds-in', 'Published agents embed as chat widgets in Workshop apps.'),

-- Governance & distribution
('projects', 'ontology-manager', 'governs', 'Ontology resources live in projects; project roles gate who edits them.'),
('projects', 'pipeline-builder', 'governs', 'Pipelines and their datasets are organized and permissioned via projects.'),
('control-panel', 'projects', 'governs', 'Org structure, markings, and identity configured here scope all projects.'),
('control-panel', 'checkpoints', 'governs', 'Administrators configure checkpoint policies platform-wide.'),
('approvals', 'ontology-manager', 'governs', 'Ontology proposals are reviewed and approved before taking effect.'),
('marketplace', 'workshop', 'packages', 'Workshop apps ship inside installable Marketplace products.'),
('marketplace', 'ontology-manager', 'packages', 'Ontology definitions are packaged and deployed as products.'),
('marketplace', 'pipeline-builder', 'packages', 'Pipelines are bundled into products for cross-stack deployment.'),
('solution-designer', 'marketplace', 'complements', 'Architectures designed here are realized and shipped via Marketplace.');
