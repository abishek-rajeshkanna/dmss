# Implementation Plan: Hyundai Dealer Management System (DMS)

## Overview

Incremental implementation of the Spring Boot 3.5 / Java 21 backend for the Hyundai DMS. Each task builds on the previous, ending with all components wired together. The stack is: Spring Boot 3.5, Java 21, MySQL (existing schema — DO NOT modify), Spring Security, JPA/Hibernate, Lombok, JWT, Caffeine cache, SLF4J/Logback.

## Tasks

- [x] 1. Project dependencies, configuration, and base infrastructure
  - Add missing Maven dependencies to `pom.xml`: `spring-boot-starter-validation`, `spring-boot-starter-cache`, `com.github.ben-manes.caffeine:caffeine`, `io.jsonwebtoken:jjwt-api/impl/jackson`, `net.jqwik:jqwik` (test scope)
  - Configure `application.properties`: datasource (MySQL), JPA validate-only (`ddl-auto=validate`), cache, JWT secret/expiry, logging (console INFO + rolling file DEBUG under `logs/dms.log`, 30-day retention)
  - Create `CacheConfig.java` — define `dealerships` (TTL 10 min) and `inventory` (TTL 5 min) Caffeine caches
  - Create `LoggingConfig.java` — request/response logging filter (method, URI, status at INFO)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 2. JPA entities
  - [x] 2.1 Create all 14 JPA `@Entity` classes under `entity/` matching the existing schema exactly: `Dealership`, `User`, `RefreshToken`, `Customer`, `Inventory`, `TestDrive`, `Order`, `OrderItem`, `Payment`, `ServiceTicket`, `ServiceItem`, `AuditLog`, `InventoryHistory`, `Notification`
    - Use `@Enumerated(EnumType.STRING)` for all enum columns; JSON columns mapped as `String` with `@Column(columnDefinition = "json")`
    - Lombok `@Getter @Setter @NoArgsConstructor` on every entity; `@JsonIgnore` on `User.passwordHash`
    - _Requirements: 1.2, 7.7_

- [ ] 3. Exception hierarchy and Global Exception Handler
  - [x] 3.1 Create custom exception classes under `exception/`: `ResourceNotFoundException`, `AccessDeniedException`, `AccountLockedException`, `AccountInactiveException`, `InvalidTokenException`, `DuplicateResourceException`, `InvalidStatusTransitionException`, `OrderAlreadyPaidException`, `BusinessRuleException`
  - [x] 3.2 Create `GlobalExceptionHandler` (`@RestControllerAdvice`) mapping each exception to the correct HTTP status and the standard error envelope `{timestamp, status, error, message, fieldErrors}`
    - `MethodArgumentNotValidException` → 400 with `fieldErrors` map
    - `ResourceNotFoundException` → 404, `AccessDeniedException` → 403, `AccountLockedException` → 423, `InvalidTokenException` → 401, catch-all → 500 (log stack trace at ERROR)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ]* 3.3 Write unit tests for `GlobalExceptionHandler` — verify each exception type produces the correct HTTP status and envelope shape
    - _Requirements: 5.1, 5.2_

