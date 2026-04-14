DROP TABLE IF EXISTS active_users;
CREATE TABLE IF NOT EXISTS active_users (
    user_id BIGINT NOT NULL COMMENT '用户ID',
    name VARCHAR(50) NOT NULL COMMENT '用户姓名',
    email VARCHAR(200) NULL COMMENT '邮箱地址',
    address VARCHAR(500) NULL COMMENT '住址',
    age TINYINT NULL COMMENT '用户年龄',
    sex TINYINT NULL COMMENT '用户性别',
    last_active DATETIME COMMENT '最近活跃时间',
    property0 TINYINT NOT NULL COMMENT '属性0',
    property1 TINYINT NOT NULL COMMENT '属性1',
    property2 TINYINT NOT NULL COMMENT '属性2',
    property3 TINYINT NOT NULL COMMENT '属性3'
) DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO active_users VALUES (1, '张三', 'zhangsan@test.com', '北京市', 25, 1, '2024-01-15 10:30:00', 1, 0, 1, 0);
INSERT INTO active_users VALUES (2, '李四', 'lisi@test.com', '上海市', 30, 0, '2024-01-16 14:20:00', 0, 1, 1, 1)
