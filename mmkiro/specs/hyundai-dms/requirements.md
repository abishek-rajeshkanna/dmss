# Requirements Document

## Introduction

The Hyundai Dealer Management System (DMS) is a full-stack web application built on Spring Boot 3.5 (Java 21) with a React TypeScript frontend. It enables dealership staff to manage vehicle inventory, customers, sales orders, service tickets, test drives, and payments through a role-based, secure interface. The system uses JWT authentication with refresh token rotation, bcrypt password hashing, Spring Cache, SLF4J/Logback logging, and exposes paginated, sortable REST APIs consumed by the React frontend.

---

## Glossary

- **DMS**: Dealer Management System — the application described in this document.
- **API**: The Spring Boot REST backend exposing JSON endpoints.
- **Frontend**: The React TypeScript single-page application.
- **JWT**: JSON Web Token used for stateless authentication.
- **Access_Token**: A short-lived (15-minute) JWT carrying user identity and role claims.
- **Refresh_Token**: A long-lived (7-day) opaque token stored as a SHA-256 hash in the `refresh_tokens` table, used to obtain new Access_Tokens.
- **RBAC**: Role-Based Access Control enforced by Spring Security.
- **Role**: One of `super_admin`, `admin`, `manager`, `salesperson`, `technician`, `receptionist` stored in `users.role`.
- **Dealership**: A physical car dealership represented by a row in the `dealerships` table.
- **User**: A staff member belonging to a Dealership with an assigned Role.
- **Customer**: A person tracked in the `customers` table, progressing through statuses: `lead → prospect → customer → lost`.
- **Vehicle**: A row in the `inventory` table identified by a unique VIN.
- **Order**: A vehicle sales transaction in the `orders` table with associated `order_items` and `payments`.
- **Service_Ticket**: A vehicle service or repair job in the `service_tickets` table with associated `service_items`.
- **Test_Drive**: A scheduled vehicle test drive in the `test_drives` table.
- **Audit_Log**: An immutable record of data-changing or security events in the `audit_logs` table.
- **Notification**: An in-app alert stored in the `notifications` table.
- **Cache**: Spring Cache abstraction backed by an in-memory provider (e.g., Caffeine).
- **Global_Exception_Handler**: A `@RestControllerAdvice` component that maps exceptions to structured JSON error responses.
- **PageRequest**: A Spring Data `Pageable` object carrying page number, page size, and sort parameters.

---

## Requirements

### Requirement 1: Application Configuration

**User Story:** As a developer, I want the application to be fully configured at startup, so that all features work without manual intervention.

#### Acceptance Criteria

1. THE DMS SHALL connect to a MySQL database using credentials supplied via `application.properties` (url, username, password, driver).
2. THE DMS SHALL configure Hibernate to validate the existing schema (`spring.jpa.hibernate.ddl-auto=validate`) and never modify it.
3. THE DMS SHALL configure SLF4J/Logback to write `INFO`-level logs to the console and `DEBUG`-level logs to a rolling file under `logs/dms.log`.
4. THE DMS SHALL configure Spring Cache with a Caffeine in-memory provider and define named caches for frequently read data (dealerships, inventory listings).
5. THE DMS SHALL expose all API endpoints under the `/api/v1` base path.

---

### Requirement 2: Authentication — Login and Token Issuance

**User Story:** As a staff member, I want to log in with my email and password, so that I receive tokens to access the system.

#### Acceptance Criteria

1. WHEN a `POST /api/v1/auth/login` request is received with a valid email and matching bcrypt password, THE API SHALL return an Access_Token (15-minute expiry) and a Refresh_Token (7-day expiry) in the response body.
2. WHEN a login request is received, THE API SHALL verify the user's `status` is `active` before issuing tokens; IF the status is `inactive` or `suspended`, THEN THE API SHALL return HTTP 403.
3. WHEN a login request is received, THE API SHALL check `users.locked_until`; IF the current time is before `locked_until`, THEN THE API SHALL return HTTP 423 with a message indicating the account is locked.
4. WHEN a login attempt fails due to incorrect password, THE API SHALL increment `users.failed_login_attempts` by 1 and record a `LOGIN_FAILED` event in `audit_logs`.
5. WHEN `users.failed_login_attempts` reaches 5, THE API SHALL set `users.locked_until` to `NOW() + 15 minutes`.
6. WHEN a login succeeds, THE API SHALL reset `users.failed_login_attempts` to 0, update `users.last_login`, and record a `LOGIN` event in `audit_logs`.
7. THE API SHALL store only the SHA-256 hash of the raw Refresh_Token in `refresh_tokens.token_hash`.
8. THE API SHALL include `sub` (user id), `role`, `dealership_id`, `iat`, and `exp` claims in every Access_Token.