- [ ] 4. Security infrastructure — JWT and Spring Security
  - [x] 4.1 Create `JwtUtil` under `security/`
    - `generateAccessToken(UserDetails, long dealershipId)` — HS256, 15-min expiry, claims: `sub`, `role`, `dealership_id`, `iat`, `exp`
    - `generateRefreshToken()` — `SecureRandom` 64-byte hex string (raw); caller stores SHA-256 hash
    - `validateToken(String)` — throws `InvalidTokenException` subtypes on failure
    - `extractClaims(String)` → `Claims`
    - _Requirements: 2.7, 2.8, 3.1_
  - [ ]* 4.2 Write property test `JwtClaimsPropertyTest` — Property 6: for random users/roles/dealerships, every generated access token contains all five required claims
    - `// Feature: hyundai-dms, Property 6: Access token claims completeness`
    - _Requirements: 2.8_
  - [ ]* 4.3 Write property test `RefreshTokenHashPropertyTest` — Property 5: for random raw token strings, stored hash equals `HEX(SHA-256(rawToken))`
    - `// Feature: hyundai-dms, Property 5: Refresh token stored as hash`
    - _Requirements: 2.7_
  - [x] 4.4 Create `AuthenticatedUser` principal record carrying `userId`, `role`, `dealershipId`
  - [x] 4.5 Create `UserDetailsServiceImpl` loading `User` by email from the repository
  - [x] 4.6 Create `JwtAuthenticationFilter` (`OncePerRequestFilter`) — extract Bearer token, validate, set `AuthenticatedUser` in `SecurityContextHolder`; log WARN on failure with reason
    - _Requirements: 4.1, 18.2_
  - [x] 4.7 Create `SecurityConfig` — permit `POST /api/v1/auth/login` and `POST /api/v1/auth/refresh` without auth; require auth on all other paths; disable CSRF; stateless session; wire `JwtAuthenticationFilter`
    - _Requirements: 4.1, 4.3_

- [ ] 5. Checkpoint — Ensure application starts and security filter chain is active
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. AuditService and NotificationService
  - [x] 6.1 Create `AuditLog` repository and `AuditService` with `@Async` `log(AuditEvent)` method writing to `audit_logs`; capture `user_id`, `dealership_id`, `action`, `table_name`, `record_id`, `old_values`, `new_values`, `ip_address`, `user_agent`
    - Enable `@EnableAsync` in a config class
    - _Requirements: 14.1, 14.2_
  - [ ]* 6.2 Write property test `AuditLogCompletenessPropertyTest` — Property 25: for random data-mutation events, exactly one `audit_logs` row is produced with non-null `action`, `user_id`, `created_at`
    - `// Feature: hyundai-dms, Property 25: Audit log completeness`
    - _Requirements: 14.1_
  - [x] 6.3 Create `NotificationService` with `createForUser(Long userId, String type, String title, String body, String refType, Long refId)` writing to `notifications`
    - _Requirements: 15.4, 15.5, 15.6_

- [ ] 7. Authentication — login, refresh, logout
  - [x] 7.1 Create `AuthService` implementing login, refresh, logout
    - Login: verify `status=active` (→ 403), check `locked_until` (→ 423), verify bcrypt password, increment `failed_login_attempts` on failure + audit `LOGIN_FAILED`, lock after 5 failures, on success reset counter + update `last_login` + audit `LOGIN`, issue access + refresh tokens, store SHA-256 hash in `refresh_tokens` with `ip_address` and `user_agent`
    - Refresh: hash incoming token, look up, check not revoked/expired (→ 401), atomically revoke old + insert new, return new token pair
    - Logout: revoke all active refresh tokens for user, audit `LOGOUT`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4_
  - [ ]* 7.2 Write unit tests for `AuthService` — login happy path, locked account (423), inactive account (403), failed attempt counter increment, successful login resets state
    - _Requirements: 2.2, 2.3, 2.4, 2.6_
  - [ ]* 7.3 Write property test `TokenRotationPropertyTest` — Property 7: for any valid non-expired refresh token, calling refresh atomically revokes old and issues new; old token rejected on subsequent call
    - `// Feature: hyundai-dms, Property 7: Refresh token rotation`
    - _Requirements: 3.1, 3.2_
  - [x] 7.4 Create `AuthController` at `/api/v1/auth` — `POST /login`, `POST /refresh`, `POST /logout`; use `@Valid` on request bodies
    - _Requirements: 2.1, 3.1, 3.3_

