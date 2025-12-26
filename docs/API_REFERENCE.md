# API Reference Guide

Chaster provides a RESTful API protected by Bearer Token authentication.
This guide provides common usage examples. For the full specification, visit the **Interactive API Docs** at `/api/docs` (Swagger UI) when the server is running.

## 🔐 Authentication

All requests must include the `Authorization` header:

```bash
Authorization: Bearer <your_api_token>
```

*(You can manage tokens in the Console or via `npm run token`)*

---

## 📦 Items API

### 1. Create Encrypted Item (Text)

```bash
curl -X POST http://localhost:3000/api/v1/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "content": "Secret Message 123",
    "durationMinutes": 60
  }'
```

### 2. Create Encrypted Item (Image)

*Images must be Base64 encoded.*

```bash
# MacOS/Linux: Convert image to base64
IMAGE_DATA=$(base64 -i my-image.jpg)

curl -X POST http://localhost:3000/api/v1/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"image\",
    \"content\": \"$IMAGE_DATA\",
    \"durationMinutes\": 1440,
    \"originalName\": \"my-image.jpg\"
  }"
```

### 3. Get Item Details (and Decrypt)

The server automatically attempts to decrypt if the time has passed.

```bash
curl -X GET http://localhost:3000/api/v1/items/ITEM_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Response (Locked):**
```json
{
  "id": "...",
  "unlocked": false,
  "timeRemainingMs": 3600000,
  "content": null
}
```

**Response (Unlocked):**
```json
{
  "id": "...",
  "unlocked": true,
  "content": "Secret Message 123"
}
```

---

## 🛡️ Admin API

### List All Tokens
```bash
curl -X GET http://localhost:3000/api/v1/admin/tokens \
  -H "Authorization: Bearer $TOKEN"
```

### Get System Stats
```bash
curl -X GET http://localhost:3000/api/v1/stats \
  -H "Authorization: Bearer $TOKEN"
```

---

## ⚠️ Notes

1.  **Time Precision**: Time locks are based on drand rounds (approx every 3 seconds).
2.  **Immutability**: Once an item is created, its standard unlock time cannot be *reduced*, only *extended*.