---

### Requirement 3: Authentication — Token Refresh and Logout

**User Story:** As a staff member, I want my session to stay alive without re-entering credentials, so that I can work uninterrupted.

#### Acceptance Criteria

1. WHEN a `POST /api/v1/auth/refresh` request is received with a valid, non-expired, non-revoked Refresh_Token, THE API SHALL issue a new Access_Token and a new Refresh_Token (rotation) and revoke the old Refresh_Token.
2. IF the submitted Refresh_Token is expired or revoked, THEN THE API SHALL return HTTP 401.
3. WHEN a `POST /api/v1/auth/logout` request is received with a valid Access_Token, THE API SHALL revoke all Refresh_Tokens for that user and record a `LOGOUT` event in `audit_logs`.
4. THE API SHALL record `ip_address` and `user_agent` on every row inserted into `refresh_tokens`.

---

### Requirement 4: Authorization — Role-Based Access Control

**User Story:** As a system administrator, I want each role to access only the resources it is permitted to, so that data is protected.

#### Acceptance Criteria

1. THE API SHALL protect all endpoints except `POST /api/v1/auth/login` and `POST /api/v1/auth/refresh` with JWT validation via Spring Security.
2. THE API SHALL enforce the following minimum role permissions:
   - `super_admin`: full access to all endpoints including dealership management and user management across all dealerships.
   - `admin`: full access within their own dealership; cannot manage other dealerships.
   - `manager`: read/write access to customers, inventory, orders, service tickets, test drives, and payments within their dealership; read-only on users.
   - `salesperson`: read/write access to customers, test drives, and orders assigned to them; read-only on inventory.
   - `technician`: read/write access to service tickets assigned to them; read-only on inventory and customers.
   - `receptionist`: read/write access to customers and test drive scheduling; read-only on inventory.
3. IF a request is made to an endpoint the caller's role does not permit, THEN THE API SHALL return HTTP 403.
4. WHILE a user is authenticated, THE API SHALL scope all data queries to the user's `dealership_id` unless the role is `super_admin`.

---

### Requirement 5: Global Exception Handling and Validation

**User Story:** As a frontend developer, I want consistent, structured error responses, so that I can display meaningful messages to users.

#### Acceptance Criteria

1. THE Global_Exception_Handler SHALL return a JSON body with fields `timestamp`, `status`, `error`, and `message` for all error responses.
2. WHEN a request body fails Bean Validation (`@Valid`), THE Global_Exception_Handler SHALL return HTTP 400 with a `fieldErrors` map listing each invalid field and its violation message.
3. IF a requested resource is not found, THEN THE Global_Exception_Handler SHALL return HTTP 404.
4. IF an authenticated user attempts an unauthorized action, THEN THE Global_Exception_Handler SHALL return HTTP 403.
5. IF an unhandled exception occurs, THEN THE Global_Exception_Handler SHALL log the stack trace at ERROR level and return HTTP 500 with a generic message.
6. THE API SHALL validate all incoming request bodies using Jakarta Bean Validation annotations (`@NotBlank`, `@Email`, `@Size`, `@Min`, `@Max`, etc.) before processing.

---

### Requirement 6: Dealership Management

**User Story:** As a super_admin, I want to manage dealerships, so that I can onboard and maintain dealer locations.

#### Acceptance Criteria

1. THE API SHALL expose `GET /api/v1/dealerships` returning a paginated, sortable list of dealerships.
2. THE API SHALL expose `GET /api/v1/dealerships/{id}` returning a single dealership by id.
3. THE API SHALL expose `POST /api/v1/dealerships` allowing a `super_admin` to create a dealership; THE API SHALL validate that `email` and `license_no` are unique.
4. THE API SHALL expose `PUT /api/v1/dealerships/{id}` allowing a `super_admin` to update a dealership.
5. THE API SHALL expose `DELETE /api/v1/dealerships/{id}` allowing a `super_admin` to soft-delete (set `is_active=0`) a dealership.
6. WHEN a dealership is created or updated, THE API SHALL record an `INSERT` or `UPDATE` event in `audit_logs`.
7. THE Cache SHALL cache the dealership list and evict it on any create, update, or delete operation.

---

### Requirement 7: User Management

