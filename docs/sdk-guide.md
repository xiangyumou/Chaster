# Chaster Client SDK Guide

This guide describes how to use the `@xymou/chaster-client` SDK to interact with the Chaster API.

## Installation

```bash
npm install @xymou/chaster-client
```

## Configuration

The SDK uses a singleton configuration pattern via the `OpenAPI` object.

### Basic Setup
Initialize the configuration at the root of your application (e.g., `main.ts`, `App.tsx`, or a dedicated `api.ts` file).

```typescript
import { OpenAPI } from '@xymou/chaster-client';

// 1. Set the Base URL to your Chaster instance
OpenAPI.BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.your-domain.com/v1';

// 2. Set Authentication Token
// You can set it as a static string:
OpenAPI.TOKEN = 'my-secret-token';

// OR as a dynamic function (useful if token changes or expires):
OpenAPI.TOKEN = async () => {
  const token = localStorage.getItem('api_token');
  return token || '';
};
```

## Making Requests

All API endpoints are grouped into Services. The methods are named after the operation (e.g., `Service.get`, `Service.create`).

### Items Service
Manage encrypted items.

```typescript
import { ItemsService } from '@xymou/chaster-client';

// Create a new item
const newItem = await ItemsService.create({
  content: "My Secret Data",
  delayMinutes: 60, // unlock in 1 hour
});

// Get an item status
const item = await ItemsService.get(newItem.id);

if (item.unlocked) {
  console.log("Decrypted Content:", item.content);
} else {
  console.log("Still locked! Remaining ms:", item.timeRemainingMs);
}
```

### Error Handling

The SDK throws `ApiError` when requests fail.

```typescript
import { ApiError, ItemsService } from '@xymou/chaster-client';

try {
  await ItemsService.get('invalid-id');
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error ${error.status}: ${error.message}`);
  }
}
```

## Advanced Usage

### Customizing Requests
You can intercept requests or customize headers globally.

```typescript
import { OpenAPI } from '@xymou/chaster-client';

OpenAPI.HEADERS = async () => {
  return {
    'X-Custom-Header': 'my-value',
    'Accept-Language': 'en-US'
  };
};
```
