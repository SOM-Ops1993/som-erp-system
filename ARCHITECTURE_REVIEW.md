# SOM ERP — QR Inventory & Production System
## Architecture Validation Report
**Prepared by:** Senior Systems Architect
**Date:** April 11, 2026
**Status:** Pre-build Review — Code NOT yet written
**Data Analysed:** `QR- INVENTORY SYSTEM (9).xlsx`

---

## EXECUTIVE SUMMARY

The proposed system architecture is fundamentally sound. After analysing your live Excel data (4,455 packs, 3,988 inward records, 1,084 outward transactions, 768 items), **11 critical gaps and risks** were identified that would have caused production failures if not addressed before build. This document resolves all of them and delivers the final, hardened architecture ready for implementation.

---

## SECTION 1 — DATA AUDIT FINDINGS (from your Excel)

### 1.1 Volume Baseline
| Entity | Count |
|---|---|
| Items (RM Master) | 768 |
| Items with active stock | 236 |
| Packs in Print Master | 4,455 |
| Packs inwarded | 3,988 |
| Packs NOT yet inwarded | 467 |
| Outward transactions | 1,084 |
| Containers | 468 |
| Warehouses | 10 |

### 1.2 Critical Data Anomalies Found

**ANOMALY 1 — Pack ID Format Is NOT Consistent (CRITICAL)**

The proposed format `<LBL>-<ITEMCODE>-<YEAR>-<LOTNO>-<BAGNO>` uses hyphens as delimiters. However, your live lot numbers themselves contain hyphens and slashes:

| Lot No Value | Result in Pack ID | Problem |
|---|---|---|
| `2627/001` | `PRO-156828-2026-2627/001-034` | Slash in ID — OK |
| `2627-01` | `ASC-156745-2026-2627-01-129` | Produces 6 segments, not 5 — **BREAKS PARSING** |
| `2025/0001` | `CIT-151464-2026-2025/0001-012` | Slash — OK |
| `2014` | `HYD-311-2026-2014-001` | Year as lot — ambiguous |

193 existing Pack IDs have 6 segments (instead of 5) due to hyphenated lot numbers.
2 existing Pack IDs have only 4 segments.

**RESOLUTION:** Store `lot_no` as a clean text column in the database. The Pack ID is the human-readable label only — never parse it back into components. The database is the source of truth.

---

**ANOMALY 2 — Lot Number Type Chaos (CRITICAL)**

Your Excel stores lot numbers in mixed types. Excel auto-converted `2627/01` to a date `2627-01-01 00:00:00`. In the database, lot_no must be stored as `VARCHAR`, never numeric, never date.

Unique lot formats found:
- Simple integers: `1`, `2`, `2014`, `2025`
- Year/sequence: `2025/01`, `2025/02`, `2627/001`, `2526/001`
- Alphanumeric: `2025/1A`
- Excel date artefact: `2627-01-01 00:00:00` → must be cleaned to `2627/01` on import

---

**ANOMALY 3 — Negative Stock (5 items)**

Five items have negative bag counts in stock:

| Item | Negative Bags | Qty (Kg) |
|---|---|---|
| Ammonium Molybdate | -2 | +20.36 |
| Cellulase | -1 | +6.30 |
| IGSURF-6000E | -1 | +35.00 |
| IGSURF-7000E | -1 | +35.00 |
| Sunset Yellow | -1 | -0.50 |

These are a result of outward transactions exceeding inward records in the Excel system. During legacy import, the `STOCK_LEDGER` will reflect this truthfully. The ERP will prevent this going forward via strict validation.

---

**ANOMALY 4 — Transaction Types Beyond Spec**

Your live outward data has 5 transaction types, but the spec only defines 3. Two are missing from the architecture:

| Transaction Type | Count | In Spec? |
|---|---|---|
| ISSUED TO PRODUCTION | 952 | ✅ (BOM Issuance) |
| STOCK RECON ADJUSTMENT | 68 | ✅ |
| JOB WORK | 40 | ❌ MISSING |
| WAREHOUSE TRANSFER | 22 | ❌ MISSING |
| PACK SIZE REDUCTION | 2 | ✅ |