**User Story:** As an admin, I want to manage staff accounts within my dealership, so that I can control who has access.

#### Acceptance Criteria

1. THE API SHALL expose `GET /api/v1/users` returning a paginated, sortable list of users scoped to the caller's dealership (or all dealerships for `super_admin`).
2. THE API SHALL expose `POST /api/v1/users` allowing `admin` or `super_admin` to create a user; THE API SHALL hash the provided password with bcrypt (cost 12) before storing it.
3. THE API SHALL expose `PUT /api/v1/users/{id}` allowing `admin` or `super_admin` to update user details excluding `password_hash`.
4. THE API SHALL expose `PATCH /api/v1/users/{id}/status` allowing `admin` or `super_admin` to change a user's `status`.
5. THE API SHALL expose `DELETE /api/v1/users/{id}` allowing `admin` or `super_admin` to soft-delete a user by setting `status=inactive`.
6. WHEN a user's password is changed via `PATCH /api/v1/users/{id}/password`, THE API SHALL record a `PASSWORD_CHANGE` event in `audit_logs`.
7. THE API SHALL never return `password_hash` in any response body.

---

### Requirement 8: Customer Management

**User Story:** As a salesperson, I want to manage customer records and leads, so that I can track prospects through the sales funnel.

#### Acceptance Criteria

1. THE API SHALL expose `GET /api/v1/customers` returning a paginated, sortable list of customers scoped to the caller's dealership, with optional filters for `status` and `assigned_to`.
2. THE API SHALL expose `POST /api/v1/customers` allowing `salesperson`, `receptionist`, `manager`, `admin`, or `super_admin` to create a customer record.
3. THE API SHALL expose `PUT /api/v1/customers/{id}` allowing the assigned salesperson, manager, admin, or super_admin to update a customer record.
4. THE API SHALL expose `PATCH /api/v1/customers/{id}/status` to transition a customer's status among `lead`, `prospect`, `customer`, and `lost`.
5. THE API SHALL expose `DELETE /api/v1/customers/{id}` allowing `manager`, `admin`, or `super_admin` to soft-delete a customer by setting `status=lost`.
6. WHEN a customer record is created or updated, THE API SHALL record the event in `audit_logs`.

---

### Requirement 9: Vehicle Inventory Management

**User Story:** As a manager, I want to manage the vehicle inventory, so that staff can see what vehicles are available for sale or service.

#### Acceptance Criteria

1. THE API SHALL expose `GET /api/v1/inventory` returning a paginated, sortable list of vehicles with optional filters for `status`, `make`, `model`, `condition_type`, `fuel_type`, and price range.
2. THE API SHALL expose `GET /api/v1/inventory/{id}` returning full vehicle details.
3. THE API SHALL expose `POST /api/v1/inventory` allowing `manager`, `admin`, or `super_admin` to add a vehicle; THE API SHALL validate that `vin` is unique across the system.
4. THE API SHALL expose `PUT /api/v1/inventory/{id}` allowing `manager`, `admin`, or `super_admin` to update vehicle details.
5. THE API SHALL expose `PATCH /api/v1/inventory/{id}/status` to change a vehicle's status among `available`, `reserved`, `sold`, `in_service`, and `test_drive`.
6. WHEN a vehicle's `status`, `selling_price`, or `cost_price` changes, THE API SHALL insert a row into `inventory_history` recording the field name, old value, new value, and the user who made the change.
7. THE Cache SHALL cache the inventory listing and evict it on any create, update, or status change.

---

### Requirement 10: Test Drive Management

**User Story:** As a receptionist or salesperson, I want to schedule and track test drives, so that customers can experience vehicles before purchasing.

#### Acceptance Criteria

1. THE API SHALL expose `GET /api/v1/test-drives` returning a paginated list of test drives filterable by `status`, `customer_id`, and `inventory_id`.
2. THE API SHALL expose `POST /api/v1/test-drives` allowing `receptionist`, `salesperson`, `manager`, `admin`, or `super_admin` to schedule a test drive; THE API SHALL validate that the vehicle's status is `available` or `test_drive` at the time of scheduling.
3. THE API SHALL expose `PATCH /api/v1/test-drives/{id}/status` to transition a test drive through `scheduled → ongoing → completed` or `scheduled → cancelled` or `scheduled → no_show`.
4. WHEN a test drive status changes to `ongoing`, THE API SHALL set `started_at` to the current timestamp.
5. WHEN a test drive status changes to `completed`, THE API SHALL set `returned_at` to the current timestamp.
6. THE API SHALL expose `PUT /api/v1/test-drives/{id}` to update feedback, rating, and notes on a completed test drive.

