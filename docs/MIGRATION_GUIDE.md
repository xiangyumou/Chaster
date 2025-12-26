# 数据库迁移指南

## 概述

本文档说明 Chaster 项目数据库架构的升级，主要变更为添加多用户支持的基础架构。

## 迁移版本

- **从版本**：单用户数据库（无 user_id 字段）
- **到版本**：多用户架构预留（包含 user_id 字段）
- **迁移时间**：2025-12-26

## 变更内容

### 1. items 表变更

#### 新增字段
- `user_id TEXT NOT NULL DEFAULT 'local'` - 用户标识字段

#### 新增索引
- `idx_items_user_id` - 用户ID索引
- `idx_items_user_decrypt` - 复合索引 (user_id, decrypt_at)

### 2. settings 表变更

####Schema 变更
- 主键从 `key` 改为 `(key, user_id)` 复合主键
- 新增 `user_id TEXT NOT NULL DEFAULT 'local'` 字段

## 自动迁移

迁移脚本已集成在 `src/lib/db.ts` 的 `initializeSchema()` 函数中，会在应用启动时自动执行。

### 迁移步骤

1. **检测现有列**
   - 检查 `items` 表是否已有 `user_id` 列
   - 检查 `settings` 表schema结构

2. **添加 user_id 列**（如不存在）
   ```sql
   ALTER TABLE items ADD COLUMN user_id TEXT NOT NULL DEFAULT 'local';
   ```

3. **迁移 settings 表**
   ```sql
   -- 创建新表结构
   CREATE TABLE settings_new (
     key TEXT NOT NULL,
     value TEXT NOT NULL,
     user_id TEXT NOT NULL DEFAULT 'local',
     PRIMARY KEY (key, user_id)
   );
   
   -- 迁移数据（所有现有数据归属 'local' 用户）
   INSERT INTO settings_new (key, value, user_id)
   SELECT key, value, 'local' FROM settings;
   
   -- 替换旧表
   DROP TABLE settings;
   ALTER TABLE settings_new RENAME TO settings;
   ```

4. **创建索引**
   ```sql
   CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
   CREATE INDEX IF NOT EXISTS idx_items_user_decrypt ON items(user_id, decrypt_at);
   ```

## 数据兼容性

### 现有数据处理

所有迁移前创建的数据会自动关联到 `user_id = 'local'`，表示本地单用户。

### 向后兼容

- ✅ 所有现有功能完全正常
- ✅ 数据完整性保持不变
- ✅ API 接口保持不变

## 验证迁移

### 检查数据完整性

```bash
# 进入数据库
sqlite3 data/chaster.db

# 验证所有项目都有 user_id
SELECT COUNT(*) FROM items WHERE user_id IS NULL;
-- 应返回 0

# 验证所有数据归属 local 用户
SELECT COUNT(*) FROM items WHERE user_id = 'local';
-- 应返回总项目数

# 检查 settings 表结构
PRAGMA table_info(settings);
-- 应显示 key, value, user_id 三列

# 检查索引
SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='items';
-- 应包含 idx_items_user_id 和 idx_items_user_decrypt
```

### 功能测试

迁移后测试以下功能：
- [ ] 查看现有加密项目列表
- [ ] 创建新的加密项目
- [ ] 查看项目详情（锁定和解锁状态）
- [ ] 延长锁定时间
- [ ] 删除项目

## 回滚方案

如果迁移出现问题，可以回滚到之前版本：

### 1. 代码回滚

```bash
git checkout main
```

### 2. 数据库回滚（可选）

如果需要完全回滚数据库：

```bash
# 备份当前数据库
cp data/chaster.db data/chaster.db.backup

# 从旧版本恢复（如果有备份）
cp data/chaster.db.old data/chaster.db
```

**注意**：通常不需要回滚数据库，因为：
- 新增的 `user_id` 列有默认值 `'local'`
- 旧版本代码虽然不知道 `user_id`，但数据仍然有效

## 故障排查

### 问题：应用启动失败

**症状**：数据库初始化错误

**解决**：
1. 检查数据库文件权限
2. 检查 `data/` 目录是否可写
3. 查看日志中的具体错误信息

### 问题：现有数据不可见

**症状**：迁移后看不到旧数据

**解决**：
```sql
-- 检查数据是否存在
SELECT * FROM items;

-- 检查 user_id
SELECT DISTINCT user_id FROM items;
-- 应该只有 'local'

-- 如果有 NULL 值，手动更新
UPDATE items SET user_id = 'local' WHERE user_id IS NULL;
```

### 问题：Settings 迁移失败

**症状**：设置项丢失

**解决**：
```sql
-- 检查是否有数据
SELECT * FROM settings;

-- 如果table不存在，重新初始化
-- 重启应用会自动创建
```

## 性能影响

### 查询性能

添加 `user_id` 字段和对应索引后：
- ✅ 单用户模式：性能无明显变化（WHERE user_id = 'local' 由索引优化）
- ✅ 多用户模式（将来）：用户级查询高效

### 存储开销

- `user_id` 字段：每条记录增加约 10-20 字节
- 索引：约占数据大小的 5-10%
- 总体影响：**可忽略不计**

## 将来升级路径

当需要升级为真正的多用户系统时：

1. **保留 'local' 用户**
   - 可作为匿名/本地用户
   - 或迁移到真实用户账号

2. **数据迁移**
   ```sql
   -- 示例：将 local 用户数据归属到新用户
   UPDATE items SET user_id = 'new_user_id' WHERE user_id = 'local';
   UPDATE settings SET user_id = 'new_user_id' WHERE user_id = 'local';
   ```

3. **多租户隔离**
   - 数据库架构已就绪
   - 只需实现认证逻辑

## 支持

如遇到问题，请：
1. 查看本文档的故障排查部分
2. 检查 Git commit历史和代码注释
3. 创建 GitHub Issue

---

**文档版本**：v1.0  
**更新时间**：2025-12-26  
**相关 Commit**：feat(auth): add multi-user architecture foundation
