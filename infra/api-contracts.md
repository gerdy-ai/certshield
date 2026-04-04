# API Contracts — CertShield

Agent 1 (Frontend) consumes these routes. Agent 2 (Backend) implements them.

## Dashboard

```
GET /api/dashboard/stats
Auth: required
Response: { total_subs: number, active_certs: number, expiring_soon: number, expired: number }
```

## Subcontractors

```
GET /api/subcontractors
Auth: required
Query: search?: string, status?: CertStatus, page?: number, limit?: number
Response: { data: Subcontractor[], total: number, page: number, limit: number }

POST /api/subcontractors
Auth: required
Body: { first_name: string, last_name: string, company_name: string, email: string, phone?: string }
Response: { data: Subcontractor & { upload_token: string } }

GET /api/subcontractors/[id]
Auth: required
Response: { data: Subcontractor & { certificates: Certificate[] } }

DELETE /api/subcontractors/[id]
Auth: required
Response: { success: true }
```

## Upload (PUBLIC)

```
POST /api/upload/[token]
Auth: NONE (public)
Body: multipart/form-data with PDF file
Response: { success: true, message: "Certificate received" }
```

## Certificates

```
GET /api/certificates
Auth: required
Query: status?: CertStatus, from?: string, to?: string, page?: number, limit?: number
Response: { data: Certificate[], total: number, page: number, limit: number }

GET /api/certificates/[id]/view
Auth: required
Response: { signed_url: string }
```

## Reminders

```
GET /api/reminders
Auth: required
Query: page?: number, limit?: number
Response: { data: ReminderLog[], total: number }

POST /api/reminders/send
Auth: required
Body: { certificate_id: string }
Response: { success: true }
```

## Settings

```
GET /api/settings
Auth: required
Response: Organization settings object

PATCH /api/settings
Auth: required
Body: Partial org settings
Response: { data: Organization }
```

## Billing

```
POST /api/billing/portal
Auth: required
Response: { url: string }

POST /api/webhooks/stripe
Auth: Stripe signature verification
Events: customer.subscription.created, updated, deleted, checkout.session.completed
```
