# API Reference Guide

Chaster provides a RESTful API protected by Bearer Token authentication.
This guide provides a comprehensive reference for integrating with Chaster.

**Base URL:** `http://localhost:3000/api/v1` (Adjust scheme and host as needed)

## 🔐 Authentication

All API requests (except `/api/health`) require a Bearer Token in the `Authorization` header.

```bash
Authorization: Bearer <your_api_token>
```

You can manage tokens via the Console, `npm run token`, or the Admin API.

---

## 📦 Items API

Core functionality for creating, retrieving, and managing encrypted items.

### 1. List Items

Retrieve a paginated list of items with optional filtering.

**Endpoint:** `GET /items`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | `string` | `all` | Filter by lock status: `all`, `locked`, `unlocked` |
| `type` | `string` | - | Filter by content type: `text` or `image` |
| `limit` | `integer`| `50` | Number of items to return (max 1000) |
| `offset` | `integer`| `0` | Number of items to skip |
| `sort` | `string` | `created_desc` | Sort order: `created_asc`, `created_desc`, `decrypt_asc`, `decrypt_desc` |

**Example:**
```bash
curl "http://localhost:3000/api/v1/items?status=locked&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Create Encrypted Item

Create a single encrypted item (Time Capsule).

**Endpoint:** `POST /items`

**Request Body:**

```json
{
  "type": "text",             // Required: "text" or "image"
  "content": "Secret...",     // Required: Text string or Base64 image data
  "durationMinutes": 60,      // Optional: Duration until unlock
  "decryptAt": 1735230000000, // Optional: Specific epoch timestamp (ms) to unlock
  "metadata": {               // Optional: JSON object for custom data
    "client_id": "123"
  }
}
```
*Note: Must provide either `durationMinutes` or `decryptAt`.*

**Example (Text):**
```bash
curl -X POST http://localhost:3000/api/v1/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "content": "Secret Message 123",
    "durationMinutes": 60,
    "metadata": { "tag": "personal" }
  }'
```

**Example (Image):**
```bash
# Images must be Base64 encoded strings
curl -X POST http://localhost:3000/api/v1/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "image",
    "content": "iVBORw0KGgoAAA...",
    "durationMinutes": 1440
  }'
```

### 3. Batch Create Items

Create multiple items in a single request. Max 50 items per batch.

**Endpoint:** `POST /items/batch`

**Request Body:** Array of Create Item objects.

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/items/batch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    { "type": "text", "content": "Msg 1", "durationMinutes": 10 },
    { "type": "text", "content": "Msg 2", "durationMinutes": 20 }
  ]'
```

### 4. Get Item Details (Retrieve/Decrypt)

Fetch item details. The server automatically attempts to decrypt the content if the unlock time has passed.

**Endpoint:** `GET /items/:id`

**Response (Locked):**
```json
{
  "id": "uuid-string",
  "type": "text",
  "unlocked": false,
  "timeRemainingMs": 3600000,
  "decryptAt": 1735230000000,
  "content": null,
  "metadata": { "tag": "personal" }
}
```

**Response (Unlocked):**
```json
{
  "id": "uuid-string",
  "type": "text",
  "unlocked": true,
  "content": "Secret Message 123",
  "metadata": { ... }
}
```

### 5. Extend Lock

Extend the duration of an existing encrypted item. This re-encrypts the data with a new time lock.

**Endpoint:** `POST /items/:id/extend`

**Request Body:**
```json
{
  "minutes": 30  // Required: Number of minutes to add
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/items/ITEM_ID/extend \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "minutes": 30 }'
```

### 6. Delete Item

Permanently remove an item from the database.

**Endpoint:** `DELETE /items/:id`

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/v1/items/ITEM_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🛡️ Admin API

Manage API access tokens and view system status.

### 1. List Tokens

**Endpoint:** `GET /admin/tokens`

### 2. Create Token

**Endpoint:** `POST /admin/tokens`

**Request Body:**
```json
{
  "name": "New App Token" // Required
}
```

**Response:**
```json
{
  "token": "tok_...",
  "name": "New App Token",
  "createdAt": 1234567890
}
```
*Note: The token is returned only once.*

### 3. Update Token Status

Enable or disable a specific token.

**Endpoint:** `PATCH /admin/tokens/:token`

**Request Body:**
```json
{
  "isActive": false // boolean
}
```

### 4. Revoke Token

Permanently delete a token.

**Endpoint:** `DELETE /admin/tokens/:token`

---

## 📊 System API

### 1. System Statistics

Get global statistics about stored items.

**Endpoint:** `GET /stats`

**Example Response:**
```json
{
  "totalItems": 100,
  "lockedItems": 80,
  "unlockedItems": 20,
  "byType": { "text": 90, "image": 10 },
  "avgLockDurationMinutes": 120
}
```

### 2. Health Check

Check if the API server is running. No authentication required.

**Endpoint:** `GET /api/health` (Note: Root path, not under `/v1`)

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 123.45,
  "timestamp": 1735230000000
}
```

---

## ⚠️ Integration Notes

1.  **Time Precision**: Time locks rely on drand rounds (approx. every 3 seconds). Do not expect millisecond-level precision for unlock times.
2.  **Immutability**: Once created, the unlock time can only be **extended**, never reduced.
3.  **Content Size**: Large Base64 images will increase payload size significantly. Consider request body size limits of your proxy/server (default Next.js limit is usually 4MB).