- [ ] 8. Checkpoint — Auth flow end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Dealership management
  - [x] 9.1 Create `DealershipRepository` (Spring Data JPA) and `DealershipService` with `findAll(Pageable)` (`@Cacheable("dealerships")`), `findById` (`@Cacheable("dealership")`), `create` (`@CacheEvict`), `update` (`@CacheEvict`), `softDelete` (`@CacheEvict`); validate unique `email` and `license_no`; audit INSERT/UPDATE/DELETE
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  - [ ]* 9.2 Write property test `DealershipUniquenessPropertyTest` — Property 14: for any two dealership requests sharing email or license_no, the second create/update returns HTTP 400
    - `// Feature: hyundai-dms, Property 14: Dealership uniqueness invariant`
    - _Requirements: 6.3_
  - [ ]* 9.3 Write property test `CacheEvictionPropertyTest` (dealerships) — Property 15: after any create/update/delete, next read returns fresh data
    - `// Feature: hyundai-dms, Property 15: Cache eviction on mutation`
    - _Requirements: 6.7, 17.3_
  - [x] 9.4 Create `DealershipController` at `/api/v1/dealerships` — GET list, GET by id, POST, PUT, DELETE; `@PreAuthorize("hasRole('SUPER_ADMIN')")` on write endpoints
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 4.2_

- [ ] 10. User management
  - [x] 10.1 Create `UserRepository` and `UserService` — CRUD with dealership scoping, bcrypt password hashing (cost 12), soft-delete (`status=inactive`), password change audit `PASSWORD_CHANGE`; never return `password_hash`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
  - [x] 10.2 Create `UserController` at `/api/v1/users` — GET list, POST, PUT, PATCH status, DELETE, PATCH password; `@PreAuthorize` for `admin`/`super_admin` on write endpoints
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 4.2_

- [ ] 11. Customer management
  - [x] 11.1 Create `CustomerRepository` and `CustomerService` — CRUD with dealership scoping, status transitions (`lead→prospect→customer→lost`), audit on create/update
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  - [x] 11.2 Create `CustomerController` at `/api/v1/customers` — GET list (filter by `status`, `assigned_to`), POST, PUT, PATCH status, DELETE; `@PreAuthorize` per role matrix
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 4.2_

- [ ] 12. Vehicle inventory management
  - [x] 12.1 Create `InventoryRepository` and `InventoryService`
    - `findAll` with filters (`status`, `make`, `model`, `condition_type`, `fuel_type`, price range) + dealership scoping + `@Cacheable("inventory")`
    - `create` — validate VIN uniqueness; `@CacheEvict`
    - `update` — detect changes to `status`, `selling_price`, `cost_price`; insert `inventory_history` row per changed field; `@CacheEvict`
    - `changeStatus` — validate state machine transitions; insert `inventory_history`; `@CacheEvict`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  - [ ]* 12.2 Write property test `VinUniquenessPropertyTest` — Property 16: for any two inventory records with the same VIN, the second create returns HTTP 400
    - `// Feature: hyundai-dms, Property 16: VIN uniqueness invariant`
    - _Requirements: 9.3_
  - [ ]* 12.3 Write property test `InventoryHistoryPropertyTest` — Property 17: for random field changes to `status`/`selling_price`/`cost_price`, exactly one `inventory_history` row per changed field with correct `field_name`, `old_value`, `new_value`, `changed_by`
    - `// Feature: hyundai-dms, Property 17: Inventory history on field change`
    - _Requirements: 9.6_
  - [x] 12.4 Create `InventoryController` at `/api/v1/inventory` — GET list, GET by id, POST, PUT, PATCH status; `@PreAuthorize` per role matrix
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 4.2_

- [ ] 13. Checkpoint — Core CRUD modules complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Test drive management
  - [x] 14.1 Create `TestDriveRepository` and `TestDriveService` — schedule (validate vehicle `available`/`test_drive`), status transitions (`scheduled→ongoing→completed/cancelled/no_show`), set `started_at`/`returned_at` on transitions, update feedback/rating
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  - [x] 14.2 Create `TestDriveController` at `/api/v1/test-drives` — GET list (filter by `status`, `customer_id`, `inventory_id`), POST, PATCH status, PUT; `@PreAuthorize` per role matrix
    - _Requirements: 10.1, 10.2, 10.3, 4.2_