---

### Requirement 11: Sales Order Management

**User Story:** As a salesperson, I want to create and manage sales orders, so that vehicle purchases are tracked from draft to delivery.

#### Acceptance Criteria

1. THE API SHALL expose `GET /api/v1/orders` returning a paginated, sortable list of orders filterable by `status`, `customer_id`, and date range.
2. THE API SHALL expose `POST /api/v1/orders` allowing `salesperson`, `manager`, `admin`, or `super_admin` to create an order in `draft` status with at least one `order_items` entry.
3. WHEN an order is created with a vehicle line item, THE API SHALL verify the vehicle's inventory status is `available` and set it to `reserved`.
4. THE API SHALL expose `PUT /api/v1/orders/{id}` to update order details while the order is in `draft` status.
5. THE API SHALL expose `PATCH /api/v1/orders/{id}/status` to transition an order through `draft → confirmed → processing → delivered` or `draft/confirmed → cancelled`.
6. WHEN an order status changes to `delivered`, THE API SHALL set the vehicle's inventory status to `sold`.
7. WHEN an order status changes to `cancelled`, THE API SHALL set the vehicle's inventory status back to `available`.
8. THE API SHALL compute `subtotal`, `tax_amount`, and `total_amount` server-side from `order_items` and the configured `tax_rate`; THE API SHALL not accept these fields from the client.
9. WHEN an order is created or its status changes, THE API SHALL record the event in `audit_logs`.

---

### Requirement 12: Payment Management

**User Story:** As a manager, I want to record and track payments against orders, so that financial transactions are accurately captured.

#### Acceptance Criteria

1. THE API SHALL expose `GET /api/v1/payments` returning a paginated list of payments filterable by `order_id` and `status`.
2. THE API SHALL expose `POST /api/v1/payments` allowing `manager`, `admin`, or `super_admin` to record a payment against an order.
3. THE API SHALL expose `PATCH /api/v1/payments/{id}/status` to transition a payment status among `pending`, `completed`, `failed`, and `refunded`.
4. IF a payment is recorded for an order whose `total_amount` is already fully covered by `completed` payments, THEN THE API SHALL return HTTP 400 with a message indicating the order is already paid.
5. WHEN a payment is recorded, THE API SHALL set `recorded_by` to the authenticated user's id.

---

### Requirement 13: Service Ticket Management

**User Story:** As a technician or receptionist, I want to manage service tickets, so that vehicle repairs and maintenance are tracked end-to-end.

#### Acceptance Criteria

1. THE API SHALL expose `GET /api/v1/service-tickets` returning a paginated, sortable list of service tickets filterable by `status`, `priority`, `assigned_to`, and `customer_id`.
2. THE API SHALL expose `POST /api/v1/service-tickets` allowing `receptionist`, `manager`, `admin`, or `super_admin` to open a service ticket; THE API SHALL auto-generate a unique `ticket_number`.
3. THE API SHALL expose `PUT /api/v1/service-tickets/{id}` to update diagnosis, notes, and promised delivery date.
4. THE API SHALL expose `PATCH /api/v1/service-tickets/{id}/status` to transition a ticket through `received → diagnosed → in_progress → waiting_parts → completed → delivered` or `→ cancelled`.
5. THE API SHALL expose `POST /api/v1/service-tickets/{id}/items` to add parts or labor line items to a ticket.
6. WHEN a service item is added or removed, THE API SHALL recompute `total_parts`, `total_labor`, and `total_cost` on the parent `service_tickets` row.
7. WHEN a service ticket status changes to `completed`, THE API SHALL set `completed_at` to the current timestamp.
8. WHEN a service ticket status changes to `delivered`, THE API SHALL set `delivered_at` to the current timestamp.

---

### Requirement 14: Audit Logging

**User Story:** As an admin, I want every significant action to be logged, so that I can audit changes and security events.

#### Acceptance Criteria

