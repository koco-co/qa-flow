DROP TABLE IF EXISTS test_table;
CREATE TABLE IF NOT EXISTS test_table (
    id INT COMMENT '主键',
    name VARCHAR(255) COMMENT '姓名',
    info VARCHAR(255) COMMENT '信息'
) DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO test_table VALUES (1, 'one', 'desc 1');
INSERT INTO test_table VALUES (2, 'two', 'desc 2');
INSERT INTO test_table VALUES (3, 'three', 'desc 3')