- [ ] 15. Sales order management
  - [x] 15.1 Create `OrderRepository`, `OrderItemRepository`, and `OrderService`
    - `create` — generate unique `order_number`, verify vehicle `available` → set `reserved`, compute totals server-side, audit INSERT
    - `computeTotals(List<OrderItem>, BigDecimal taxRate)` — `subtotal = sum(line_total)`, `tax_amount = subtotal * taxRate / 100`, `total_amount = subtotal + tax_amount - discount_amount`
    - `changeStatus` — enforce state machine; on `delivered` set vehicle `sold`; on `cancelled` set vehicle `available`; audit UPDATE
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9_
  - [ ]* 15.2 Write unit tests for `OrderService.computeTotals` — specific numeric examples covering subtotal, tax, total, discount
    - _Requirements: 11.8_
  - [ ]* 15.3 Write property test `OrderTotalPropertyTest` — Property 21: for random lists of order items and tax rates, server-computed totals satisfy the formula; client-supplied values are ignored
    - `// Feature: hyundai-dms, Property 21: Server-side order total computation`
    - _Requirements: 11.8_
  - [ ]* 15.4 Write property test for order-inventory state machine — Properties 18, 19, 20: order creation reserves vehicle; delivery marks sold; cancellation restores available
    - `// Feature: hyundai-dms, Property 18/19/20: Order-inventory status coupling`
    - _Requirements: 11.3, 11.6, 11.7_
  - [x] 15.5 Create `OrderController` at `/api/v1/orders` — GET list (filter by `status`, `customer_id`, date range), POST, PUT, PATCH status; `@PreAuthorize` per role matrix
    - _Requirements: 11.1, 11.2, 11.4, 11.5, 4.2_

- [ ] 16. Payment management
  - [x] 16.1 Create `PaymentRepository` and `PaymentService` — record payment (check overpayment → 400), status transitions (`pending→completed/failed/refunded`), set `recorded_by`
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - [ ]* 16.2 Write property test `OverpaymentPropertyTest` — Property 22: for any fully-paid order, recording an additional payment returns HTTP 400
    - `// Feature: hyundai-dms, Property 22: Overpayment prevention`
    - _Requirements: 12.4_
  - [x] 16.3 Create `PaymentController` at `/api/v1/payments` — GET list (filter by `order_id`, `status`), POST, PATCH status; `@PreAuthorize` per role matrix
    - _Requirements: 12.1, 12.2, 12.3, 4.2_

- [ ] 17. Service ticket management
  - [x] 17.1 Create `ServiceTicketRepository`, `ServiceItemRepository`, and `ServiceTicketService`
    - `create` — auto-generate unique `ticket_number` via `TicketNumberGenerator`
    - `addItem` — insert `service_items` row, recompute `total_parts`, `total_labor`, `total_cost` on parent ticket
    - `changeStatus` — enforce state machine; set `completed_at`/`delivered_at` on transitions; audit UPDATE
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_
  - [ ]* 17.2 Write unit tests for `ServiceTicketService` — cost recomputation after item add/remove with specific numeric examples
    - _Requirements: 13.6_
  - [ ]* 17.3 Write property test `ServiceTicketCostPropertyTest` — Property 24: for random lists of service items, `total_parts = sum(line_total for part/consumable)`, `total_labor = sum(line_total for labor)`, `total_cost = total_parts + total_labor`
    - `// Feature: hyundai-dms, Property 24: Service ticket cost recomputation`
    - _Requirements: 13.6_
  - [x] 17.4 Create `ServiceTicketController` at `/api/v1/service-tickets` — GET list (filter by `status`, `priority`, `assigned_to`, `customer_id`), POST, PUT, PATCH status, POST items; `@PreAuthorize` per role matrix
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 4.2_

