DROP TABLE IF EXISTS doris_test;
CREATE TABLE IF NOT EXISTS doris_test (
    id INT COMMENT '主键ID',
    name STRING COMMENT '姓名',
    age INT COMMENT '年龄'
) DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO doris_test VALUES (1, 'qq', 11);

DROP TABLE IF EXISTS doris_demo_data_types_source;
CREATE TABLE IF NOT EXISTS doris_demo_data_types_source (
    user_id BIGINT COMMENT '用户ID',
    created_date DATE COMMENT '创建日期',
    name VARCHAR(50) COMMENT '姓名',
    age TINYINT COMMENT '年龄',
    status SMALLINT COMMENT '状态码',
    price DECIMAL(10,2) COMMENT '价格',
    weight FLOAT COMMENT '重量',
    rating DOUBLE COMMENT '评分',
    description STRING COMMENT '描述信息',
    gender VARCHAR(10) COMMENT '性别',
    department VARCHAR(20) COMMENT '部门',
    created_time DATETIME COMMENT '创建时间',
    birth_date DATE COMMENT '出生日期',
    is_active BOOLEAN COMMENT '是否激活',
    tags VARCHAR(100) COMMENT '标签',
    total_amount BIGINT COMMENT '总金额',
    order_count INT COMMENT '订单数量'
) ENGINE=olap
DUPLICATE KEY(user_id, created_date, name)
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO doris_demo_data_types_source VALUES
(1001, '2024-01-15', '张三', 25, 1, 99.99, 65.5, 4.5, '技术部员工', '男', '技术部', '2024-01-15 10:30:00', '1998-05-20', true, '科技,财经', 1500, 5),
(1002, '2024-01-16', '李四', 30, 2, 199.50, 55.2, 4.8, '市场部经理', '女', '市场部', '2024-01-16 14:20:00', '1993-12-10', true, '娱乐', 2500, 8),
(1003, '2024-01-17', '王五', 22, 0, 49.99, 70.1, 3.9, '销售专员', '其他', '销售部', '2024-01-17 16:45:00', '2001-08-25', false, '科技,体育', 800, 3);

DROP TABLE IF EXISTS doris_demo1_data_types_source;
CREATE TABLE IF NOT EXISTS doris_demo1_data_types_source (
    user_id BIGINT COMMENT '用户ID',
    created_date VARCHAR(20) COMMENT '创建日期',
    name VARCHAR(50) COMMENT '姓名',
    age INT COMMENT '年龄',
    status INT COMMENT '状态码',
    price VARCHAR(20) COMMENT '价格',
    weight VARCHAR(20) COMMENT '重量',
    rating VARCHAR(20) COMMENT '评分',
    description VARCHAR(500) COMMENT '描述信息',
    gender VARCHAR(10) COMMENT '性别',
    department VARCHAR(20) COMMENT '部门',
    created_time VARCHAR(30) COMMENT '创建时间',
    birth_date VARCHAR(20) COMMENT '出生日期',
    is_active VARCHAR(10) COMMENT '是否激活',
    tags VARCHAR(100) COMMENT '标签',
    total_amount INT COMMENT '总金额',
    order_count INT COMMENT '订单数量'
) ENGINE=olap
DUPLICATE KEY(user_id, created_date, name)
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO doris_demo1_data_types_source VALUES
(1001, '2024-01-15', '张三', 25, 1, '99', '65', '4', '技术部员工', '男', '技术部', '2024-01-15 10:30:00', '1998-05-20', 'true', '科技,财经', 1500, 5),
(1002, '2024-01-16', '李四', 30, 2, '199', '55', '4', '市场部经理', '女', '市场部', '2024-01-16 14:20:00', '1993-12-10', 'true', '娱乐', 2500, 8)
