# @xymou/chaster-client

Official TypeScript Client for the Chaster API.

## Documentation

For detailed usage instructions, configuration, and examples, please refer to the **[SDK Guide](https://github.com/xymou/chaster/blob/main/docs/sdk-guide.md)**.

## Quick Start

```typescript
import { OpenAPI, ItemsService } from '@xymou/chaster-client';

OpenAPI.BASE = 'https://api.your-chaster-instance.com/v1';

const item = await ItemsService.get('your-item-id');
```