- [ ] 18. Checkpoint — Business domain modules complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Audit log and notification endpoints
  - [x] 19.1 Create `AuditLogController` at `/api/v1/audit-logs` — GET list (paginated, sortable); `@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")`; no write endpoints
    - _Requirements: 14.3, 14.4_
  - [x] 19.2 Create `NotificationController` at `/api/v1/notifications` — GET list (unread first, paginated), PATCH `/{id}/read`, PATCH `/read-all`; scoped to authenticated user
    - _Requirements: 15.1, 15.2, 15.3_

- [ ] 20. Pagination, sorting, and RBAC cross-cutting concerns
  - [x] 20.1 Create `PaginationUtil` — build `PaginatedResponse<T>` from Spring `Page<T>`; validate `sort` field against allowed columns (→ 400 on invalid); enforce `size` max 100
    - _Requirements: 16.1, 16.2, 16.3, 16.4_
  - [ ]* 20.2 Write property test `PaginationEnvelopePropertyTest` — Property 26: for random `PageRequest` parameters across all list endpoints, response contains `content`, `totalElements`, `totalPages`, `page`, `size`
    - `// Feature: hyundai-dms, Property 26: Paginated response envelope`
    - _Requirements: 16.2_
  - [x] 20.3 Verify dealership scoping is applied in all repository queries for non-`super_admin` roles; add `@DataJpaTest` tests for scoping queries
    - _Requirements: 4.4, 16.4_
  - [ ]* 20.4 Write property test `DealershipScopingPropertyTest` — Property 11: for random non-super_admin users, all list responses contain only records matching the user's `dealership_id`
    - `// Feature: hyundai-dms, Property 11: Dealership data scoping`
    - _Requirements: 4.4, 16.4_
  - [ ]* 20.5 Write property test `RbacPropertyTest` — Property 10: for random role × endpoint combinations where the role is not permitted, the API returns HTTP 403 without executing business logic
    - `// Feature: hyundai-dms, Property 10: Role-based access enforcement`
    - _Requirements: 4.2, 4.3_

- [ ] 21. Admin endpoint and cache stats
  - [x] 21.1 Create `AdminController` at `/api/v1/admin` — `GET /cache/stats` returning Caffeine hit/miss statistics; `@PreAuthorize("hasRole('SUPER_ADMIN')")`
    - _Requirements: 17.4_

- [ ] 22. Error envelope and validation cross-cutting
  - [ ]* 22.1 Write property test `ErrorEnvelopePropertyTest` — Property 12: for any request producing a 4xx/5xx, response body contains `timestamp`, `status`, `error`, `message`
    - `// Feature: hyundai-dms, Property 12: Structured error envelope`
    - _Requirements: 5.1_
  - [ ]* 22.2 Write property test `ValidationErrorPropertyTest` — Property 13: for any request body failing Bean Validation, response is HTTP 400 with `fieldErrors` map keyed by field name
    - `// Feature: hyundai-dms, Property 13: Validation errors include field details`
    - _Requirements: 5.2, 5.6_

- [ ] 23. Notification triggers — wire business events to notifications
  - [x] 23.1 In `OrderService.changeStatus`, when status → `confirmed`, call `NotificationService.createForUser` for the assigned manager
    - _Requirements: 15.4_
  - [x] 23.2 In `ServiceTicketService.create`/`update`, when `assigned_to` is set, call `NotificationService.createForUser` for the technician
    - _Requirements: 15.5_
  - [x] 23.3 In `TestDriveService.create`, call `NotificationService.createForUser` for the assigned staff member
    - _Requirements: 15.6_

- [ ] 24. Final checkpoint — full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use jqwik with `@Property(tries = 100)` minimum
- The existing MySQL schema must never be modified — use `ddl-auto=validate`
- All list endpoints must apply dealership scoping before pagination
- Raw tokens and passwords must never appear in logs or responses