**RESOLUTION:** Add `JOB WORK` and `WAREHOUSE TRANSFER` as outward modes. Both use scan-from-pack with destination entry. Detailed in Section 3.

---

**ANOMALY 5 — Supplier / Invoice / Batch Code Data**

Your Print Master contains fields that have no place in the proposed schema:
- `SUPPLIER`
- `INVOICE NO.`
- `RECEIVED DATE`
- `BATCH CODE (Supplier's internal batch)`

These are critical for traceability and goods receipt. They must be added to `PRINT_MASTER`.

---

**ANOMALY 6 — Container ID Malformation**

468 containers exist. The auto-generated IDs have issues due to item names starting with numbers or containing spaces:

| Container ID | Problem |
|---|---|
| `25--177822-CONT001` | Double dash — item "25-Hydroxy..." starts with digit |
| `2 B-5735010-CONT001` | Space in LBL — item "2 Bromo..." has a space |
| `ACE-304-CONT001` | Correct |
| `ASC-156745-CONT001` | Correct |

**RESOLUTION:** LBL for container ID must be extracted as the first 3 alphanumeric characters, stripping spaces and special characters before forming the ID.

---

**ANOMALY 7 — BOM Number Inconsistency**

BOM references in outward are free-text with no normalisation:
- `Som/bom-2627-0016`
- `Som/bom/2627-0016` *(same BOM, different slash)*
- `DVS/BOM-2627-0019`
- `DVS/BOM/-2627-0019` *(extra slash)*

**RESOLUTION:** BOM / DI references must be stored as free-text `VARCHAR` with NO auto-parsing. The `indent_id` in the database is the primary link; the BOM number is a reference string only.

---

**ANOMALY 8 — UOM Has Two Types**

| UOM | Pack Count |
|---|---|
| Kg | 3,886 |
| Nos (pieces/count) | 569 |

The system must support both. Stock ledger balances must be tracked per UOM. Mixing Kg with Nos in the same item must be blocked.

---

**ANOMALY 9 — Bag Number Exceeds 3 Digits**

The spec states bag numbers are zero-padded to 3 digits (001–999). Your data shows lots with up to 588 bags (within limit) but future lots for high-volume items may exceed 999. The schema must store `bag_no` as an integer (not VARCHAR 3-char).

---

**ANOMALY 10 — 467 Packs in Print Master Not Yet Inwarded**

These packs exist as labels (QR codes printed) but have NOT been scanned into the warehouse. During legacy import, these must be loaded into `PRINT_MASTER` only — no INWARD or STOCK_LEDGER records created. Their status will be `AWAITING_INWARD`.

---

**ANOMALY 11 — No Immutable Ledger Exists**

The current Excel system has no STOCK_LEDGER. Stock is calculated dynamically via SUMIF formulas. This means:
- Historical balance at any point in time is unrecoverable
- Deletion of any row silently corrupts all history

The ERP will build the ledger from scratch using all inward and outward records as the opening migration.

---

## SECTION 2 — FINAL DATABASE SCHEMA (PostgreSQL)

### 2.1 RM_MASTER
```sql
CREATE TABLE rm_master (
    item_code       VARCHAR(20)  PRIMARY KEY,
    item_name       VARCHAR(200) NOT NULL UNIQUE,
    uom             VARCHAR(10)  NOT NULL CHECK (uom IN ('Kg', 'L', 'Nos', 'g', 'mL')),
    reorder_level   NUMERIC(12,3),
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);
```

**Change vs spec:** Added `reorder_level` (exists in your STOCK sheet) and `created_at`.

---