1. THE API SHALL write to `audit_logs` for every `INSERT`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT`, `LOGIN_FAILED`, `PASSWORD_CHANGE`, and `TOKEN_REVOKE` event.
2. WHEN writing an audit log entry, THE API SHALL capture `user_id`, `dealership_id`, `action`, `table_name`, `record_id`, `old_values` (JSON), `new_values` (JSON), `ip_address`, and `user_agent`.
3. THE API SHALL expose `GET /api/v1/audit-logs` returning a paginated, sortable list of audit log entries accessible only to `admin` and `super_admin`.
4. THE API SHALL never allow audit log entries to be modified or deleted via the API.

---

### Requirement 15: Notifications

**User Story:** As a staff member, I want to receive in-app notifications for relevant events, so that I stay informed without checking every module.

#### Acceptance Criteria

1. THE API SHALL expose `GET /api/v1/notifications` returning the authenticated user's notifications, paginated, with unread items first.
2. THE API SHALL expose `PATCH /api/v1/notifications/{id}/read` to mark a single notification as read, setting `read_at` to the current timestamp.
3. THE API SHALL expose `PATCH /api/v1/notifications/read-all` to mark all of the authenticated user's unread notifications as read.
4. WHEN a new order is confirmed, THE API SHALL create a notification for the assigned manager.
5. WHEN a service ticket is assigned to a technician, THE API SHALL create a notification for that technician.
6. WHEN a test drive is scheduled, THE API SHALL create a notification for the assigned staff member.

---

### Requirement 16: Pagination and Sorting

**User Story:** As a frontend developer, I want all list endpoints to support pagination and sorting, so that the UI can render large datasets efficiently.

#### Acceptance Criteria

1. THE API SHALL accept `page` (0-based), `size` (default 20, max 100), `sort` (field name), and `direction` (`asc`/`desc`) query parameters on all list endpoints.
2. THE API SHALL return a response envelope containing `content` (array), `totalElements`, `totalPages`, `page`, and `size` for all paginated responses.
3. IF a `sort` field is not a valid column for the requested resource, THEN THE API SHALL return HTTP 400.
4. THE API SHALL apply dealership scoping before applying pagination so that page counts reflect only the caller's accessible data.

---

### Requirement 17: Caching

**User Story:** As a system operator, I want frequently read data to be cached, so that database load is reduced under concurrent usage.

#### Acceptance Criteria

1. THE Cache SHALL cache responses for `GET /api/v1/dealerships` and `GET /api/v1/dealerships/{id}` with a TTL of 10 minutes.
2. THE Cache SHALL cache responses for `GET /api/v1/inventory` with a TTL of 5 minutes.
3. WHEN a dealership or inventory record is created, updated, or deleted, THE Cache SHALL evict the relevant cache entries immediately.
4. THE DMS SHALL expose a `GET /api/v1/admin/cache/stats` endpoint accessible only to `super_admin` returning cache hit/miss statistics.

---

### Requirement 18: Logging

**User Story:** As a developer or operator, I want structured logs at appropriate levels, so that I can diagnose issues in production.

#### Acceptance Criteria

1. THE DMS SHALL log every inbound HTTP request at `INFO` level including method, URI, and response status code.
2. THE DMS SHALL log every JWT validation failure at `WARN` level including the reason (expired, invalid signature, malformed).
3. THE DMS SHALL log every unhandled exception at `ERROR` level with the full stack trace.
4. THE DMS SHALL log every audit event at `INFO` level with the action, table, and record id.
5. THE DMS SHALL use a rolling file appender that rotates daily and retains logs for 30 days.
6. THE DMS SHALL never log passwords, raw tokens, or full JWT payloads.

---

### Requirement 19: React TypeScript Frontend

**User Story:** As a dealership staff member, I want a responsive web interface, so that I can use the DMS from any device.

#### Acceptance Criteria

1. THE Frontend SHALL implement a login page that calls `POST /api/v1/auth/login`, stores the Access_Token in memory, and stores the Refresh_Token in an `httpOnly` cookie or secure localStorage.
2. THE Frontend SHALL silently refresh the Access_Token by calling `POST /api/v1/auth/refresh` before it expires (at the 14-minute mark).
3. THE Frontend SHALL implement dedicated pages for: Dashboard, Dealerships, Users, Customers, Inventory, Test Drives, Orders, Payments, Service Tickets, Notifications, and Audit Logs.
4. THE Frontend SHALL render paginated tables with sortable columns and filter controls on all list pages.
5. THE Frontend SHALL display role-appropriate navigation, hiding menu items the authenticated user's role cannot access.
6. THE Frontend SHALL validate all form inputs client-side before submission and display field-level error messages returned by the API.
7. WHEN an API call returns HTTP 401, THE Frontend SHALL attempt one token refresh; IF the refresh also fails, THEN THE Frontend SHALL redirect the user to the login page.
8. THE Frontend SHALL be responsive and render correctly on viewport widths from 375px (mobile) to 1920px (desktop).
