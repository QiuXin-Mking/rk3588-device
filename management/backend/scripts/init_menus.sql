-- Base menus required when starting a new project from an empty database.
-- Business menus and permissions must be configured through release scripts or
-- menu management and must not be added to this bootstrap file.

INSERT INTO menu (
    id, parent_id, name, type, path,
    icon, permission_code, sort, is_active, is_visible,
    is_cache,
    created_at, updated_at
)
VALUES
    -- 1. [ROOT] 系统设置
    ('b382432c-b682-4fc6-a840-dd2e9a64bd41', NULL, '系统设置', 0, 'system', 'Settings', NULL, 888888, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

        -- 1.1 [CHILD] 菜单管理
        ('5ff3dc40-a9da-4299-849a-ca2f6d6f0a3e', 'b382432c-b682-4fc6-a840-dd2e9a64bd41', '菜单管理', 1, 'menus', 'Menu', 'menus:read', 1, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

        -- 1.2 [CHILD] 用户管理
        ('4620e871-811f-425b-bd15-4c6d32d85968', 'b382432c-b682-4fc6-a840-dd2e9a64bd41', '用户管理', 1, 'users', 'Users', 'users:read', 2, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

        -- 1.3 [CHILD] 工作区管理
        ('b71f0509-9f0b-4f86-ae8e-5e40e7497399', 'b382432c-b682-4fc6-a840-dd2e9a64bd41', '工作区管理', 1, 'workspaces', 'Home', '', 3, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)

ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    type = EXCLUDED.type,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    permission_code = EXCLUDED.permission_code,
    sort = EXCLUDED.sort,
    is_active = EXCLUDED.is_active,
    is_visible = EXCLUDED.is_visible,
    is_cache = EXCLUDED.is_cache,
    updated_at = CURRENT_TIMESTAMP;