### 2.2 PRINT_MASTER
```sql
CREATE TABLE print_master (
    pack_id         VARCHAR(60)  PRIMARY KEY,
    item_code       VARCHAR(20)  NOT NULL REFERENCES rm_master(item_code),
    item_name       VARCHAR(200) NOT NULL,
    lot_no          VARCHAR(30)  NOT NULL,           -- TEXT, never numeric, never date
    bag_no          INTEGER      NOT NULL,
    pack_qty        NUMERIC(12,3) NOT NULL,
    uom             VARCHAR(10)  NOT NULL,
    label_name      VARCHAR(20),                      -- Auto-generated LBL prefix
    received_date   DATE,                             -- NEW: from your data
    supplier        VARCHAR(200),                     -- NEW: from your data
    invoice_no      VARCHAR(100),                     -- NEW: from your data
    supplier_batch  VARCHAR(100),                     -- NEW: Batch Code from supplier
    remarks         TEXT,
    status          VARCHAR(20)  NOT NULL DEFAULT 'AWAITING_INWARD'
                    CHECK (status IN ('AWAITING_INWARD', 'INWARDED', 'PARTIALLY_ISSUED', 'EXHAUSTED')),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (item_code, lot_no, bag_no)               -- Composite uniqueness guarantee
);
```

**Changes vs spec:** Added supplier fields, `status` column, composite unique constraint. `lot_no` is strictly VARCHAR.

---

### 2.3 INWARD
```sql
CREATE TABLE inward (
    inward_id       BIGSERIAL    PRIMARY KEY,
    pack_id         VARCHAR(60)  NOT NULL REFERENCES print_master(pack_id),
    item_code       VARCHAR(20)  NOT NULL REFERENCES rm_master(item_code),
    item_name       VARCHAR(200) NOT NULL,
    lot_no          VARCHAR(30)  NOT NULL,
    bag_no          INTEGER      NOT NULL,
    qty             NUMERIC(12,3) NOT NULL,
    uom             VARCHAR(10)  NOT NULL,
    warehouse       VARCHAR(100) NOT NULL,
    inward_date     DATE         NOT NULL,
    inward_time     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    transacted_by   VARCHAR(100),
    batch_id        VARCHAR(40),                     -- Groups a bulk scan session
    is_legacy       BOOLEAN      DEFAULT FALSE,       -- TRUE for imported records
    UNIQUE (pack_id)                                 -- A pack can only be inwarded once
);
```

**Changes vs spec:** Added `inward_date` (separate from timestamp for filtering), `batch_id` (links all bags from one scan session), `is_legacy` flag.

---

### 2.4 CONTAINER_MASTER
```sql
CREATE TABLE container_master (
    container_id    VARCHAR(30)  PRIMARY KEY,
    item_code       VARCHAR(20)  NOT NULL REFERENCES rm_master(item_code),
    item_name       VARCHAR(200) NOT NULL,
    capacity        NUMERIC(12,3),
    current_qty     NUMERIC(12,3) NOT NULL DEFAULT 0,
    uom             VARCHAR(10)  NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'EMPTY'
                    CHECK (status IN ('EMPTY', 'ACTIVE', 'INACTIVE')),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (item_code)                               -- One container per item (enforced)
);
```

---

### 2.5 RECIPE_DB
```sql
CREATE TABLE recipe_db (
    recipe_id       BIGSERIAL    PRIMARY KEY,
    product_code    VARCHAR(30)  NOT NULL,
    product_name    VARCHAR(200) NOT NULL,
    batch_unit      VARCHAR(10)  NOT NULL,            -- UOM of batch_size (Kg, L, Nos)
    rm_code         VARCHAR(20)  NOT NULL REFERENCES rm_master(item_code),
    rm_name         VARCHAR(200) NOT NULL,
    qty_per_unit    NUMERIC(12,4) NOT NULL,
    uom             VARCHAR(10)  NOT NULL,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (product_code, rm_code)
);
```

---

### 2.6 INDENT_MASTER
```sql
CREATE TABLE indent_master (
    indent_id       VARCHAR(30)  PRIMARY KEY,         -- e.g. IND-2026-001
    product_code    VARCHAR(30)  NOT NULL,
    product_name    VARCHAR(200) NOT NULL,
    batch_size      NUMERIC(12,3) NOT NULL,
    batch_unit      VARCHAR(10)  NOT NULL,
    plant           VARCHAR(100),
    di_no           VARCHAR(100),                     -- BOM reference (free text, no parsing)
    status          VARCHAR(20)  NOT NULL DEFAULT 'OPEN'
                    CHECK (status IN ('OPEN', 'PARTIAL', 'COMPLETE', 'CANCELLED')),
    created_by      VARCHAR(100),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    closed_at       TIMESTAMPTZ
);
```

