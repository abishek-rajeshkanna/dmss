-- ============================================================
--  DEALER MANAGEMENT SYSTEM — MySQL Schema
--  Includes: Auth (JWT + bcrypt), Audit, and all core tables
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO';

-- ─────────────────────────────────────────
--  1. DEALERSHIPS
-- ─────────────────────────────────────────
CREATE TABLE dealerships (
    id              INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    name            VARCHAR(150)        NOT NULL,
    address         TEXT                NOT NULL,
    city            VARCHAR(100)        NOT NULL,
    state           VARCHAR(100)        NOT NULL,
    postal_code     VARCHAR(20)         NOT NULL,
    country         VARCHAR(80)         NOT NULL DEFAULT 'India',
    phone           VARCHAR(20)         NOT NULL,
    email           VARCHAR(191)        NOT NULL,
    license_no      VARCHAR(100)        NOT NULL UNIQUE,
    website         VARCHAR(255)            NULL,
    is_active       TINYINT(1)          NOT NULL DEFAULT 1,
    created_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_dealership_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────
--  2. USERS  (managers, salespersons, technicians, admins)
--     Passwords are stored as bcrypt hashes (cost >= 12).
--     JWTs are stateless; only refresh tokens are stored here.
-- ─────────────────────────────────────────
CREATE TABLE users (
    id              INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    dealership_id   INT UNSIGNED        NOT NULL,
    manager_id      INT UNSIGNED            NULL,          -- self-ref: NULL for top-level managers
    first_name      VARCHAR(100)        NOT NULL,
    last_name       VARCHAR(100)        NOT NULL,
    email           VARCHAR(191)        NOT NULL,
    password_hash   VARCHAR(255)        NOT NULL,          -- bcrypt / argon2id output
    role            ENUM(
                        'super_admin',
                        'admin',
                        'manager',
                        'salesperson',
                        'technician',
                        'receptionist'
                    )                   NOT NULL DEFAULT 'salesperson',
    phone           VARCHAR(20)             NULL,
    profile_photo   VARCHAR(255)            NULL,
    status          ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
    last_login      TIMESTAMP               NULL,
    password_changed_at TIMESTAMP           NULL,
    failed_login_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    locked_until    TIMESTAMP               NULL,
    created_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_email (email),
    KEY idx_users_dealership (dealership_id),
    KEY idx_users_manager (manager_id),
    KEY idx_users_role (role),
    CONSTRAINT fk_users_dealership FOREIGN KEY (dealership_id) REFERENCES dealerships (id) ON DELETE RESTRICT,
    CONSTRAINT fk_users_manager    FOREIGN KEY (manager_id)    REFERENCES users (id)        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────
--  3. REFRESH TOKENS  (JWT refresh flow)
--     Access tokens are short-lived (15 min), stateless JWTs.
--     Refresh tokens are long-lived, stored as SHA-256 hashes.
--     On rotation, old token is revoked; new one inserted.
-- ─────────────────────────────────────────
CREATE TABLE refresh_tokens (
    id              BIGINT UNSIGNED     NOT NULL AUTO_INCREMENT,
    user_id         INT UNSIGNED        NOT NULL,
    token_hash      VARCHAR(64)         NOT NULL,          -- SHA-256 hex of the raw token
    expires_at      TIMESTAMP           NOT NULL,
    is_revoked      TINYINT(1)          NOT NULL DEFAULT 0,
    revoked_at      TIMESTAMP               NULL,
    ip_address      VARCHAR(45)             NULL,
    user_agent      VARCHAR(512)            NULL,
    created_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_token_hash (token_hash),
    KEY idx_rt_user (user_id),
    KEY idx_rt_expires (expires_at),
    CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────
--  4. CUSTOMERS
-- ─────────────────────────────────────────
CREATE TABLE customers (
    id              INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    dealership_id   INT UNSIGNED        NOT NULL,
    assigned_to     INT UNSIGNED            NULL,
    first_name      VARCHAR(100)        NOT NULL,
    last_name       VARCHAR(100)        NOT NULL,
    email           VARCHAR(191)            NULL,
    phone           VARCHAR(20)         NOT NULL,
    alternate_phone VARCHAR(20)             NULL,
    date_of_birth   DATE                    NULL,
    gender          ENUM('male','female','other','prefer_not_to_say') NULL,
    drivers_license VARCHAR(100)            NULL,
    address_line1   VARCHAR(255)            NULL,
    address_line2   VARCHAR(255)            NULL,
    city            VARCHAR(100)            NULL,
    state           VARCHAR(100)            NULL,
    postal_code     VARCHAR(20)             NULL,
    country         VARCHAR(80)             NULL DEFAULT 'India',
    source          ENUM('walk_in','referral','online','phone','event','other') NOT NULL DEFAULT 'walk_in',
    status          ENUM('lead','prospect','customer','lost') NOT NULL DEFAULT 'lead',
    notes           TEXT                    NULL,
    created_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_customers_dealership (dealership_id),
    KEY idx_customers_assigned (assigned_to),
    KEY idx_customers_status (status),
    KEY idx_customers_phone (phone),
    CONSTRAINT fk_customers_dealership  FOREIGN KEY (dealership_id) REFERENCES dealerships (id) ON DELETE RESTRICT,
    CONSTRAINT fk_customers_salesperson FOREIGN KEY (assigned_to)   REFERENCES users (id)        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────
--  5. VEHICLE INVENTORY
-- ─────────────────────────────────────────
CREATE TABLE inventory (
    id              INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    dealership_id   INT UNSIGNED        NOT NULL,
    vin             VARCHAR(17)         NOT NULL UNIQUE,
    make            VARCHAR(100)        NOT NULL,
    model           VARCHAR(100)        NOT NULL,
    variant         VARCHAR(100)            NULL,
    year            YEAR                NOT NULL,
    color           VARCHAR(60)             NULL,
    fuel_type       ENUM('petrol','diesel','electric','hybrid','cng','lpg') NOT NULL,
    transmission    ENUM('manual','automatic','amt','cvt') NOT NULL DEFAULT 'manual',
    body_type       ENUM('sedan','suv','hatchback','coupe','convertible','wagon','pickup','van','truck','other') NULL,
    mileage         INT UNSIGNED        NOT NULL DEFAULT 0,
    engine_cc       SMALLINT UNSIGNED       NULL,
    seating         TINYINT UNSIGNED        NULL,
    condition_type  ENUM('new','used','certified_pre_owned') NOT NULL DEFAULT 'new',
    status          ENUM('available','reserved','sold','in_service','test_drive') NOT NULL DEFAULT 'available',
    cost_price      DECIMAL(12,2)       NOT NULL,
    selling_price   DECIMAL(12,2)       NOT NULL,
    msrp            DECIMAL(12,2)           NULL,
    location        VARCHAR(100)            NULL,
    photos          JSON                    NULL,
    features        JSON                    NULL,
    notes           TEXT                    NULL,
    intake_date     DATE                NOT NULL DEFAULT (CURRENT_DATE),
    created_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_inventory_dealership (dealership_id),
    KEY idx_inventory_status (status),
    KEY idx_inventory_make_model (make, model),
    KEY idx_inventory_condition (condition_type),
    CONSTRAINT fk_inventory_dealership FOREIGN KEY (dealership_id) REFERENCES dealerships (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────
--  6. TEST DRIVES
-- ─────────────────────────────────────────
CREATE TABLE test_drives (
    id              INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    dealership_id   INT UNSIGNED        NOT NULL,
    customer_id     INT UNSIGNED        NOT NULL,
    inventory_id    INT UNSIGNED        NOT NULL,
    staff_id        INT UNSIGNED        NOT NULL,
    scheduled_at    DATETIME            NOT NULL,
    started_at      DATETIME                NULL,
    returned_at     DATETIME                NULL,
    odometer_before INT UNSIGNED            NULL,
    odometer_after  INT UNSIGNED            NULL,
    status          ENUM('scheduled','ongoing','completed','cancelled','no_show') NOT NULL DEFAULT 'scheduled',
    feedback        TEXT                    NULL,
    rating          TINYINT UNSIGNED        NULL,
    notes           TEXT                    NULL,
    created_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_td_dealership (dealership_id),
    KEY idx_td_customer (customer_id),
    KEY idx_td_inventory (inventory_id),
    KEY idx_td_staff (staff_id),
    KEY idx_td_scheduled (scheduled_at),
    CONSTRAINT fk_td_dealership  FOREIGN KEY (dealership_id) REFERENCES dealerships (id) ON DELETE RESTRICT,
    CONSTRAINT fk_td_customer    FOREIGN KEY (customer_id)   REFERENCES customers (id)   ON DELETE RESTRICT,
    CONSTRAINT fk_td_inventory   FOREIGN KEY (inventory_id)  REFERENCES inventory (id)   ON DELETE RESTRICT,
    CONSTRAINT fk_td_staff       FOREIGN KEY (staff_id)      REFERENCES users (id)       ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────
--  7. ORDERS
-- ─────────────────────────────────────────
CREATE TABLE orders (
    id              INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    dealership_id   INT UNSIGNED        NOT NULL,
    customer_id     INT UNSIGNED        NOT NULL,
    salesperson_id  INT UNSIGNED        NOT NULL,
    manager_id      INT UNSIGNED            NULL,
    order_number    VARCHAR(30)         NOT NULL UNIQUE,
    status          ENUM('draft','confirmed','processing','delivered','cancelled','returned') NOT NULL DEFAULT 'draft',
    order_date      DATE                NOT NULL DEFAULT (CURRENT_DATE),
    delivery_date   DATE                    NULL,
    subtotal        DECIMAL(14,2)       NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12,2)       NOT NULL DEFAULT 0.00,
    tax_rate        DECIMAL(5,2)        NOT NULL DEFAULT 18.00,
    tax_amount      DECIMAL(12,2)       NOT NULL DEFAULT 0.00,
    total_amount    DECIMAL(14,2)       NOT NULL DEFAULT 0.00,
    trade_in_value  DECIMAL(12,2)       NOT NULL DEFAULT 0.00,
    financing_amount DECIMAL(14,2)      NOT NULL DEFAULT 0.00,
    financing_term  TINYINT UNSIGNED        NULL,
    interest_rate   DECIMAL(5,2)            NULL,
    notes           TEXT                    NULL,
    cancellation_reason TEXT                NULL,
    created_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_orders_dealership (dealership_id),
    KEY idx_orders_customer (customer_id),
    KEY idx_orders_salesperson (salesperson_id),
    KEY idx_orders_status (status),
    KEY idx_orders_date (order_date),
    CONSTRAINT fk_orders_dealership   FOREIGN KEY (dealership_id)  REFERENCES dealerships (id) ON DELETE RESTRICT,
    CONSTRAINT fk_orders_customer     FOREIGN KEY (customer_id)    REFERENCES customers (id)   ON DELETE RESTRICT,
    CONSTRAINT fk_orders_salesperson  FOREIGN KEY (salesperson_id) REFERENCES users (id)       ON DELETE RESTRICT,
    CONSTRAINT fk_orders_manager      FOREIGN KEY (manager_id)     REFERENCES users (id)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────
--  8. ORDER ITEMS
-- ─────────────────────────────────────────
CREATE TABLE order_items (
    id              INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    order_id        INT UNSIGNED        NOT NULL,
    inventory_id    INT UNSIGNED            NULL,
    item_type       ENUM('vehicle','accessory','insurance','extended_warranty','finance_fee','other') NOT NULL DEFAULT 'vehicle',
    description     VARCHAR(255)        NOT NULL,
    unit_price      DECIMAL(12,2)       NOT NULL,
    quantity        TINYINT UNSIGNED    NOT NULL DEFAULT 1,
    discount        DECIMAL(10,2)       NOT NULL DEFAULT 0.00,
    line_total      DECIMAL(14,2)       NOT NULL,
    PRIMARY KEY (id),
    KEY idx_oi_order (order_id),
    KEY idx_oi_inventory (inventory_id),
    CONSTRAINT fk_oi_order     FOREIGN KEY (order_id)     REFERENCES orders (id)    ON DELETE CASCADE,
    CONSTRAINT fk_oi_inventory FOREIGN KEY (inventory_id) REFERENCES inventory (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────
--  9. PAYMENTS
-- ─────────────────────────────────────────
CREATE TABLE payments (
    id              INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    order_id        INT UNSIGNED        NOT NULL,
    recorded_by     INT UNSIGNED            NULL,
    amount          DECIMAL(12,2)       NOT NULL,
    method          ENUM('cash','card','bank_transfer','upi','cheque','loan','other') NOT NULL,
    status          ENUM('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
    transaction_ref VARCHAR(191)            NULL,
    gateway         VARCHAR(100)            NULL,
    paid_at         TIMESTAMP               NULL,
    notes           TEXT                    NULL,
    created_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_payments_order (order_id),
    KEY idx_payments_status (status),
    CONSTRAINT fk_payments_order       FOREIGN KEY (order_id)    REFERENCES orders (id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_recorded_by FOREIGN KEY (recorded_by) REFERENCES users (id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────
--  10. SERVICE TICKETS
-- ─────────────────────────────────────────
CREATE TABLE service_tickets (
    id              INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    dealership_id   INT UNSIGNED        NOT NULL,
    ticket_number   VARCHAR(30)         NOT NULL UNIQUE,
    customer_id     INT UNSIGNED        NOT NULL,
    inventory_id    INT UNSIGNED        NOT NULL,
    assigned_to     INT UNSIGNED            NULL,
    created_by      INT UNSIGNED            NULL,
    service_type    ENUM('routine','repair','warranty','recall','inspection','body_work','other') NOT NULL DEFAULT 'routine',
    priority        ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
    status          ENUM('received','diagnosed','in_progress','waiting_parts','completed','cancelled','delivered') NOT NULL DEFAULT 'received',
    complaint       TEXT                NOT NULL,
    diagnosis       TEXT                    NULL,
    drop_off_at     DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    promised_at     DATETIME                NULL,
    completed_at    DATETIME                NULL,
    delivered_at    DATETIME                NULL,
    odometer_in     INT UNSIGNED            NULL,
    odometer_out    INT UNSIGNED            NULL,
    total_parts     DECIMAL(12,2)       NOT NULL DEFAULT 0.00,
    total_labor     DECIMAL(12,2)       NOT NULL DEFAULT 0.00,
    total_cost      DECIMAL(14,2)       NOT NULL DEFAULT 0.00,
    customer_approval TINYINT(1)        NOT NULL DEFAULT 0,
    notes           TEXT                    NULL,
    created_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_sv_dealership (dealership_id),
    KEY idx_sv_customer (customer_id),
    KEY idx_sv_inventory (inventory_id),
    KEY idx_sv_assigned (assigned_to),
    KEY idx_sv_status (status),
    CONSTRAINT fk_sv_dealership FOREIGN KEY (dealership_id) REFERENCES dealerships (id) ON DELETE RESTRICT,
    CONSTRAINT fk_sv_customer   FOREIGN KEY (customer_id)   REFERENCES customers (id)   ON DELETE RESTRICT,
    CONSTRAINT fk_sv_inventory  FOREIGN KEY (inventory_id)  REFERENCES inventory (id)   ON DELETE RESTRICT,
    CONSTRAINT fk_sv_technician FOREIGN KEY (assigned_to)   REFERENCES users (id)       ON DELETE SET NULL,
    CONSTRAINT fk_sv_created_by FOREIGN KEY (created_by)    REFERENCES users (id)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────
--  11. SERVICE ITEMS  (parts + labor per ticket)
-- ─────────────────────────────────────────
CREATE TABLE service_items (
    id              INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    ticket_id       INT UNSIGNED        NOT NULL,
    item_type       ENUM('part','labor','consumable','external') NOT NULL DEFAULT 'part',
    part_number     VARCHAR(100)            NULL,
    description     VARCHAR(255)        NOT NULL,
    unit_cost       DECIMAL(10,2)       NOT NULL,
    quantity        DECIMAL(8,2)        NOT NULL DEFAULT 1.00,
    line_total      DECIMAL(12,2)       NOT NULL,
    is_warranty     TINYINT(1)          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_si_ticket (ticket_id),
    CONSTRAINT fk_si_ticket FOREIGN KEY (ticket_id) REFERENCES service_tickets (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────
--  12. AUDIT LOGS
-- ─────────────────────────────────────────
CREATE TABLE audit_logs (
    id              BIGINT UNSIGNED     NOT NULL AUTO_INCREMENT,
    user_id         INT UNSIGNED            NULL,
    dealership_id   INT UNSIGNED            NULL,
    action          ENUM('INSERT','UPDATE','DELETE','LOGIN','LOGOUT','LOGIN_FAILED','PASSWORD_CHANGE','TOKEN_REVOKE') NOT NULL,
    table_name      VARCHAR(100)            NULL,
    record_id       INT UNSIGNED            NULL,
    old_values      JSON                    NULL,
    new_values      JSON                    NULL,
    ip_address      VARCHAR(45)             NULL,
    user_agent      VARCHAR(512)            NULL,
    created_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_al_user (user_id),
    KEY idx_al_table_record (table_name, record_id),
    KEY idx_al_created (created_at),
    CONSTRAINT fk_al_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────
--  13. INVENTORY HISTORY
-- ─────────────────────────────────────────
CREATE TABLE inventory_history (
    id              INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    inventory_id    INT UNSIGNED        NOT NULL,
    changed_by      INT UNSIGNED            NULL,
    field_name      VARCHAR(60)         NOT NULL,
    old_value       VARCHAR(500)            NULL,
    new_value       VARCHAR(500)            NULL,
    reason          VARCHAR(255)            NULL,
    created_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_ih_inventory (inventory_id),
    CONSTRAINT fk_ih_inventory FOREIGN KEY (inventory_id) REFERENCES inventory (id) ON DELETE CASCADE,
    CONSTRAINT fk_ih_user      FOREIGN KEY (changed_by)   REFERENCES users (id)     ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────
--  14. NOTIFICATIONS
-- ─────────────────────────────────────────
CREATE TABLE notifications (
    id              BIGINT UNSIGNED     NOT NULL AUTO_INCREMENT,
    user_id         INT UNSIGNED        NOT NULL,
    type            VARCHAR(80)         NOT NULL,
    title           VARCHAR(255)        NOT NULL,
    body            TEXT                    NULL,
    reference_type  VARCHAR(80)             NULL,
    reference_id    INT UNSIGNED            NULL,
    is_read         TINYINT(1)          NOT NULL DEFAULT 0,
    read_at         TIMESTAMP               NULL,
    created_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_notif_user_unread (user_id, is_read),
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
--  JWT + PASSWORD HASHING — Application Layer Guide
-- ============================================================
--
--  PASSWORD HASHING
--  -----------------
--  Use bcrypt (cost 12) or argon2id via your language's library.
--    Node.js : bcrypt.hash(password, 12)
--    PHP     : password_hash($pass, PASSWORD_BCRYPT, ['cost'=>12])
--    Python  : bcrypt.hashpw(password, bcrypt.gensalt(rounds=12))
--  Store the result in users.password_hash (VARCHAR 255).
--  Never store plaintext. Never log passwords.
--
--  JWT FLOW
--  ---------
--  Access Token  : short-lived (15 min), RS256 or HS256.
--    Payload     : { sub: user_id, role, dealership_id, iat, exp }
--    Stateless   : validated by signature, NOT stored in DB.
--
--  Refresh Token : long-lived (7-30 days), opaque random string.
--    Generation  : crypto.randomBytes(64).toString('hex')
--    Storage     : SHA-256 of raw token stored in refresh_tokens.token_hash
--    On use      : hash incoming token, look up by hash, check not revoked + not expired.
--    On rotation : set is_revoked=1 on old row, insert new row.
--    On logout   : revoke all tokens for user (or just current device).
--
--  ACCOUNT LOCKOUT
--  ----------------
--  Increment users.failed_login_attempts on each failure.
--  After N failures (e.g. 5): locked_until = NOW() + INTERVAL 15 MINUTE.
--  On success: reset failed_login_attempts = 0, update last_login.
--  Log every LOGIN / LOGIN_FAILED event in audit_logs.
-- ============================================================
