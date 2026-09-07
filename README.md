# Battery Assembly System Execution (BASE)

BASE is an industrial-grade Manufacturing Execution System engineered for electric vehicle battery pack and module assembly lines. The platform delivers real-time production scheduling, multi-level component genealogy, quality station verification, automated non-conformance handling, and operational reporting across the shop floor.

---

## System Purpose & Objectives

The primary objective of BASE is to eliminate manual tracking and enforce strict digital traceability throughout the battery manufacturing lifecycle. It guarantees that every battery pack leaving the plant has an immutable digital birth certificate linking its enclosure serial number to its internal battery management system, left-hand module, and right-hand module, alongside validated test records from every intermediate quality gate.

---

## Architecture Overview

The system follows a modern decoupled three-tier architecture optimized for high-throughput manufacturing telemetry:

### 1. Database Tier (PostgreSQL)
The persistent relational foundation enforces strict data integrity using domain-specific enumerations, relational foreign keys, and optimized composite indexes. It models master bills of materials, production work orders, component marriage registries, high-resolution tester parameters, and non-conformance quarantine logs.

### 2. Backend Application Tier (FastAPI & SQLAlchemy)
The backend engine provides asynchronous REST APIs serving live telemetry, planning order registers, and dynamic genealogy querying. The data layer utilizes SQLAlchemy with window subqueries to resolve the latest quality state per pack without full table scans, alongside specialized shift calculation routines that accurately map factory shift patterns over single or multi-day time windows.

### 3. Frontend Dashboard Tier (Next.js, React & Tailwind CSS)
The client interface delivers a real-time command center designed for manufacturing operators, quality inspectors, and supervisors. Built with Next.js and styled using a clean frosted glass design system, the user interface features automated background data polling, role-based navigation guards, station-specific filters, arrow-based ledger pagination, and automated export tools.

---

## Core System Modules

### Master Data & Configuration Management
Maintains baseline production recipes, material part catalogs, vehicle model profiles, user access groups, and standardized defect taxonomies. This module ensures that production orders only consume verified component pairings and cell capacity ratings.

### Work Order Scheduling & Lifecycle Tracking
Manages the end-to-end planning stages for both module sub-assemblies and final battery pack lines. The system tracks scheduled start windows, actual shop-floor execution times, target unit consumption counters, and synchronization markers for streaming events to enterprise message brokers like Apache Kafka.

### Component Marriage & Digital Genealogy
Acts as the central traceability hub of the manufacturing line. When a battery pack is assembled, the system creates an immutable link connecting the pack enclosure barcode, the battery management system hardware serial, and the paired left-hand and right-hand module sub-assemblies. It provides full compatibility with both automated in-line scanning stations and legacy off-line module preparation cells.

### Quality Inspection Gates
Integrates directly with station testing machinery and quality verification terminals across four primary evaluation gates:
- **Pressure Decay Leak Testing:** Captures differential pressure drops to verify ingress protection integrity.
- **Pre-End of Line High-Voltage Verification:** Validates fundamental electrical isolation and safety prior to final assembly closeout.
- **End of Line & Chroma Cycler Characterization:** Logs granular electrical parameters including cell voltage deviations, minimum and maximum cell readings, State of Charge profiles, DC-DC converter output, and internal thermal gradients.
- **Pre-Delivery Inspection:** Enforces the final mechanical and visual inspection gate before units can be released for packing and vehicle integration.

### Non-Conformance & Rework Workflow
Provides a controlled quarantine loop for defective units. Any pack failing an inspection gate is flagged on the shop floor and restricted from downstream movement until authorized rework personnel inspect the failure, perform the correction, and log an authorized digital clearance signature.

### Real-Time Reporting & Shift Analytics
Aggregates shop-floor output into tailored operational consoles covering daily volume summaries, hourly throughput breakdowns, shift-wise achievements, work order histories, and structured data exports.

---

## Security & Session Management

The platform incorporates comprehensive security controls designed for shared terminal shop-floor environments:
- **Role-Based Access Control:** Granular routing matrices dynamically adapt navigation options and restrict sensitive administrative or rework routes based on assigned operator roles including Quality, Production, Supervisor, Rework, Report, and Admin.
- **Route Guard Interception:** Prevents unauthorized direct URL navigation by intercepting route transitions and verifying stored permissions before rendering page contents.
- **Automated Inactivity Protection:** Monitors operator interactions across keyboard, mouse, and touch events, automatically clearing credentials and terminating sessions after fifteen minutes of inactivity to prevent unauthorized usage on shared factory floor terminals.

---

## Operational Shift Logic

Manufacturing reporting relies on factory operational windows rather than midnight-to-midnight calendar dates:
- **Shift A:** Day operations running from morning to late afternoon.
- **Shift B:** Evening operations spanning afternoon through past midnight into the subsequent day.
- **Shift C:** Early morning graveyard operations concluding at the start of Shift A.
- **Shift ALL:** A rolling twenty-four-hour manufacturing window evaluating full operational days.

When querying across multiple days, the platform evaluates shift boundaries on an individual per-day basis, ensuring that selected shifts do not accidentally pull data from adjacent shifts occurring in the intervening hours.

---

## Technology Stack Summary

- **Database Engine:** PostgreSQL 13 or newer
- **Backend Framework:** FastAPI running on the Uvicorn ASGI server with Pydantic data validation
- **Object Relational Mapper:** SQLAlchemy ORM
- **Frontend Architecture:** Next.js with React Client Components
- **User Interface Styling:** Tailwind CSS with Lucide React iconography
- **Reverse Proxy & Gateway:** Nginx reverse proxy managing web routing and SSL termination