---

### 2.7 INDENT_DETAILS
```sql
CREATE TABLE indent_details (
    detail_id       BIGSERIAL    PRIMARY KEY,
    indent_id       VARCHAR(30)  NOT NULL REFERENCES indent_master(indent_id),
    rm_code         VARCHAR(20)  NOT NULL REFERENCES rm_master(item_code),
    rm_name         VARCHAR(200) NOT NULL,
    qty_per_unit    NUMERIC(12,4) NOT NULL,
    required_qty    NUMERIC(12,3) NOT NULL,
    issued_qty      NUMERIC(12,3) NOT NULL DEFAULT 0,
    balance_qty     NUMERIC(12,3) GENERATED ALWAYS AS (required_qty - issued_qty) STORED,
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'PARTIAL', 'COMPLETE')),
    UNIQUE (indent_id, rm_code)
);
```

**Change vs spec:** `balance_qty` is a computed column — zero manual calculation.

---

### 2.8 OUTWARD
```sql
CREATE TABLE outward (
    outward_id      BIGSERIAL    PRIMARY KEY,
    transaction_type VARCHAR(30) NOT NULL
                    CHECK (transaction_type IN (
                        'BOM_ISSUANCE',
                        'PACK_REDUCTION',
                        'STOCK_RECON',
                        'WAREHOUSE_TRANSFER',    -- added from live data
                        'JOB_WORK'               -- added from live data
                    )),
    source_id       VARCHAR(60)  NOT NULL,        -- pack_id or container_id
    source_type     VARCHAR(20)  NOT NULL CHECK (source_type IN ('PACK', 'CONTAINER')),
    destination_id  VARCHAR(60),                  -- container_id for PACK_REDUCTION
    rm_code         VARCHAR(20)  NOT NULL REFERENCES rm_master(item_code),
    qty_issued      NUMERIC(12,3) NOT NULL,
    uom             VARCHAR(10)  NOT NULL,
    indent_id       VARCHAR(30)  REFERENCES indent_master(indent_id),
    destination     VARCHAR(200),                 -- Dept / Plant / Warehouse
    bom_ref         VARCHAR(100),                 -- Free text BOM reference
    remarks         TEXT,
    transacted_by   VARCHAR(100),
    is_legacy       BOOLEAN      DEFAULT FALSE,
    timestamp       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

**Changes vs spec:** Added `WAREHOUSE_TRANSFER`, `JOB_WORK`, `destination` field, `bom_ref` as free text, `is_legacy` flag.

---

### 2.9 STOCK_LEDGER (Immutable — Append Only)
```sql
CREATE TABLE stock_ledger (
    ledger_id       BIGSERIAL    PRIMARY KEY,
    item_code       VARCHAR(20)  NOT NULL REFERENCES rm_master(item_code),
    source_id       VARCHAR(60)  NOT NULL,        -- pack_id, container_id, or 'ADJUSTMENT'
    source_type     VARCHAR(20)  NOT NULL,
    transaction_type VARCHAR(30) NOT NULL,
    in_qty          NUMERIC(12,3) NOT NULL DEFAULT 0,
    out_qty         NUMERIC(12,3) NOT NULL DEFAULT 0,
    balance         NUMERIC(12,3) NOT NULL,       -- Running balance AT THIS POINT IN TIME
    reference       VARCHAR(200),                 -- Indent ID, BOM ref, remarks
    transacted_by   VARCHAR(100),
    is_legacy       BOOLEAN      DEFAULT FALSE,
    timestamp       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Immutability enforcement
CREATE RULE no_update_ledger AS ON UPDATE TO stock_ledger DO INSTEAD NOTHING;
CREATE RULE no_delete_ledger AS ON DELETE TO stock_ledger DO INSTEAD NOTHING;

-- Performance indexes
CREATE INDEX idx_ledger_item_time ON stock_ledger(item_code, timestamp DESC);
CREATE INDEX idx_ledger_source ON stock_ledger(source_id);
```

**Critical addition:** `balance` is stored at write time — this is a running balance, not calculated. Querying "balance as of date X" is always O(1): just find the last ledger row for that item before date X.

---

### 2.10 PACK_BALANCE (Derived — Maintained by Triggers)
```sql
CREATE TABLE pack_balance (
    pack_id         VARCHAR(60)  PRIMARY KEY REFERENCES print_master(pack_id),
    item_code       VARCHAR(20)  NOT NULL,
    original_qty    NUMERIC(12,3) NOT NULL,
    issued_qty      NUMERIC(12,3) NOT NULL DEFAULT 0,
    remaining_qty   NUMERIC(12,3) NOT NULL,
    is_exhausted    BOOLEAN      NOT NULL DEFAULT FALSE,
    last_updated    TIMESTAMPTZ  DEFAULT NOW()
);
```

**New table (not in spec):** This is essential for the auto-allocation engine. When scanning a pack for BOM issuance, the system needs to instantly know how much is left in that pack without scanning the entire outward ledger each time.

---

### 2.11 INWARD_SESSION (Bulk Scan Buffer)
```sql
CREATE TABLE inward_session (
    session_id      VARCHAR(40)  PRIMARY KEY,     -- UUID
    item_code       VARCHAR(20)  NOT NULL,
    lot_no          VARCHAR(30)  NOT NULL,
    warehouse       VARCHAR(100) NOT NULL,
    expected_bags   INTEGER      NOT NULL,
    scanned_pack_ids TEXT[]      NOT NULL DEFAULT '{}',
    session_status  VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                    CHECK (session_status IN ('ACTIVE', 'SUBMITTED', 'ABANDONED')),
    created_by      VARCHAR(100),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    submitted_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ  DEFAULT NOW() + INTERVAL '4 hours'
);
```

**New table (not in spec):** Session state for the bulk scan flow lives in the database, not memory. This means an operator can close their browser and resume the same session. It also handles server restarts gracefully.

---

## SECTION 3 — FINAL API DESIGN

### Original APIs (retained with corrections)
```
POST   /api/packs/generate           - Generate pack IDs + QR codes
POST   /api/inward/session/create    - Start a bulk inward scan session
POST   /api/inward/session/scan      - Add a pack to the session buffer
GET    /api/inward/session/:id       - Get session status (scanned/pending)
POST   /api/inward/session/submit    - Final commit of all scanned packs
POST   /api/indent/create            - Create indent from BOM
POST   /api/outward/bom/scan         - Scan pack for BOM issuance (auto-allocate)
POST   /api/outward/pack-reduction   - Pack → Container transfer
POST   /api/outward/stock-adjustment - Stock recon with mandatory remarks
POST   /api/outward/warehouse-transfer - Pack → different warehouse
POST   /api/outward/job-work         - Issue to job work (no BOM)
POST   /api/import/packs             - Bulk import Print Master from Excel
POST   /api/import/inward            - Bulk import Inward history from Excel
POST   /api/import/outward           - Bulk import Outward history from Excel
GET    /api/stock                    - Current stock summary (from ledger)
GET    /api/stock/:item_code         - Item-level detail with pack-level breakdown
GET    /api/ledger                   - Full stock ledger (paginated, filterable)
GET    /api/packs/:pack_id           - Pack status + history
GET    /api/containers               - Container status
```

---

## SECTION 4 — FINAL SYSTEM FLOW DIAGRAMS

### FLOW A — Pack Generation (Print Master)

```
USER INPUT
├── Select Item (dropdown from RM_MASTER)
├── Enter Lot No (text — warn if lot already exists for this item)
├── Enter Number of Bags
├── Enter Qty per Bag
└── Enter Supplier / Invoice / Date (optional but recommended)

BACKEND VALIDATION
├── item_code exists in rm_master → ✅
├── lot_no + item_code + bag_no combination → unique check → ✅
└── Bag numbers calculated: 001 → N (sequential from last used + 1 for this lot)

GENERATION
├── LBL = first 3 alphanumeric chars of item_name (uppercase)
├── PACK_ID = {LBL}-{ITEM_CODE}-{YEAR}-{LOT_NO}-{BAG_NO_ZERO_PADDED}
│   ⚠️  If lot_no contains hyphens: REPLACE with underscore in Pack ID only
│       (database stores original lot_no)
├── Insert N rows into print_master (status = AWAITING_INWARD)
└── Return QR codes (PNG) for label printing
```

---

### FLOW B — Inward (Bulk Scan Mode)

```
STEP 1: SESSION SETUP
├── User selects: Item | Lot No | Warehouse
├── System queries: print_master WHERE item_code=X AND lot_no=Y AND status='AWAITING_INWARD'
├── Expected bags = COUNT of above
├── Session created in inward_session table (UUID)
└── Screen shows: Expected=N | Scanned=0 | Pending=N

STEP 2: CONTINUOUS SCAN LOOP
For each QR scan:
├── Extract PACK_ID from QR
├── Validate: pack_id EXISTS in print_master → else ❌ "Pack not registered"
├── Validate: pack_id status = 'AWAITING_INWARD' → else ❌ "Already inwarded"
├── Validate: pack_id belongs to this session's item+lot → else ❌ "Wrong item/lot"
├── Validate: pack_id NOT in session.scanned_pack_ids → else ❌ "Already scanned this session"
│
├── ✅ VALID → Append to session.scanned_pack_ids
└── Screen updates instantly: Scanned table ↑ | Pending list ↓

STEP 3: COMPLETION GATE
├── Submit button DISABLED while scanned_count < expected_bags
└── Optional: Allow submit with < expected if user confirms "Partial Inward"

STEP 4: COMMIT
├── BEGIN TRANSACTION
├── Bulk INSERT into inward (all scanned packs)
├── Bulk UPDATE print_master status → 'INWARDED'
├── Bulk INSERT into pack_balance (original_qty = pack_qty, remaining = pack_qty)
├── Bulk INSERT into stock_ledger (IN entries, running balance updated)
├── UPDATE inward_session status → 'SUBMITTED'
└── COMMIT
     │
     └── All-or-nothing. Partial failure → full rollback → retry from Step 1
```

---

### FLOW C — Outward: BOM Issuance (Auto-Allocation Engine)

```
STEP 1: SELECT INDENT
├── User picks from open indents
└── System loads indent_details with balance_qty per RM

STEP 2: SELECT RM TO ISSUE
├── User taps an RM row (e.g., "Ascorbic Acid — Required: 75 Kg — Issued: 25 Kg — Balance: 50 Kg")
└── System enters SCAN MODE for that specific item_code

STEP 3: AUTO-ALLOCATION SCAN LOOP
State: remaining_to_issue = balance_qty (e.g., 50 Kg)

For each QR scan:
├── Validate: pack_id in inward (status = INWARDED) → else ❌ "Not inwarded"
├── Validate: pack_balance.is_exhausted = FALSE → else ❌ "Pack exhausted"
├── Validate: pack_id item_code = selected RM → else ❌ "Wrong item"
│
├── available = pack_balance.remaining_qty
├── deduct  = MIN(available, remaining_to_issue)
│
├── CREATE outward record (qty = deduct)
├── UPDATE pack_balance (issued_qty += deduct, remaining -= deduct)
│    └── If remaining = 0 → mark is_exhausted = TRUE
├── UPDATE indent_details (issued_qty += deduct)
├── INSERT stock_ledger (OUT entry)
├── remaining_to_issue -= deduct
│
├── Screen shows: Deducted {deduct} Kg | Still needed: {remaining_to_issue} Kg
│
└── IF remaining_to_issue = 0 → AUTO STOP scan mode
     └── "✅ Fully issued — RM complete"

PARTIAL PACK EXAMPLE:
  Required = 32 Kg
  Scan Pack1 (25 Kg available) → deduct 25 → remaining = 7
  Scan Pack2 (25 Kg available) → deduct ONLY 7 → remaining = 0 → STOP
  Pack2 still has 18 Kg remaining (not exhausted)
```

---

### FLOW D — Outward: Pack Size Reduction (Pack → Container)

```
STEP 1: Scan PACK_ID
├── System identifies item from pack_id
├── Loads container_master for that item_code (auto-selected)
└── Shows: Pack Qty remaining | Container current_qty

STEP 2: Enter Qty to transfer
├── Validate: qty ≤ pack_balance.remaining_qty
└── Validate: qty ≤ (container.capacity - container.current_qty) [if capacity set]

STEP 3: COMMIT
├── INSERT outward (type=PACK_REDUCTION, source=pack_id, destination=container_id)
├── UPDATE pack_balance (issued_qty += qty)
├── UPDATE container_master (current_qty += qty, status='ACTIVE')
├── INSERT stock_ledger: PACK OUT + CONTAINER IN (two entries)
└── Screen confirms: "Transferred {qty} Kg from {pack_id} → {container_id}"
```

---

### FLOW E — Warehouse Transfer

```
STEP 1: Scan PACK_ID
STEP 2: Select destination warehouse
STEP 3: COMMIT
├── INSERT outward (type=WAREHOUSE_TRANSFER, destination=new_warehouse)
├── UPDATE inward record: warehouse = new_warehouse
├── INSERT stock_ledger: OUT from old warehouse ref, IN at new warehouse ref
└── Pack remains active (not exhausted)
```

---

### FLOW F — Legacy Data Import

```
USER: Upload Excel file (QR- INVENTORY SYSTEM (9).xlsx)

STEP 1: PARSE & VALIDATE
├── Read PRINT MASTER sheet
│    ├── Normalize lot_no: strip date artefacts (e.g. "2627-01-01 00:00:00" → "2627/01")
│    ├── Validate pack_id uniqueness
│    └── Flag: SCANNED (will get inward record) | NOT SCANNED (print_master only)
│
├── Read INWARD sheet
│    ├── Match each pack_id to print_master
│    └── Flag is_legacy = TRUE
│
├── Read OUTWARD sheet
│    ├── Map transaction types to new enum values
│    │    "ISSUED TO PRODUCTION" → BOM_ISSUANCE
│    │    "WAREHOUSE TRANSFER" → WAREHOUSE_TRANSFER
│    │    "STOCK RECON ADJUSTMENT" → STOCK_RECON
│    │    "JOB WORK" → JOB_WORK
│    │    "PACK SIZE REDUCTION" → PACK_REDUCTION
│    └── Flag is_legacy = TRUE
│
├── Read STOCK sheet → derive RM_MASTER records
└── Read CONTAINER MASTER → seed container_master

STEP 2: PREVIEW REPORT (shown to user before commit)
├── Items to import: 768
├── Packs (Print Master): 4,455
├── Inward records: 3,988
├── Outward records: 1,084
├── Containers: 468
├── ⚠️ Lot no normalizations: X records
├── ⚠️ Negative stock items: 5 (Ammonium Molybdate, Cellulase, etc.) — will import as-is
└── ⚠️ Packs not yet inwarded: 467 — will be AWAITING_INWARD status

STEP 3: COMMIT (all in one transaction)
├── INSERT rm_master
├── INSERT print_master
├── INSERT inward (is_legacy=TRUE)
├── INSERT outward (is_legacy=TRUE)
├── REBUILD stock_ledger from scratch (replay all inward→out in timestamp order)
├── REBUILD pack_balance for all packs
└── SEED container_master

STEP 4: POST-IMPORT REPORT
├── Total records imported
├── Items with negative stock (list for manual reconciliation)
└── Packs awaiting inward (list)
```

---

## SECTION 5 — IDENTIFIED GAPS & RESOLUTIONS

| # | Gap | Risk | Resolution |
|---|---|---|---|
| 1 | Lot No contains hyphens — breaks Pack ID parsing | HIGH | Store lot_no as VARCHAR, Pack ID is label only |
| 2 | Excel lot_no auto-converted to dates | HIGH | Import normalises all lot_no to string |
| 3 | Negative stock in 5 items | MEDIUM | Import faithfully, ERP prevents going forward |
| 4 | JOB WORK and WAREHOUSE TRANSFER missing from spec | HIGH | Added to outward module and transaction_type enum |
| 5 | Supplier/Invoice/Batch fields missing from schema | MEDIUM | Added to print_master |
| 6 | Container ID malformed for items starting with digit/space | MEDIUM | LBL = first 3 alphanumeric chars only |
| 7 | BOM references inconsistently formatted | LOW | Stored as free-text VARCHAR, no parsing |
| 8 | No session persistence for bulk scan | HIGH | inward_session stored in DB, not memory |
| 9 | No pack_balance table — allocation engine needs it | CRITICAL | Added pack_balance table |
| 10 | balance_qty in indent_details was manual | HIGH | Made a computed (GENERATED) column |
| 11 | Stock ledger balance was uncomputed | CRITICAL | Running balance written at each INSERT |

---

## SECTION 6 — MOBILE / SCAN WORKFLOW VALIDATION

### Camera Feasibility (Mobile Browser)
- WebRTC via `getUserMedia()` works on: Chrome Android, Safari iOS 11+, Firefox Android
- **HTTPS is mandatory** — camera access blocked on HTTP by all browsers
- QR library: `jsQR` (lightweight, fast, pure JS) or `zxing-js/browser`
- Recommended frame rate: 10 fps is sufficient for hand-scan; 15–20 fps for conveyor
- Torch/flashlight: Available via `ImageCapture.setOptions({torch: true})` on Android

### Conveyor Scan Reality Check
- 500 bags in one session is achievable: each scan ≈ 50–200ms decode + 100ms API call
- At 3 bags/second, 500 bags = ~2.8 minutes — fully practical
- Network: POST per scan (150–200 bytes payload) → use `WebSocket` for sustained conveyor mode to eliminate HTTP handshake overhead

### Offline Resilience
- Session state in `inward_session` DB table means scan progress survives network drops
- If API call fails → local queue (IndexedDB) → retry on reconnect
- Duplicate scan protection: server-side check is authoritative

---

## SECTION 7 — TECH STACK RECOMMENDATION

| Layer | Technology | Reason |
|---|---|---|
| Database | PostgreSQL 16 | ACID, computed columns, immutable rules, JSONB for audit |
| Backend | Node.js + Fastify | Fast async I/O, excellent for WebSocket |
| ORM | Prisma | Type-safe, migration-based schema management |
| Frontend | React 18 + Vite | Per spec |
| QR Generation | `qrcode` npm package | Battle-tested, server-side PNG |
| QR Scanning | `jsQR` in browser | Lightweight, no WASM dependency |
| QR Label PDF | `PDFKit` or `jsPDF` | Server-side label generation |
| Import/Export | `xlsx` (SheetJS) | Excel parsing for legacy import |
| Auth | JWT + bcrypt | Stateless, mobile-compatible |
| Deployment | Docker Compose | PostgreSQL + Node in containers |

---

## SECTION 8 — WHAT IS VALIDATED ✅

1. ✅ Pack ID generation is globally unique via DB composite constraint
2. ✅ Inward session is persistent (DB-backed, not memory) — survives server restart
3. ✅ BOM auto-allocation stops at exactly required_qty (no human calculation)
4. ✅ Pack balance is tracked per-pack (not recalculated from ledger each time)
5. ✅ Stock ledger is immutable (DB RULE prevents UPDATE/DELETE)
6. ✅ Running balance is stored at write time (instant historical query)
7. ✅ Legacy import covers all 5 outward types from your live data
8. ✅ Negative stock items import faithfully with reconciliation report
9. ✅ 467 un-inwarded packs import as AWAITING_INWARD (no re-printing needed)
10. ✅ UOM (Kg + Nos) supported throughout
11. ✅ Supplier, invoice, batch code fields preserved from legacy data
12. ✅ Mobile camera workflow is technically validated and practical

---

## SECTION 9 — READY FOR BUILD

The architecture is now complete and hardened. Implementation order:

```
Phase 1:  Database schema + migrations
Phase 2:  Legacy data import pipeline (validate your 4,455 packs)
Phase 3:  RM Master + Print Master + QR generation
Phase 4:  Inward bulk scan module
Phase 5:  Stock ledger + dashboard
Phase 6:  Outward module (all 5 modes)
Phase 7:  Indent + Recipe DB
Phase 8:  Reports + export
```

**Respond with "BUILD" to proceed to code generation, starting with Phase 1.**
