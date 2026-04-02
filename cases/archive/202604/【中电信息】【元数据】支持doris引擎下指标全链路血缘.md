---
suite_name: 【中电信息】【元数据】支持doris引擎下指标全链路血缘
description: 【中电信息】【元数据】支持doris引擎下指标全链路血缘
prd_id: 15549
prd_version: v6.4.8
prd_path: cases/prds/202604/【中电信息】【元数据】支持doris引擎下指标全链路血缘.md
prd_url: "https://lanhuapp.com/web/#/item/project/product?tid=24a1c6b2-a52e-454c-8d51-8aff866598b1&pid=7de90493-e80f-4592-a263-38fb2d2e98c0&versionId=8ea3f450-ea24-4d86-bb82-5825c28b9fab&docId=374b81e7-ea98-4975-b946-d27704d06963&docType=axure&pageId=9f05a989d5004e72abe547805dc2f88b&image_id=374b81e7-ea98-4975-b946-d27704d06963&parentId=baabc203-4c58-4fd9-97b0-5e125d8599d7"
product: data-assets
dev_version: 6.3中电信息定制化分支
tags:
  - 数据资产
  - Doris
  - 指标血缘
  - 表级血缘
  - 字段级血缘
  - 数据地图
  - 手工血缘
  - 中电信息
  - 元数据
  - 支持doris引擎下指标全链路血缘
create_at: 2026-04-02
update_at: 2026-04-02
status: 已归档
health_warnings: []
repos:
  - .repos/CustomItem/dt-center-metadata
  - .repos/CustomItem/dt-center-assets
  - .repos/CustomItem/dt-insight-studio
case_count: 20
case_types:
  normal: 18
  abnormal: 1
  boundary: 1
origin: json
---

## 数据地图

### 表详情

#### Tab入口

##### 【P0】验证Doris2.x与Doris3.x元数据详情页均开放血缘关系Tab

> 前置条件
```
1、环境说明：数据资产、指标平台已部署完成，Doris2.x / Doris3.x 数据源连接正常，且已在数据资产侧完成元数据同步；已同步的数据源名称分别为 `doris2_meta1`（Doris2.x meta1）、`doris2_meta2`（Doris2.x meta2）、`doris3_meta3`（Doris3.x meta3）、`doris3_meta4`（Doris3.x meta4）。

2、Doris2.x 建表与测试数据准备（分别同步到 meta1、meta2 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

3、Doris3.x 建表与测试数据准备（分别同步到 meta3、meta4 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

4、在当前验证目标所在的 Doris2.x 或 Doris3.x 集群上执行以下建链 SQL 与指标准备：
-- 若本次验证 Doris2.x，则在 Doris2.x 集群执行；若本次验证 Doris3.x，则在 Doris3.x 集群执行；两个集群均使用相同库表名 qa_test.*。
-- 表级 / 字段级建链 SQL（先执行 src -> mid，再执行 mid -> dwd）：
INSERT OVERWRITE TABLE qa_test.doris_lineage_mid
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  order_status,
  dt
FROM qa_test.doris_lineage_src;

INSERT OVERWRITE TABLE qa_test.doris_lineage_dwd
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  CASE
    WHEN order_amount >= 120 THEN '微信'
    WHEN order_amount >= 80 THEN '支付宝'
    ELSE '银行卡'
  END AS pay_channel,
  dt
FROM qa_test.doris_lineage_mid;

-- 执行完上述 SQL 后，重新同步 qa_test.doris_lineage_src / qa_test.doris_lineage_mid / qa_test.doris_lineage_dwd，确认图上形成 doris_lineage_src -> doris_lineage_mid -> doris_lineage_dwd 连续链路。
-- 向导模式指标需按以下口径创建并发布成功：
① 原子指标「订单成交金额」：来源表 qa_test.doris_lineage_dwd，来源字段 order_amount，聚合方式 SUM；
② 派生指标「日成交金额」：基于原子指标「订单成交金额」，统计粒度字段 dt；
③ 复合指标「成交金额占比」：公式 日成交金额 / 订单成交金额。
-- 脚本模式指标「近7日订单金额」使用以下 SQL 创建并发布：
SELECT
  SUM(dwd.order_amount) AS last_7d_order_amount
FROM qa_test.doris_lineage_dwd dwd
JOIN qa_test.doris_lineage_mid mid ON dwd.order_id = mid.order_id
JOIN qa_test.doris_lineage_src src ON mid.order_id = src.order_id
WHERE dwd.dt BETWEEN DATE_SUB('2026-04-02', 6) AND '2026-04-02';
-- 历史指标样例「历史成交金额」按以下回刷 SQL 准备并保留已发布版本：
SELECT
  dt,
  SUM(order_amount) AS history_order_amount
FROM qa_test.doris_lineage_dwd
GROUP BY dt;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据地图 → 表详情】页面 | 页面成功加载，Doris 元数据详情页的 Tab 区域可见。 |
| 2 | 切换到 Doris2.x 元数据详情页并观察【血缘关系】Tab | Doris2.x 元数据详情页开放【血缘关系】Tab，且入口可点击。 |
| 3 | 切换到 Doris3.x 元数据详情页并观察【血缘关系】Tab | Doris3.x 元数据详情页同样开放【血缘关系】Tab，入口与 Doris2.x 保持一致。 |
| 4 | 分别点击两个版本的【血缘关系】Tab 并返回表详情页 | 两个版本的血缘关系页面均可正常打开和返回，不存在版本差异导致的入口缺失。 |

### 血缘关系

#### 表级血缘

##### 【P0】验证Doris2.x同库同表meta1/meta2合并后表级链路可继续连通指标

> 前置条件
```
1、环境说明：数据资产、指标平台已部署完成，Doris2.x / Doris3.x 数据源连接正常，且已在数据资产侧完成元数据同步；已同步的数据源名称分别为 `doris2_meta1`（Doris2.x meta1）、`doris2_meta2`（Doris2.x meta2）、`doris3_meta3`（Doris3.x meta3）、`doris3_meta4`（Doris3.x meta4）。

2、Doris2.x 建表与测试数据准备（分别同步到 meta1、meta2 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

3、Doris3.x 建表与测试数据准备（分别同步到 meta3、meta4 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

4、在当前验证目标所在的 Doris2.x 或 Doris3.x 集群上执行以下建链 SQL 与指标准备：
-- 若本次验证 Doris2.x，则在 Doris2.x 集群执行；若本次验证 Doris3.x，则在 Doris3.x 集群执行；两个集群均使用相同库表名 qa_test.*。
-- 表级 / 字段级建链 SQL（先执行 src -> mid，再执行 mid -> dwd）：
INSERT OVERWRITE TABLE qa_test.doris_lineage_mid
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  order_status,
  dt
FROM qa_test.doris_lineage_src;

INSERT OVERWRITE TABLE qa_test.doris_lineage_dwd
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  CASE
    WHEN order_amount >= 120 THEN '微信'
    WHEN order_amount >= 80 THEN '支付宝'
    ELSE '银行卡'
  END AS pay_channel,
  dt
FROM qa_test.doris_lineage_mid;

-- 执行完上述 SQL 后，重新同步 qa_test.doris_lineage_src / qa_test.doris_lineage_mid / qa_test.doris_lineage_dwd，确认图上形成 doris_lineage_src -> doris_lineage_mid -> doris_lineage_dwd 连续链路。
-- 向导模式指标需按以下口径创建并发布成功：
① 原子指标「订单成交金额」：来源表 qa_test.doris_lineage_dwd，来源字段 order_amount，聚合方式 SUM；
② 派生指标「日成交金额」：基于原子指标「订单成交金额」，统计粒度字段 dt；
③ 复合指标「成交金额占比」：公式 日成交金额 / 订单成交金额。
-- 脚本模式指标「近7日订单金额」使用以下 SQL 创建并发布：
SELECT
  SUM(dwd.order_amount) AS last_7d_order_amount
FROM qa_test.doris_lineage_dwd dwd
JOIN qa_test.doris_lineage_mid mid ON dwd.order_id = mid.order_id
JOIN qa_test.doris_lineage_src src ON mid.order_id = src.order_id
WHERE dwd.dt BETWEEN DATE_SUB('2026-04-02', 6) AND '2026-04-02';
-- 历史指标样例「历史成交金额」按以下回刷 SQL 准备并保留已发布版本：
SELECT
  dt,
  SUM(order_amount) AS history_order_amount
FROM qa_test.doris_lineage_dwd
GROUP BY dt;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据地图 → 表详情 → 血缘关系】页面 | 页面成功加载，默认展示血缘关系视图，当前节点可正常定位到 Doris2.x 数据源下的目标表。 |
| 2 | 在左侧节点树中选择 Doris2.x meta1 下的 `qa_test.doris_lineage_src` 节点，并切换到【表级血缘】 | 当前节点以表级血缘方式展示，默认仅展开一层，且同一物理表的 meta1/meta2 记录被合并为同一链路节点。 |
| 3 | 点击表节点的展开按钮，继续展开下游节点直到出现指标节点 | 下游链路能够继续展开，表到指标的链路保持连通，不会因 meta1/meta2 分裂为两条断开的链路。 |
| 4 | 切换到 Doris2.x meta2 下相同物理表节点，再次查看表级血缘 | 页面仍展示同一条合并后的链路，meta2 入口可继续看到离线链路与指标链路同时连通。 |

##### 【P0】验证表级血缘默认一层展开收起后可继续查看下游指标

> 前置条件
```
1、环境说明：数据资产、指标平台已部署完成，Doris2.x / Doris3.x 数据源连接正常，且已在数据资产侧完成元数据同步；已同步的数据源名称分别为 `doris2_meta1`（Doris2.x meta1）、`doris2_meta2`（Doris2.x meta2）、`doris3_meta3`（Doris3.x meta3）、`doris3_meta4`（Doris3.x meta4）。

2、Doris2.x 建表与测试数据准备（分别同步到 meta1、meta2 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

3、Doris3.x 建表与测试数据准备（分别同步到 meta3、meta4 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

4、在当前验证目标所在的 Doris2.x 或 Doris3.x 集群上执行以下建链 SQL 与指标准备：
-- 若本次验证 Doris2.x，则在 Doris2.x 集群执行；若本次验证 Doris3.x，则在 Doris3.x 集群执行；两个集群均使用相同库表名 qa_test.*。
-- 表级 / 字段级建链 SQL（先执行 src -> mid，再执行 mid -> dwd）：
INSERT OVERWRITE TABLE qa_test.doris_lineage_mid
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  order_status,
  dt
FROM qa_test.doris_lineage_src;

INSERT OVERWRITE TABLE qa_test.doris_lineage_dwd
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  CASE
    WHEN order_amount >= 120 THEN '微信'
    WHEN order_amount >= 80 THEN '支付宝'
    ELSE '银行卡'
  END AS pay_channel,
  dt
FROM qa_test.doris_lineage_mid;

-- 执行完上述 SQL 后，重新同步 qa_test.doris_lineage_src / qa_test.doris_lineage_mid / qa_test.doris_lineage_dwd，确认图上形成 doris_lineage_src -> doris_lineage_mid -> doris_lineage_dwd 连续链路。
-- 向导模式指标需按以下口径创建并发布成功：
① 原子指标「订单成交金额」：来源表 qa_test.doris_lineage_dwd，来源字段 order_amount，聚合方式 SUM；
② 派生指标「日成交金额」：基于原子指标「订单成交金额」，统计粒度字段 dt；
③ 复合指标「成交金额占比」：公式 日成交金额 / 订单成交金额。
-- 脚本模式指标「近7日订单金额」使用以下 SQL 创建并发布：
SELECT
  SUM(dwd.order_amount) AS last_7d_order_amount
FROM qa_test.doris_lineage_dwd dwd
JOIN qa_test.doris_lineage_mid mid ON dwd.order_id = mid.order_id
JOIN qa_test.doris_lineage_src src ON mid.order_id = src.order_id
WHERE dwd.dt BETWEEN DATE_SUB('2026-04-02', 6) AND '2026-04-02';
-- 历史指标样例「历史成交金额」按以下回刷 SQL 准备并保留已发布版本：
SELECT
  dt,
  SUM(order_amount) AS history_order_amount
FROM qa_test.doris_lineage_dwd
GROUP BY dt;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据地图 → 表详情 → 血缘关系】页面 | 页面成功加载，默认进入血缘关系视图。 |
| 2 | 在左侧节点树中选择 Doris2.x meta1 下的 `qa_test.doris_lineage_mid` 节点，并切换到【表级血缘】 | 当前表默认仅展示一层血缘节点，页面未自动展开多层链路。 |
| 3 | 依次点击节点上的【+】和【-】按钮，完成一层展开与收起 | 展开后可看到上下游节点，收起后恢复默认一层展示，节点层级切换正常。 |
| 4 | 点击血缘图中的指标节点【日成交金额】 | 指标节点展示特殊 icon，且可继续展开查看该指标对应的多表来源链路。 |

##### 【P1】验证表级血缘类型筛选默认全选且当前维度不可取消

> 前置条件
```
1、环境说明：数据资产、指标平台已部署完成，Doris2.x / Doris3.x 数据源连接正常，且已在数据资产侧完成元数据同步；已同步的数据源名称分别为 `doris2_meta1`（Doris2.x meta1）、`doris2_meta2`（Doris2.x meta2）、`doris3_meta3`（Doris3.x meta3）、`doris3_meta4`（Doris3.x meta4）。

2、Doris2.x 建表与测试数据准备（分别同步到 meta1、meta2 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

3、Doris3.x 建表与测试数据准备（分别同步到 meta3、meta4 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

4、在当前验证目标所在的 Doris2.x 或 Doris3.x 集群上执行以下建链 SQL 与指标准备：
-- 若本次验证 Doris2.x，则在 Doris2.x 集群执行；若本次验证 Doris3.x，则在 Doris3.x 集群执行；两个集群均使用相同库表名 qa_test.*。
-- 表级 / 字段级建链 SQL（先执行 src -> mid，再执行 mid -> dwd）：
INSERT OVERWRITE TABLE qa_test.doris_lineage_mid
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  order_status,
  dt
FROM qa_test.doris_lineage_src;

INSERT OVERWRITE TABLE qa_test.doris_lineage_dwd
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  CASE
    WHEN order_amount >= 120 THEN '微信'
    WHEN order_amount >= 80 THEN '支付宝'
    ELSE '银行卡'
  END AS pay_channel,
  dt
FROM qa_test.doris_lineage_mid;

-- 执行完上述 SQL 后，重新同步 qa_test.doris_lineage_src / qa_test.doris_lineage_mid / qa_test.doris_lineage_dwd，确认图上形成 doris_lineage_src -> doris_lineage_mid -> doris_lineage_dwd 连续链路。
-- 向导模式指标需按以下口径创建并发布成功：
① 原子指标「订单成交金额」：来源表 qa_test.doris_lineage_dwd，来源字段 order_amount，聚合方式 SUM；
② 派生指标「日成交金额」：基于原子指标「订单成交金额」，统计粒度字段 dt；
③ 复合指标「成交金额占比」：公式 日成交金额 / 订单成交金额。
-- 脚本模式指标「近7日订单金额」使用以下 SQL 创建并发布：
SELECT
  SUM(dwd.order_amount) AS last_7d_order_amount
FROM qa_test.doris_lineage_dwd dwd
JOIN qa_test.doris_lineage_mid mid ON dwd.order_id = mid.order_id
JOIN qa_test.doris_lineage_src src ON mid.order_id = src.order_id
WHERE dwd.dt BETWEEN DATE_SUB('2026-04-02', 6) AND '2026-04-02';
-- 历史指标样例「历史成交金额」按以下回刷 SQL 准备并保留已发布版本：
SELECT
  dt,
  SUM(order_amount) AS history_order_amount
FROM qa_test.doris_lineage_dwd
GROUP BY dt;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据地图 → 表详情 → 血缘关系】页面 | 页面成功加载，右上角【资产类型】筛选区域可见。 |
| 2 | 在左侧节点树中选择 Doris2.x meta1 下的 `qa_test.doris_lineage_dwd` 节点，并展开右上角【资产类型】筛选下拉 | 筛选项默认全部选中，当前进入的【表】类型保持选中状态，且该项处于禁用不可取消状态。 |
| 3 | 取消勾选【离线任务】和【指标】，保留其余类型选中 | 非当前类型可正常勾选或取消，当前进入的【表】类型始终保持选中，不会被取消。 |
| 4 | 关闭筛选下拉并观察血缘图结果 | 页面按最新筛选条件展示节点，当前进入的【表】类型仍保留在筛选集合中。 |

##### 【P1】验证表级血缘根节点与父子节点右键菜单展示正确

> 前置条件
```
1、环境说明：数据资产、指标平台已部署完成，Doris2.x / Doris3.x 数据源连接正常，且已在数据资产侧完成元数据同步；已同步的数据源名称分别为 `doris2_meta1`（Doris2.x meta1）、`doris2_meta2`（Doris2.x meta2）、`doris3_meta3`（Doris3.x meta3）、`doris3_meta4`（Doris3.x meta4）。

2、Doris2.x 建表与测试数据准备（分别同步到 meta1、meta2 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

3、Doris3.x 建表与测试数据准备（分别同步到 meta3、meta4 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

4、在当前验证目标所在的 Doris2.x 或 Doris3.x 集群上执行以下建链 SQL 与指标准备：
-- 若本次验证 Doris2.x，则在 Doris2.x 集群执行；若本次验证 Doris3.x，则在 Doris3.x 集群执行；两个集群均使用相同库表名 qa_test.*。
-- 表级 / 字段级建链 SQL（先执行 src -> mid，再执行 mid -> dwd）：
INSERT OVERWRITE TABLE qa_test.doris_lineage_mid
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  order_status,
  dt
FROM qa_test.doris_lineage_src;

INSERT OVERWRITE TABLE qa_test.doris_lineage_dwd
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  CASE
    WHEN order_amount >= 120 THEN '微信'
    WHEN order_amount >= 80 THEN '支付宝'
    ELSE '银行卡'
  END AS pay_channel,
  dt
FROM qa_test.doris_lineage_mid;

-- 执行完上述 SQL 后，重新同步 qa_test.doris_lineage_src / qa_test.doris_lineage_mid / qa_test.doris_lineage_dwd，确认图上形成 doris_lineage_src -> doris_lineage_mid -> doris_lineage_dwd 连续链路。
-- 向导模式指标需按以下口径创建并发布成功：
① 原子指标「订单成交金额」：来源表 qa_test.doris_lineage_dwd，来源字段 order_amount，聚合方式 SUM；
② 派生指标「日成交金额」：基于原子指标「订单成交金额」，统计粒度字段 dt；
③ 复合指标「成交金额占比」：公式 日成交金额 / 订单成交金额。
-- 脚本模式指标「近7日订单金额」使用以下 SQL 创建并发布：
SELECT
  SUM(dwd.order_amount) AS last_7d_order_amount
FROM qa_test.doris_lineage_dwd dwd
JOIN qa_test.doris_lineage_mid mid ON dwd.order_id = mid.order_id
JOIN qa_test.doris_lineage_src src ON mid.order_id = src.order_id
WHERE dwd.dt BETWEEN DATE_SUB('2026-04-02', 6) AND '2026-04-02';
-- 历史指标样例「历史成交金额」按以下回刷 SQL 准备并保留已发布版本：
SELECT
  dt,
  SUM(order_amount) AS history_order_amount
FROM qa_test.doris_lineage_dwd
GROUP BY dt;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据地图 → 表详情 → 血缘关系】页面 | 页面成功加载，表级血缘图可正常展示。 |
| 2 | 在【表级血缘】中右键当前 root 节点 `qa_test.doris_lineage_dwd` | 右键菜单仅展示【插入血缘表】和【插入影响表】，不展示【查看此节点血缘】。 |
| 3 | 点击【+】展开上游或下游节点后，右键父子节点 `qa_test.doris_lineage_mid` | 父子节点右键菜单展示【插入血缘表】、【插入影响表】和【查看此节点血缘】。 |
| 4 | 点击【查看此节点血缘】 | 页面打开所选父子节点的全链路视图，并可继续查看该节点的上下游链路。 |

##### 【P1】验证表级血缘重合数据源汇总可展示同表多来源

> 前置条件
```
1、环境说明：数据资产、指标平台已部署完成，Doris2.x / Doris3.x 数据源连接正常，且已在数据资产侧完成元数据同步；已同步的数据源名称分别为 `doris2_meta1`（Doris2.x meta1）、`doris2_meta2`（Doris2.x meta2）、`doris3_meta3`（Doris3.x meta3）、`doris3_meta4`（Doris3.x meta4）。

2、Doris2.x 建表与测试数据准备（分别同步到 meta1、meta2 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

3、Doris3.x 建表与测试数据准备（分别同步到 meta3、meta4 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

4、在当前验证目标所在的 Doris2.x 或 Doris3.x 集群上执行以下建链 SQL 与指标准备：
-- 若本次验证 Doris2.x，则在 Doris2.x 集群执行；若本次验证 Doris3.x，则在 Doris3.x 集群执行；两个集群均使用相同库表名 qa_test.*。
-- 表级 / 字段级建链 SQL（先执行 src -> mid，再执行 mid -> dwd）：
INSERT OVERWRITE TABLE qa_test.doris_lineage_mid
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  order_status,
  dt
FROM qa_test.doris_lineage_src;

INSERT OVERWRITE TABLE qa_test.doris_lineage_dwd
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  CASE
    WHEN order_amount >= 120 THEN '微信'
    WHEN order_amount >= 80 THEN '支付宝'
    ELSE '银行卡'
  END AS pay_channel,
  dt
FROM qa_test.doris_lineage_mid;

-- 执行完上述 SQL 后，重新同步 qa_test.doris_lineage_src / qa_test.doris_lineage_mid / qa_test.doris_lineage_dwd，确认图上形成 doris_lineage_src -> doris_lineage_mid -> doris_lineage_dwd 连续链路。
-- 向导模式指标需按以下口径创建并发布成功：
① 原子指标「订单成交金额」：来源表 qa_test.doris_lineage_dwd，来源字段 order_amount，聚合方式 SUM；
② 派生指标「日成交金额」：基于原子指标「订单成交金额」，统计粒度字段 dt；
③ 复合指标「成交金额占比」：公式 日成交金额 / 订单成交金额。
-- 脚本模式指标「近7日订单金额」使用以下 SQL 创建并发布：
SELECT
  SUM(dwd.order_amount) AS last_7d_order_amount
FROM qa_test.doris_lineage_dwd dwd
JOIN qa_test.doris_lineage_mid mid ON dwd.order_id = mid.order_id
JOIN qa_test.doris_lineage_src src ON mid.order_id = src.order_id
WHERE dwd.dt BETWEEN DATE_SUB('2026-04-02', 6) AND '2026-04-02';
-- 历史指标样例「历史成交金额」按以下回刷 SQL 准备并保留已发布版本：
SELECT
  dt,
  SUM(order_amount) AS history_order_amount
FROM qa_test.doris_lineage_dwd
GROUP BY dt;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据地图 → 表详情 → 血缘关系】页面 | 页面成功加载，血缘图中可识别同一物理表的多来源节点。 |
| 2 | 在左侧节点树中选择 Doris2.x meta1 下的 `qa_test.doris_lineage_mid` 节点，并查看节点右侧的重合数据源汇总入口 | 同一物理表对应的 meta1/meta2 来源可在重合数据源汇总入口中展示。 |
| 3 | 点击【重合数据源汇总】入口 | 页面展开汇总信息，能够看到同库同表被合并后的多个数据来源记录。 |
| 4 | 切换到 meta2 侧同名节点再次查看汇总信息 | meta2 入口展示的汇总结果与 meta1 一致，来源合并关系保持一致。 |

##### 【P1】验证多表生成同一指标时特殊icon与展开链路正常展示

> 前置条件
```
1、环境说明：数据资产、指标平台已部署完成，Doris2.x / Doris3.x 数据源连接正常，且已在数据资产侧完成元数据同步；已同步的数据源名称分别为 `doris2_meta1`（Doris2.x meta1）、`doris2_meta2`（Doris2.x meta2）、`doris3_meta3`（Doris3.x meta3）、`doris3_meta4`（Doris3.x meta4）。

2、Doris2.x 建表与测试数据准备（分别同步到 meta1、meta2 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

3、Doris3.x 建表与测试数据准备（分别同步到 meta3、meta4 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

4、在当前验证目标所在的 Doris2.x 或 Doris3.x 集群上执行以下建链 SQL 与指标准备：
-- 若本次验证 Doris2.x，则在 Doris2.x 集群执行；若本次验证 Doris3.x，则在 Doris3.x 集群执行；两个集群均使用相同库表名 qa_test.*。
-- 表级 / 字段级建链 SQL（先执行 src -> mid，再执行 mid -> dwd）：
INSERT OVERWRITE TABLE qa_test.doris_lineage_mid
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  order_status,
  dt
FROM qa_test.doris_lineage_src;

INSERT OVERWRITE TABLE qa_test.doris_lineage_dwd
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  CASE
    WHEN order_amount >= 120 THEN '微信'
    WHEN order_amount >= 80 THEN '支付宝'
    ELSE '银行卡'
  END AS pay_channel,
  dt
FROM qa_test.doris_lineage_mid;

-- 执行完上述 SQL 后，重新同步 qa_test.doris_lineage_src / qa_test.doris_lineage_mid / qa_test.doris_lineage_dwd，确认图上形成 doris_lineage_src -> doris_lineage_mid -> doris_lineage_dwd 连续链路。
-- 向导模式指标需按以下口径创建并发布成功：
① 原子指标「订单成交金额」：来源表 qa_test.doris_lineage_dwd，来源字段 order_amount，聚合方式 SUM；
② 派生指标「日成交金额」：基于原子指标「订单成交金额」，统计粒度字段 dt；
③ 复合指标「成交金额占比」：公式 日成交金额 / 订单成交金额。
-- 脚本模式指标「近7日订单金额」使用以下 SQL 创建并发布：
SELECT
  SUM(dwd.order_amount) AS last_7d_order_amount
FROM qa_test.doris_lineage_dwd dwd
JOIN qa_test.doris_lineage_mid mid ON dwd.order_id = mid.order_id
JOIN qa_test.doris_lineage_src src ON mid.order_id = src.order_id
WHERE dwd.dt BETWEEN DATE_SUB('2026-04-02', 6) AND '2026-04-02';
-- 历史指标样例「历史成交金额」按以下回刷 SQL 准备并保留已发布版本：
SELECT
  dt,
  SUM(order_amount) AS history_order_amount
FROM qa_test.doris_lineage_dwd
GROUP BY dt;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据地图 → 表详情 → 血缘关系】页面 | 页面成功加载，指标节点可见。 |
| 2 | 在表级血缘图中定位到指标节点【日成交金额】 | 指标节点展示特殊 icon，说明该指标存在多条来源链路。 |
| 3 | 点击该指标节点并展开其上游来源 | 页面能够展开多个来源表，且不会丢失任一来源链路。 |
| 4 | 继续展开到所有可见来源表 | 同一指标的多表生成链路完整展示，所有来源均可被查看。 |

#### 字段级血缘

##### 【P0】验证Doris2.x同库同表meta1/meta2合并后字段级链路可继续连通

> 前置条件
```
1、环境说明：数据资产、指标平台已部署完成，Doris2.x / Doris3.x 数据源连接正常，且已在数据资产侧完成元数据同步；已同步的数据源名称分别为 `doris2_meta1`（Doris2.x meta1）、`doris2_meta2`（Doris2.x meta2）、`doris3_meta3`（Doris3.x meta3）、`doris3_meta4`（Doris3.x meta4）。

2、Doris2.x 建表与测试数据准备（分别同步到 meta1、meta2 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

3、Doris3.x 建表与测试数据准备（分别同步到 meta3、meta4 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

4、在当前验证目标所在的 Doris2.x 或 Doris3.x 集群上执行以下建链 SQL 与指标准备：
-- 若本次验证 Doris2.x，则在 Doris2.x 集群执行；若本次验证 Doris3.x，则在 Doris3.x 集群执行；两个集群均使用相同库表名 qa_test.*。
-- 表级 / 字段级建链 SQL（先执行 src -> mid，再执行 mid -> dwd）：
INSERT OVERWRITE TABLE qa_test.doris_lineage_mid
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  order_status,
  dt
FROM qa_test.doris_lineage_src;

INSERT OVERWRITE TABLE qa_test.doris_lineage_dwd
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  CASE
    WHEN order_amount >= 120 THEN '微信'
    WHEN order_amount >= 80 THEN '支付宝'
    ELSE '银行卡'
  END AS pay_channel,
  dt
FROM qa_test.doris_lineage_mid;

-- 执行完上述 SQL 后，重新同步 qa_test.doris_lineage_src / qa_test.doris_lineage_mid / qa_test.doris_lineage_dwd，确认图上形成 doris_lineage_src -> doris_lineage_mid -> doris_lineage_dwd 连续链路。
-- 向导模式指标需按以下口径创建并发布成功：
① 原子指标「订单成交金额」：来源表 qa_test.doris_lineage_dwd，来源字段 order_amount，聚合方式 SUM；
② 派生指标「日成交金额」：基于原子指标「订单成交金额」，统计粒度字段 dt；
③ 复合指标「成交金额占比」：公式 日成交金额 / 订单成交金额。
-- 脚本模式指标「近7日订单金额」使用以下 SQL 创建并发布：
SELECT
  SUM(dwd.order_amount) AS last_7d_order_amount
FROM qa_test.doris_lineage_dwd dwd
JOIN qa_test.doris_lineage_mid mid ON dwd.order_id = mid.order_id
JOIN qa_test.doris_lineage_src src ON mid.order_id = src.order_id
WHERE dwd.dt BETWEEN DATE_SUB('2026-04-02', 6) AND '2026-04-02';
-- 历史指标样例「历史成交金额」按以下回刷 SQL 准备并保留已发布版本：
SELECT
  dt,
  SUM(order_amount) AS history_order_amount
FROM qa_test.doris_lineage_dwd
GROUP BY dt;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据地图 → 表详情 → 血缘关系】页面 | 页面成功加载，字段级血缘切换入口可正常使用。 |
| 2 | 在左侧节点树中选择 Doris2.x meta1 下的 `qa_test.doris_lineage_src` 节点，并切换到【字段级血缘】 | 字段级血缘页面正常打开，当前字段节点可按 Doris2.x 同库同表口径进行合并展示。 |
| 3 | 点击字段 `order_amount` 并观察其上下游字段链路 | 字段血缘能够正常展开，且 meta1/meta2 对应的同物理表字段链路打通。 |
| 4 | 切换到 Doris2.x meta2 下相同物理表字段再次查看 | 字段级链路仍保持连通，不会出现字段链路断开或重复分裂。 |

##### 【P0】验证字段级血缘当前字段高亮居中且仅展示有血缘字段图标

> 前置条件
```
1、环境说明：数据资产、指标平台已部署完成，Doris2.x / Doris3.x 数据源连接正常，且已在数据资产侧完成元数据同步；已同步的数据源名称分别为 `doris2_meta1`（Doris2.x meta1）、`doris2_meta2`（Doris2.x meta2）、`doris3_meta3`（Doris3.x meta3）、`doris3_meta4`（Doris3.x meta4）。

2、Doris2.x 建表与测试数据准备（分别同步到 meta1、meta2 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

3、Doris3.x 建表与测试数据准备（分别同步到 meta3、meta4 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

4、在当前验证目标所在的 Doris2.x 或 Doris3.x 集群上执行以下建链 SQL 与指标准备：
-- 若本次验证 Doris2.x，则在 Doris2.x 集群执行；若本次验证 Doris3.x，则在 Doris3.x 集群执行；两个集群均使用相同库表名 qa_test.*。
-- 表级 / 字段级建链 SQL（先执行 src -> mid，再执行 mid -> dwd）：
INSERT OVERWRITE TABLE qa_test.doris_lineage_mid
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  order_status,
  dt
FROM qa_test.doris_lineage_src;

INSERT OVERWRITE TABLE qa_test.doris_lineage_dwd
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  CASE
    WHEN order_amount >= 120 THEN '微信'
    WHEN order_amount >= 80 THEN '支付宝'
    ELSE '银行卡'
  END AS pay_channel,
  dt
FROM qa_test.doris_lineage_mid;

-- 执行完上述 SQL 后，重新同步 qa_test.doris_lineage_src / qa_test.doris_lineage_mid / qa_test.doris_lineage_dwd，确认图上形成 doris_lineage_src -> doris_lineage_mid -> doris_lineage_dwd 连续链路。
-- 向导模式指标需按以下口径创建并发布成功：
① 原子指标「订单成交金额」：来源表 qa_test.doris_lineage_dwd，来源字段 order_amount，聚合方式 SUM；
② 派生指标「日成交金额」：基于原子指标「订单成交金额」，统计粒度字段 dt；
③ 复合指标「成交金额占比」：公式 日成交金额 / 订单成交金额。
-- 脚本模式指标「近7日订单金额」使用以下 SQL 创建并发布：
SELECT
  SUM(dwd.order_amount) AS last_7d_order_amount
FROM qa_test.doris_lineage_dwd dwd
JOIN qa_test.doris_lineage_mid mid ON dwd.order_id = mid.order_id
JOIN qa_test.doris_lineage_src src ON mid.order_id = src.order_id
WHERE dwd.dt BETWEEN DATE_SUB('2026-04-02', 6) AND '2026-04-02';
-- 历史指标样例「历史成交金额」按以下回刷 SQL 准备并保留已发布版本：
SELECT
  dt,
  SUM(order_amount) AS history_order_amount
FROM qa_test.doris_lineage_dwd
GROUP BY dt;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据地图 → 表详情 → 血缘关系】页面 | 页面成功加载，字段级节点可以居中定位。 |
| 2 | 切换到【字段级血缘】，并点击字段 `customer_id` | 当前字段被高亮并居中展示，页面聚焦到所选字段。 |
| 3 | 观察该字段左右两侧的字段节点标识 | 只有存在血缘关系的字段左侧展示血缘图标，不存在血缘关系的字段不显示图标。 |
| 4 | 切换到其他字段再返回 `customer_id` 字段 | 当前字段高亮状态可重复正确恢复，页面定位不丢失。 |

##### 【P1】验证字段级血缘可展开上下游字段并支持逆向血缘收起

> 前置条件
```
1、环境说明：数据资产、指标平台已部署完成，Doris2.x / Doris3.x 数据源连接正常，且已在数据资产侧完成元数据同步；已同步的数据源名称分别为 `doris2_meta1`（Doris2.x meta1）、`doris2_meta2`（Doris2.x meta2）、`doris3_meta3`（Doris3.x meta3）、`doris3_meta4`（Doris3.x meta4）。

2、Doris2.x 建表与测试数据准备（分别同步到 meta1、meta2 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

3、Doris3.x 建表与测试数据准备（分别同步到 meta3、meta4 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

4、在当前验证目标所在的 Doris2.x 或 Doris3.x 集群上执行以下建链 SQL 与指标准备：
-- 若本次验证 Doris2.x，则在 Doris2.x 集群执行；若本次验证 Doris3.x，则在 Doris3.x 集群执行；两个集群均使用相同库表名 qa_test.*。
-- 表级 / 字段级建链 SQL（先执行 src -> mid，再执行 mid -> dwd）：
INSERT OVERWRITE TABLE qa_test.doris_lineage_mid
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  order_status,
  dt
FROM qa_test.doris_lineage_src;

INSERT OVERWRITE TABLE qa_test.doris_lineage_dwd
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  CASE
    WHEN order_amount >= 120 THEN '微信'
    WHEN order_amount >= 80 THEN '支付宝'
    ELSE '银行卡'
  END AS pay_channel,
  dt
FROM qa_test.doris_lineage_mid;

-- 执行完上述 SQL 后，重新同步 qa_test.doris_lineage_src / qa_test.doris_lineage_mid / qa_test.doris_lineage_dwd，确认图上形成 doris_lineage_src -> doris_lineage_mid -> doris_lineage_dwd 连续链路。
-- 向导模式指标需按以下口径创建并发布成功：
① 原子指标「订单成交金额」：来源表 qa_test.doris_lineage_dwd，来源字段 order_amount，聚合方式 SUM；
② 派生指标「日成交金额」：基于原子指标「订单成交金额」，统计粒度字段 dt；
③ 复合指标「成交金额占比」：公式 日成交金额 / 订单成交金额。
-- 脚本模式指标「近7日订单金额」使用以下 SQL 创建并发布：
SELECT
  SUM(dwd.order_amount) AS last_7d_order_amount
FROM qa_test.doris_lineage_dwd dwd
JOIN qa_test.doris_lineage_mid mid ON dwd.order_id = mid.order_id
JOIN qa_test.doris_lineage_src src ON mid.order_id = src.order_id
WHERE dwd.dt BETWEEN DATE_SUB('2026-04-02', 6) AND '2026-04-02';
-- 历史指标样例「历史成交金额」按以下回刷 SQL 准备并保留已发布版本：
SELECT
  dt,
  SUM(order_amount) AS history_order_amount
FROM qa_test.doris_lineage_dwd
GROUP BY dt;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据地图 → 表详情 → 血缘关系】页面 | 页面成功加载，字段级血缘图可正常查看。 |
| 2 | 切换到【字段级血缘】并点击字段 `order_id` | 当前字段节点被选中，血缘关系以该字段为中心展示。 |
| 3 | 点击字段节点上的【+】展开上下游一级字段血缘 | 页面展开上下游字段节点，且仅展示存在血缘关系的字段。 |
| 4 | 继续展开下游节点并再执行一次收起操作 | 逆向血缘可以继续展开与收起，字段链路层级切换正常。 |

##### 【P1】验证字段级下游节点右键可查看此节点字段血缘并插入上下游字段

> 前置条件
```
1、环境说明：数据资产、指标平台已部署完成，Doris2.x / Doris3.x 数据源连接正常，且已在数据资产侧完成元数据同步；已同步的数据源名称分别为 `doris2_meta1`（Doris2.x meta1）、`doris2_meta2`（Doris2.x meta2）、`doris3_meta3`（Doris3.x meta3）、`doris3_meta4`（Doris3.x meta4）。

2、Doris2.x 建表与测试数据准备（分别同步到 meta1、meta2 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

3、Doris3.x 建表与测试数据准备（分别同步到 meta3、meta4 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

4、在当前验证目标所在的 Doris2.x 或 Doris3.x 集群上执行以下建链 SQL 与指标准备：
-- 若本次验证 Doris2.x，则在 Doris2.x 集群执行；若本次验证 Doris3.x，则在 Doris3.x 集群执行；两个集群均使用相同库表名 qa_test.*。
-- 表级 / 字段级建链 SQL（先执行 src -> mid，再执行 mid -> dwd）：
INSERT OVERWRITE TABLE qa_test.doris_lineage_mid
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  order_status,
  dt
FROM qa_test.doris_lineage_src;

INSERT OVERWRITE TABLE qa_test.doris_lineage_dwd
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  CASE
    WHEN order_amount >= 120 THEN '微信'
    WHEN order_amount >= 80 THEN '支付宝'
    ELSE '银行卡'
  END AS pay_channel,
  dt
FROM qa_test.doris_lineage_mid;

-- 执行完上述 SQL 后，重新同步 qa_test.doris_lineage_src / qa_test.doris_lineage_mid / qa_test.doris_lineage_dwd，确认图上形成 doris_lineage_src -> doris_lineage_mid -> doris_lineage_dwd 连续链路。
-- 向导模式指标需按以下口径创建并发布成功：
① 原子指标「订单成交金额」：来源表 qa_test.doris_lineage_dwd，来源字段 order_amount，聚合方式 SUM；
② 派生指标「日成交金额」：基于原子指标「订单成交金额」，统计粒度字段 dt；
③ 复合指标「成交金额占比」：公式 日成交金额 / 订单成交金额。
-- 脚本模式指标「近7日订单金额」使用以下 SQL 创建并发布：
SELECT
  SUM(dwd.order_amount) AS last_7d_order_amount
FROM qa_test.doris_lineage_dwd dwd
JOIN qa_test.doris_lineage_mid mid ON dwd.order_id = mid.order_id
JOIN qa_test.doris_lineage_src src ON mid.order_id = src.order_id
WHERE dwd.dt BETWEEN DATE_SUB('2026-04-02', 6) AND '2026-04-02';
-- 历史指标样例「历史成交金额」按以下回刷 SQL 准备并保留已发布版本：
SELECT
  dt,
  SUM(order_amount) AS history_order_amount
FROM qa_test.doris_lineage_dwd
GROUP BY dt;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据地图 → 表详情 → 血缘关系】页面 | 页面成功加载，字段级血缘视图可正常切换。 |
| 2 | 切换到【字段级血缘】，点击字段 `order_amount` 并展开下游字段节点 `amount_value` | 下游字段节点成功展开，页面展示与 `order_amount` 相关的下游字段链路。 |
| 3 | 右键下游字段节点 `amount_value` | 右键菜单展示【查看此节点字段血缘】、【插入血缘字段】和【插入影响字段】。 |
| 4 | 点击【查看此节点字段血缘】 | 页面打开所选下游字段节点的完整字段血缘视图，并可继续查看其上下游链路。 |

#### 血缘维护与同步

##### 【P1】验证手工新增表级血缘节点仅在手工节点显示删除入口

> 前置条件
```
1、环境说明：数据资产、指标平台已部署完成，Doris2.x / Doris3.x 数据源连接正常，且已在数据资产侧完成元数据同步；已同步的数据源名称分别为 `doris2_meta1`（Doris2.x meta1）、`doris2_meta2`（Doris2.x meta2）、`doris3_meta3`（Doris3.x meta3）、`doris3_meta4`（Doris3.x meta4）。

2、Doris2.x 建表与测试数据准备（分别同步到 meta1、meta2 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

3、Doris3.x 建表与测试数据准备（分别同步到 meta3、meta4 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

4、在当前验证目标所在的 Doris2.x 或 Doris3.x 集群上执行以下建链 SQL 与指标准备：
-- 若本次验证 Doris2.x，则在 Doris2.x 集群执行；若本次验证 Doris3.x，则在 Doris3.x 集群执行；两个集群均使用相同库表名 qa_test.*。
-- 表级 / 字段级建链 SQL（先执行 src -> mid，再执行 mid -> dwd）：
INSERT OVERWRITE TABLE qa_test.doris_lineage_mid
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  order_status,
  dt
FROM qa_test.doris_lineage_src;

INSERT OVERWRITE TABLE qa_test.doris_lineage_dwd
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  CASE
    WHEN order_amount >= 120 THEN '微信'
    WHEN order_amount >= 80 THEN '支付宝'
    ELSE '银行卡'
  END AS pay_channel,
  dt
FROM qa_test.doris_lineage_mid;

-- 执行完上述 SQL 后，重新同步 qa_test.doris_lineage_src / qa_test.doris_lineage_mid / qa_test.doris_lineage_dwd，确认图上形成 doris_lineage_src -> doris_lineage_mid -> doris_lineage_dwd 连续链路。
-- 向导模式指标需按以下口径创建并发布成功：
① 原子指标「订单成交金额」：来源表 qa_test.doris_lineage_dwd，来源字段 order_amount，聚合方式 SUM；
② 派生指标「日成交金额」：基于原子指标「订单成交金额」，统计粒度字段 dt；
③ 复合指标「成交金额占比」：公式 日成交金额 / 订单成交金额。
-- 脚本模式指标「近7日订单金额」使用以下 SQL 创建并发布：
SELECT
  SUM(dwd.order_amount) AS last_7d_order_amount
FROM qa_test.doris_lineage_dwd dwd
JOIN qa_test.doris_lineage_mid mid ON dwd.order_id = mid.order_id
JOIN qa_test.doris_lineage_src src ON mid.order_id = src.order_id
WHERE dwd.dt BETWEEN DATE_SUB('2026-04-02', 6) AND '2026-04-02';
-- 历史指标样例「历史成交金额」按以下回刷 SQL 准备并保留已发布版本：
SELECT
  dt,
  SUM(order_amount) AS history_order_amount
FROM qa_test.doris_lineage_dwd
GROUP BY dt;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据地图 → 表详情 → 血缘关系】页面 | 页面成功加载，表级手工血缘入口可正常使用。 |
| 2 | 在【表级血缘】中右键当前 root 节点 `qa_test.doris_lineage_dwd`，选择【插入影响表】 | 手工新增表级血缘弹窗正常打开，可输入下游表信息。 |
| 3 | 输入 `doris2_meta1.qa_test.doris_manual_downstream` 并保存 | 页面新增手工下游表节点，且仅该手工节点显示删除入口。 |
| 4 | 分别查看原生表节点 `qa_test.doris_lineage_mid` 和指标节点【日成交金额】的右上角操作区 | 原生血缘节点与指标节点均不显示删除入口，删除圆点只出现在手工节点上。 |

##### 【P1】验证手工新增表级血缘输入格式错误时提示请按格式要求填写数据且不新增节点

> 前置条件
```
1、环境说明：数据资产、指标平台已部署完成，Doris2.x / Doris3.x 数据源连接正常，且已在数据资产侧完成元数据同步；已同步的数据源名称分别为 `doris2_meta1`（Doris2.x meta1）、`doris2_meta2`（Doris2.x meta2）、`doris3_meta3`（Doris3.x meta3）、`doris3_meta4`（Doris3.x meta4）。

2、Doris2.x 建表与测试数据准备（分别同步到 meta1、meta2 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

3、Doris3.x 建表与测试数据准备（分别同步到 meta3、meta4 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

4、在当前验证目标所在的 Doris2.x 或 Doris3.x 集群上执行以下建链 SQL 与指标准备：
-- 若本次验证 Doris2.x，则在 Doris2.x 集群执行；若本次验证 Doris3.x，则在 Doris3.x 集群执行；两个集群均使用相同库表名 qa_test.*。
-- 表级 / 字段级建链 SQL（先执行 src -> mid，再执行 mid -> dwd）：
INSERT OVERWRITE TABLE qa_test.doris_lineage_mid
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  order_status,
  dt
FROM qa_test.doris_lineage_src;

INSERT OVERWRITE TABLE qa_test.doris_lineage_dwd
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  CASE
    WHEN order_amount >= 120 THEN '微信'
    WHEN order_amount >= 80 THEN '支付宝'
    ELSE '银行卡'
  END AS pay_channel,
  dt
FROM qa_test.doris_lineage_mid;

-- 执行完上述 SQL 后，重新同步 qa_test.doris_lineage_src / qa_test.doris_lineage_mid / qa_test.doris_lineage_dwd，确认图上形成 doris_lineage_src -> doris_lineage_mid -> doris_lineage_dwd 连续链路。
-- 向导模式指标需按以下口径创建并发布成功：
① 原子指标「订单成交金额」：来源表 qa_test.doris_lineage_dwd，来源字段 order_amount，聚合方式 SUM；
② 派生指标「日成交金额」：基于原子指标「订单成交金额」，统计粒度字段 dt；
③ 复合指标「成交金额占比」：公式 日成交金额 / 订单成交金额。
-- 脚本模式指标「近7日订单金额」使用以下 SQL 创建并发布：
SELECT
  SUM(dwd.order_amount) AS last_7d_order_amount
FROM qa_test.doris_lineage_dwd dwd
JOIN qa_test.doris_lineage_mid mid ON dwd.order_id = mid.order_id
JOIN qa_test.doris_lineage_src src ON mid.order_id = src.order_id
WHERE dwd.dt BETWEEN DATE_SUB('2026-04-02', 6) AND '2026-04-02';
-- 历史指标样例「历史成交金额」按以下回刷 SQL 准备并保留已发布版本：
SELECT
  dt,
  SUM(order_amount) AS history_order_amount
FROM qa_test.doris_lineage_dwd
GROUP BY dt;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据地图 → 表详情 → 血缘关系】页面 | 页面成功加载，表级手工血缘入口可正常使用。 |
| 2 | 在【表级血缘】中右键当前 root 节点 `qa_test.doris_lineage_dwd`，选择【插入影响表】 | 手工新增表级血缘弹窗正常打开，并展示输入格式说明。 |
| 3 | 输入缺少数据源名称的 `qa_test.doris_manual_downstream` 并保存 | 页面提示【请按格式要求填写数据！】，当前输入内容不被接受。 |
| 4 | 关闭弹窗后重新查看当前血缘图 | 血缘图中不会新增手工节点，现有表级链路保持不变。 |

##### 【P1】验证手工删除表级血缘后页面即时移除对应节点

> 前置条件
```
1、环境说明：数据资产、指标平台已部署完成，Doris2.x / Doris3.x 数据源连接正常，且已在数据资产侧完成元数据同步；已同步的数据源名称分别为 `doris2_meta1`（Doris2.x meta1）、`doris2_meta2`（Doris2.x meta2）、`doris3_meta3`（Doris3.x meta3）、`doris3_meta4`（Doris3.x meta4）。

2、Doris2.x 建表与测试数据准备（分别同步到 meta1、meta2 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

3、Doris3.x 建表与测试数据准备（分别同步到 meta3、meta4 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

4、在当前验证目标所在的 Doris2.x 或 Doris3.x 集群上执行以下建链 SQL 与指标准备：
-- 若本次验证 Doris2.x，则在 Doris2.x 集群执行；若本次验证 Doris3.x，则在 Doris3.x 集群执行；两个集群均使用相同库表名 qa_test.*。
-- 表级 / 字段级建链 SQL（先执行 src -> mid，再执行 mid -> dwd）：
INSERT OVERWRITE TABLE qa_test.doris_lineage_mid
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  order_status,
  dt
FROM qa_test.doris_lineage_src;

INSERT OVERWRITE TABLE qa_test.doris_lineage_dwd
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  CASE
    WHEN order_amount >= 120 THEN '微信'
    WHEN order_amount >= 80 THEN '支付宝'
    ELSE '银行卡'
  END AS pay_channel,
  dt
FROM qa_test.doris_lineage_mid;

-- 执行完上述 SQL 后，重新同步 qa_test.doris_lineage_src / qa_test.doris_lineage_mid / qa_test.doris_lineage_dwd，确认图上形成 doris_lineage_src -> doris_lineage_mid -> doris_lineage_dwd 连续链路。
-- 向导模式指标需按以下口径创建并发布成功：
① 原子指标「订单成交金额」：来源表 qa_test.doris_lineage_dwd，来源字段 order_amount，聚合方式 SUM；
② 派生指标「日成交金额」：基于原子指标「订单成交金额」，统计粒度字段 dt；
③ 复合指标「成交金额占比」：公式 日成交金额 / 订单成交金额。
-- 脚本模式指标「近7日订单金额」使用以下 SQL 创建并发布：
SELECT
  SUM(dwd.order_amount) AS last_7d_order_amount
FROM qa_test.doris_lineage_dwd dwd
JOIN qa_test.doris_lineage_mid mid ON dwd.order_id = mid.order_id
JOIN qa_test.doris_lineage_src src ON mid.order_id = src.order_id
WHERE dwd.dt BETWEEN DATE_SUB('2026-04-02', 6) AND '2026-04-02';
-- 历史指标样例「历史成交金额」按以下回刷 SQL 准备并保留已发布版本：
SELECT
  dt,
  SUM(order_amount) AS history_order_amount
FROM qa_test.doris_lineage_dwd
GROUP BY dt;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据地图 → 表详情 → 血缘关系】页面 | 页面成功加载，表级血缘图可正常展示。 |
| 2 | 在【表级血缘】中右键当前 root 节点 `qa_test.doris_lineage_dwd`，选择【插入影响表】，输入 `doris2_meta1.qa_test.doris_manual_downstream` 并保存 | 页面新增手工下游表节点，且该节点右上角显示删除入口。 |
| 3 | 点击手工下游表节点的删除入口并确认删除 | 页面提示删除成功，手工血缘节点从图中移除。 |
| 4 | 刷新页面并重新查看同一条表级链路 | 被删除的手工表级血缘不再出现，链路恢复为删除后的状态。 |

##### 【P1】验证手工新增字段级血缘节点仅在手工节点显示删除入口

> 前置条件
```
1、环境说明：数据资产、指标平台已部署完成，Doris2.x / Doris3.x 数据源连接正常，且已在数据资产侧完成元数据同步；已同步的数据源名称分别为 `doris2_meta1`（Doris2.x meta1）、`doris2_meta2`（Doris2.x meta2）、`doris3_meta3`（Doris3.x meta3）、`doris3_meta4`（Doris3.x meta4）。

2、Doris2.x 建表与测试数据准备（分别同步到 meta1、meta2 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

3、Doris3.x 建表与测试数据准备（分别同步到 meta3、meta4 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

4、在当前验证目标所在的 Doris2.x 或 Doris3.x 集群上执行以下建链 SQL 与指标准备：
-- 若本次验证 Doris2.x，则在 Doris2.x 集群执行；若本次验证 Doris3.x，则在 Doris3.x 集群执行；两个集群均使用相同库表名 qa_test.*。
-- 表级 / 字段级建链 SQL（先执行 src -> mid，再执行 mid -> dwd）：
INSERT OVERWRITE TABLE qa_test.doris_lineage_mid
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  order_status,
  dt
FROM qa_test.doris_lineage_src;

INSERT OVERWRITE TABLE qa_test.doris_lineage_dwd
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  CASE
    WHEN order_amount >= 120 THEN '微信'
    WHEN order_amount >= 80 THEN '支付宝'
    ELSE '银行卡'
  END AS pay_channel,
  dt
FROM qa_test.doris_lineage_mid;

-- 执行完上述 SQL 后，重新同步 qa_test.doris_lineage_src / qa_test.doris_lineage_mid / qa_test.doris_lineage_dwd，确认图上形成 doris_lineage_src -> doris_lineage_mid -> doris_lineage_dwd 连续链路。
-- 向导模式指标需按以下口径创建并发布成功：
① 原子指标「订单成交金额」：来源表 qa_test.doris_lineage_dwd，来源字段 order_amount，聚合方式 SUM；
② 派生指标「日成交金额」：基于原子指标「订单成交金额」，统计粒度字段 dt；
③ 复合指标「成交金额占比」：公式 日成交金额 / 订单成交金额。
-- 脚本模式指标「近7日订单金额」使用以下 SQL 创建并发布：
SELECT
  SUM(dwd.order_amount) AS last_7d_order_amount
FROM qa_test.doris_lineage_dwd dwd
JOIN qa_test.doris_lineage_mid mid ON dwd.order_id = mid.order_id
JOIN qa_test.doris_lineage_src src ON mid.order_id = src.order_id
WHERE dwd.dt BETWEEN DATE_SUB('2026-04-02', 6) AND '2026-04-02';
-- 历史指标样例「历史成交金额」按以下回刷 SQL 准备并保留已发布版本：
SELECT
  dt,
  SUM(order_amount) AS history_order_amount
FROM qa_test.doris_lineage_dwd
GROUP BY dt;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据地图 → 表详情 → 血缘关系】页面 | 页面成功加载，字段级手工血缘入口可正常使用。 |
| 2 | 切换到【字段级血缘】，右键当前字段 `order_amount` 并选择【插入影响字段】 | 手工新增字段血缘弹窗正常打开，可输入下游字段信息。 |
| 3 | 输入 `doris2_meta1.qa_test.doris_manual_field_dst.amount_value` 并保存 | 页面新增手工下游字段节点，且仅该手工字段节点显示删除入口。 |
| 4 | 分别查看原生字段节点 `order_amount` 和现有非手工字段节点的右上角操作区 | 原生字段节点和非手工字段节点均不显示删除入口，删除圆点只出现在手工字段节点上。 |

##### 【P1】验证手工删除字段级血缘后页面即时移除对应字段节点

> 前置条件
```
1、环境说明：数据资产、指标平台已部署完成，Doris2.x / Doris3.x 数据源连接正常，且已在数据资产侧完成元数据同步；已同步的数据源名称分别为 `doris2_meta1`（Doris2.x meta1）、`doris2_meta2`（Doris2.x meta2）、`doris3_meta3`（Doris3.x meta3）、`doris3_meta4`（Doris3.x meta4）。

2、Doris2.x 建表与测试数据准备（分别同步到 meta1、meta2 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

3、Doris3.x 建表与测试数据准备（分别同步到 meta3、meta4 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

4、在当前验证目标所在的 Doris2.x 或 Doris3.x 集群上执行以下建链 SQL 与指标准备：
-- 若本次验证 Doris2.x，则在 Doris2.x 集群执行；若本次验证 Doris3.x，则在 Doris3.x 集群执行；两个集群均使用相同库表名 qa_test.*。
-- 表级 / 字段级建链 SQL（先执行 src -> mid，再执行 mid -> dwd）：
INSERT OVERWRITE TABLE qa_test.doris_lineage_mid
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  order_status,
  dt
FROM qa_test.doris_lineage_src;

INSERT OVERWRITE TABLE qa_test.doris_lineage_dwd
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  CASE
    WHEN order_amount >= 120 THEN '微信'
    WHEN order_amount >= 80 THEN '支付宝'
    ELSE '银行卡'
  END AS pay_channel,
  dt
FROM qa_test.doris_lineage_mid;

-- 执行完上述 SQL 后，重新同步 qa_test.doris_lineage_src / qa_test.doris_lineage_mid / qa_test.doris_lineage_dwd，确认图上形成 doris_lineage_src -> doris_lineage_mid -> doris_lineage_dwd 连续链路。
-- 向导模式指标需按以下口径创建并发布成功：
① 原子指标「订单成交金额」：来源表 qa_test.doris_lineage_dwd，来源字段 order_amount，聚合方式 SUM；
② 派生指标「日成交金额」：基于原子指标「订单成交金额」，统计粒度字段 dt；
③ 复合指标「成交金额占比」：公式 日成交金额 / 订单成交金额。
-- 脚本模式指标「近7日订单金额」使用以下 SQL 创建并发布：
SELECT
  SUM(dwd.order_amount) AS last_7d_order_amount
FROM qa_test.doris_lineage_dwd dwd
JOIN qa_test.doris_lineage_mid mid ON dwd.order_id = mid.order_id
JOIN qa_test.doris_lineage_src src ON mid.order_id = src.order_id
WHERE dwd.dt BETWEEN DATE_SUB('2026-04-02', 6) AND '2026-04-02';
-- 历史指标样例「历史成交金额」按以下回刷 SQL 准备并保留已发布版本：
SELECT
  dt,
  SUM(order_amount) AS history_order_amount
FROM qa_test.doris_lineage_dwd
GROUP BY dt;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据地图 → 表详情 → 血缘关系】页面 | 页面成功加载，字段级血缘视图可正常切换。 |
| 2 | 切换到【字段级血缘】，右键当前字段 `order_amount` 选择【插入影响字段】，输入 `doris2_meta1.qa_test.doris_manual_field_dst.amount_value` 并保存 | 页面新增手工下游字段节点，且该节点右上角显示删除入口。 |
| 3 | 点击手工下游字段节点的删除入口并确认删除 | 页面提示删除成功，手工字段血缘节点从图中移除。 |
| 4 | 刷新页面并重新查看同一字段链路 | 被删除的手工字段血缘不再出现，字段链路恢复为删除后的状态。 |

##### 【P1】验证向导模式生成的原子派生复合指标均可展示血缘关系

> 前置条件
```
1、环境说明：数据资产、指标平台已部署完成，Doris2.x / Doris3.x 数据源连接正常，且已在数据资产侧完成元数据同步；已同步的数据源名称分别为 `doris2_meta1`（Doris2.x meta1）、`doris2_meta2`（Doris2.x meta2）、`doris3_meta3`（Doris3.x meta3）、`doris3_meta4`（Doris3.x meta4）。

2、Doris2.x 建表与测试数据准备（分别同步到 meta1、meta2 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

3、Doris3.x 建表与测试数据准备（分别同步到 meta3、meta4 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

4、在当前验证目标所在的 Doris2.x 或 Doris3.x 集群上执行以下建链 SQL 与指标准备：
-- 若本次验证 Doris2.x，则在 Doris2.x 集群执行；若本次验证 Doris3.x，则在 Doris3.x 集群执行；两个集群均使用相同库表名 qa_test.*。
-- 表级 / 字段级建链 SQL（先执行 src -> mid，再执行 mid -> dwd）：
INSERT OVERWRITE TABLE qa_test.doris_lineage_mid
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  order_status,
  dt
FROM qa_test.doris_lineage_src;

INSERT OVERWRITE TABLE qa_test.doris_lineage_dwd
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  CASE
    WHEN order_amount >= 120 THEN '微信'
    WHEN order_amount >= 80 THEN '支付宝'
    ELSE '银行卡'
  END AS pay_channel,
  dt
FROM qa_test.doris_lineage_mid;

-- 执行完上述 SQL 后，重新同步 qa_test.doris_lineage_src / qa_test.doris_lineage_mid / qa_test.doris_lineage_dwd，确认图上形成 doris_lineage_src -> doris_lineage_mid -> doris_lineage_dwd 连续链路。
-- 向导模式指标需按以下口径创建并发布成功：
① 原子指标「订单成交金额」：来源表 qa_test.doris_lineage_dwd，来源字段 order_amount，聚合方式 SUM；
② 派生指标「日成交金额」：基于原子指标「订单成交金额」，统计粒度字段 dt；
③ 复合指标「成交金额占比」：公式 日成交金额 / 订单成交金额。
-- 脚本模式指标「近7日订单金额」使用以下 SQL 创建并发布：
SELECT
  SUM(dwd.order_amount) AS last_7d_order_amount
FROM qa_test.doris_lineage_dwd dwd
JOIN qa_test.doris_lineage_mid mid ON dwd.order_id = mid.order_id
JOIN qa_test.doris_lineage_src src ON mid.order_id = src.order_id
WHERE dwd.dt BETWEEN DATE_SUB('2026-04-02', 6) AND '2026-04-02';
-- 历史指标样例「历史成交金额」按以下回刷 SQL 准备并保留已发布版本：
SELECT
  dt,
  SUM(order_amount) AS history_order_amount
FROM qa_test.doris_lineage_dwd
GROUP BY dt;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据地图 → 表详情 → 血缘关系】页面 | 页面成功加载，指标血缘节点可正常展示。 |
| 2 | 定位向导模式创建的原子指标【订单成交金额】并切换到其血缘关系 | 原子指标可正常展示表到指标的血缘关系。 |
| 3 | 继续查看派生指标【日成交金额】和复合指标【成交金额占比】 | 派生指标和复合指标均能展示对应的上游来源链路。 |
| 4 | 依次展开三类指标的上游节点 | 三类指标的血缘关系均可正常展开，且链路与预期一致。 |

##### 【P1】验证脚本模式自定义SQL指标可解析并展示血缘关系

> 前置条件
```
1、环境说明：数据资产、指标平台已部署完成，Doris2.x / Doris3.x 数据源连接正常，且已在数据资产侧完成元数据同步；已同步的数据源名称分别为 `doris2_meta1`（Doris2.x meta1）、`doris2_meta2`（Doris2.x meta2）、`doris3_meta3`（Doris3.x meta3）、`doris3_meta4`（Doris3.x meta4）。

2、Doris2.x 建表与测试数据准备（分别同步到 meta1、meta2 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

3、Doris3.x 建表与测试数据准备（分别同步到 meta3、meta4 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

4、在当前验证目标所在的 Doris2.x 或 Doris3.x 集群上执行以下建链 SQL 与指标准备：
-- 若本次验证 Doris2.x，则在 Doris2.x 集群执行；若本次验证 Doris3.x，则在 Doris3.x 集群执行；两个集群均使用相同库表名 qa_test.*。
-- 表级 / 字段级建链 SQL（先执行 src -> mid，再执行 mid -> dwd）：
INSERT OVERWRITE TABLE qa_test.doris_lineage_mid
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  order_status,
  dt
FROM qa_test.doris_lineage_src;

INSERT OVERWRITE TABLE qa_test.doris_lineage_dwd
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  CASE
    WHEN order_amount >= 120 THEN '微信'
    WHEN order_amount >= 80 THEN '支付宝'
    ELSE '银行卡'
  END AS pay_channel,
  dt
FROM qa_test.doris_lineage_mid;

-- 执行完上述 SQL 后，重新同步 qa_test.doris_lineage_src / qa_test.doris_lineage_mid / qa_test.doris_lineage_dwd，确认图上形成 doris_lineage_src -> doris_lineage_mid -> doris_lineage_dwd 连续链路。
-- 向导模式指标需按以下口径创建并发布成功：
① 原子指标「订单成交金额」：来源表 qa_test.doris_lineage_dwd，来源字段 order_amount，聚合方式 SUM；
② 派生指标「日成交金额」：基于原子指标「订单成交金额」，统计粒度字段 dt；
③ 复合指标「成交金额占比」：公式 日成交金额 / 订单成交金额。
-- 脚本模式指标「近7日订单金额」使用以下 SQL 创建并发布：
SELECT
  SUM(dwd.order_amount) AS last_7d_order_amount
FROM qa_test.doris_lineage_dwd dwd
JOIN qa_test.doris_lineage_mid mid ON dwd.order_id = mid.order_id
JOIN qa_test.doris_lineage_src src ON mid.order_id = src.order_id
WHERE dwd.dt BETWEEN DATE_SUB('2026-04-02', 6) AND '2026-04-02';
-- 历史指标样例「历史成交金额」按以下回刷 SQL 准备并保留已发布版本：
SELECT
  dt,
  SUM(order_amount) AS history_order_amount
FROM qa_test.doris_lineage_dwd
GROUP BY dt;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据地图 → 表详情 → 血缘关系】页面 | 页面成功加载，自定义 SQL 指标节点可被定位。 |
| 2 | 定位脚本模式创建的自定义 SQL 指标【近7日订单金额】，确认其 SQL 同时使用 `${bizdate}` 动态参数、`SUM(order_amount)` 聚合、子查询和 CASE 逻辑，并引用 `qa_test.doris_lineage_src`、`qa_test.doris_lineage_dwd` 两张表 | 该指标可正常进入血缘视图，页面展示与 SQL 解析结果一致的上游表节点。 |
| 3 | 展开该指标的上游表节点并继续查看字段链路 | 页面能够解析并展示两张来源表及相关字段链路，不会因动态参数、聚合或子查询导致链路缺失。 |
| 4 | 进入【指标平台 → 指标详情 → 血缘关系】辅助入口对比同一指标 | 指标平台侧与资产侧展示的血缘主干一致，自定义 SQL 指标的上下游关系均可正常查看。 |

##### 【P0】验证指标删除或下线后资产侧血缘关系同步刷新

> 前置条件
```
1、环境说明：数据资产、指标平台已部署完成，Doris2.x / Doris3.x 数据源连接正常，且已在数据资产侧完成元数据同步；已同步的数据源名称分别为 `doris2_meta1`（Doris2.x meta1）、`doris2_meta2`（Doris2.x meta2）、`doris3_meta3`（Doris3.x meta3）、`doris3_meta4`（Doris3.x meta4）。

2、Doris2.x 建表与测试数据准备（分别同步到 meta1、meta2 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

3、Doris3.x 建表与测试数据准备（分别同步到 meta3、meta4 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

4、在当前验证目标所在的 Doris2.x 或 Doris3.x 集群上执行以下建链 SQL 与指标准备：
-- 若本次验证 Doris2.x，则在 Doris2.x 集群执行；若本次验证 Doris3.x，则在 Doris3.x 集群执行；两个集群均使用相同库表名 qa_test.*。
-- 表级 / 字段级建链 SQL（先执行 src -> mid，再执行 mid -> dwd）：
INSERT OVERWRITE TABLE qa_test.doris_lineage_mid
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  order_status,
  dt
FROM qa_test.doris_lineage_src;

INSERT OVERWRITE TABLE qa_test.doris_lineage_dwd
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  CASE
    WHEN order_amount >= 120 THEN '微信'
    WHEN order_amount >= 80 THEN '支付宝'
    ELSE '银行卡'
  END AS pay_channel,
  dt
FROM qa_test.doris_lineage_mid;

-- 执行完上述 SQL 后，重新同步 qa_test.doris_lineage_src / qa_test.doris_lineage_mid / qa_test.doris_lineage_dwd，确认图上形成 doris_lineage_src -> doris_lineage_mid -> doris_lineage_dwd 连续链路。
-- 向导模式指标需按以下口径创建并发布成功：
① 原子指标「订单成交金额」：来源表 qa_test.doris_lineage_dwd，来源字段 order_amount，聚合方式 SUM；
② 派生指标「日成交金额」：基于原子指标「订单成交金额」，统计粒度字段 dt；
③ 复合指标「成交金额占比」：公式 日成交金额 / 订单成交金额。
-- 脚本模式指标「近7日订单金额」使用以下 SQL 创建并发布：
SELECT
  SUM(dwd.order_amount) AS last_7d_order_amount
FROM qa_test.doris_lineage_dwd dwd
JOIN qa_test.doris_lineage_mid mid ON dwd.order_id = mid.order_id
JOIN qa_test.doris_lineage_src src ON mid.order_id = src.order_id
WHERE dwd.dt BETWEEN DATE_SUB('2026-04-02', 6) AND '2026-04-02';
-- 历史指标样例「历史成交金额」按以下回刷 SQL 准备并保留已发布版本：
SELECT
  dt,
  SUM(order_amount) AS history_order_amount
FROM qa_test.doris_lineage_dwd
GROUP BY dt;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据地图 → 表详情 → 血缘关系】页面 | 页面成功加载，指标节点可正常展示当前同步状态。 |
| 2 | 定位历史 Doris 指标【历史成交金额】并查看其血缘关系 | 历史指标在升级后仍可被定位，血缘关系仍然可见。 |
| 3 | 在指标平台将该指标执行下线或删除后返回资产侧页面 | 资产侧页面可继续刷新查看该指标的同步结果。 |
| 4 | 刷新血缘关系页面并重新定位该指标 | 指标删除或下线后的资产侧同步结果已更新，页面显示与指标平台状态一致。 |

##### 【P1】验证历史Doris指标数据升级后仍可继续查看血缘关系

> 前置条件
```
1、环境说明：数据资产、指标平台已部署完成，Doris2.x / Doris3.x 数据源连接正常，且已在数据资产侧完成元数据同步；已同步的数据源名称分别为 `doris2_meta1`（Doris2.x meta1）、`doris2_meta2`（Doris2.x meta2）、`doris3_meta3`（Doris3.x meta3）、`doris3_meta4`（Doris3.x meta4）。

2、Doris2.x 建表与测试数据准备（分别同步到 meta1、meta2 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

3、Doris3.x 建表与测试数据准备（分别同步到 meta3、meta4 两个元数据源，形成同库同表两条记录）：
CREATE DATABASE IF NOT EXISTS qa_test;
DROP TABLE IF EXISTS qa_test.doris_lineage_src;
DROP TABLE IF EXISTS qa_test.doris_lineage_mid;
DROP TABLE IF EXISTS qa_test.doris_lineage_dwd;
DROP TABLE IF EXISTS qa_test.doris_manual_upstream;
DROP TABLE IF EXISTS qa_test.doris_manual_downstream;
DROP TABLE IF EXISTS qa_test.doris_manual_field_src;
DROP TABLE IF EXISTS qa_test.doris_manual_field_dst;

CREATE TABLE qa_test.doris_lineage_src (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_mid (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  order_status VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_lineage_dwd (
  order_id BIGINT,
  customer_id BIGINT,
  product_id BIGINT,
  order_amount DECIMAL(18,2),
  pay_channel VARCHAR(20),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_upstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_downstream (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_src (
  order_id BIGINT,
  order_amount DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

CREATE TABLE qa_test.doris_manual_field_dst (
  order_id BIGINT,
  amount_value DECIMAL(18,2),
  dt DATE
) DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 3
PROPERTIES ("replication_allocation" = "tag.location.default: 1");

INSERT INTO qa_test.doris_lineage_src VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_mid VALUES
  (1001, 20001, 30001, 129.90, '已支付', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '已支付', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '待支付', '2026-04-02');
INSERT INTO qa_test.doris_lineage_dwd VALUES
  (1001, 20001, 30001, 129.90, '微信', '2026-04-01'),
  (1002, 20002, 30002, 89.00, '支付宝', '2026-04-01'),
  (1003, 20003, 30003, 56.50, '银行卡', '2026-04-02');
INSERT INTO qa_test.doris_manual_upstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_downstream VALUES
  (9001, 300.00, '2026-04-01'),
  (9002, 520.00, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_src VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');
INSERT INTO qa_test.doris_manual_field_dst VALUES
  (9101, 88.80, '2026-04-01'),
  (9102, 66.60, '2026-04-02');

4、在当前验证目标所在的 Doris2.x 或 Doris3.x 集群上执行以下建链 SQL 与指标准备：
-- 若本次验证 Doris2.x，则在 Doris2.x 集群执行；若本次验证 Doris3.x，则在 Doris3.x 集群执行；两个集群均使用相同库表名 qa_test.*。
-- 表级 / 字段级建链 SQL（先执行 src -> mid，再执行 mid -> dwd）：
INSERT OVERWRITE TABLE qa_test.doris_lineage_mid
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  order_status,
  dt
FROM qa_test.doris_lineage_src;

INSERT OVERWRITE TABLE qa_test.doris_lineage_dwd
SELECT
  order_id,
  customer_id,
  product_id,
  order_amount,
  CASE
    WHEN order_amount >= 120 THEN '微信'
    WHEN order_amount >= 80 THEN '支付宝'
    ELSE '银行卡'
  END AS pay_channel,
  dt
FROM qa_test.doris_lineage_mid;

-- 执行完上述 SQL 后，重新同步 qa_test.doris_lineage_src / qa_test.doris_lineage_mid / qa_test.doris_lineage_dwd，确认图上形成 doris_lineage_src -> doris_lineage_mid -> doris_lineage_dwd 连续链路。
-- 向导模式指标需按以下口径创建并发布成功：
① 原子指标「订单成交金额」：来源表 qa_test.doris_lineage_dwd，来源字段 order_amount，聚合方式 SUM；
② 派生指标「日成交金额」：基于原子指标「订单成交金额」，统计粒度字段 dt；
③ 复合指标「成交金额占比」：公式 日成交金额 / 订单成交金额。
-- 脚本模式指标「近7日订单金额」使用以下 SQL 创建并发布：
SELECT
  SUM(dwd.order_amount) AS last_7d_order_amount
FROM qa_test.doris_lineage_dwd dwd
JOIN qa_test.doris_lineage_mid mid ON dwd.order_id = mid.order_id
JOIN qa_test.doris_lineage_src src ON mid.order_id = src.order_id
WHERE dwd.dt BETWEEN DATE_SUB('2026-04-02', 6) AND '2026-04-02';
-- 历史指标样例「历史成交金额」按以下回刷 SQL 准备并保留已发布版本：
SELECT
  dt,
  SUM(order_amount) AS history_order_amount
FROM qa_test.doris_lineage_dwd
GROUP BY dt;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据地图 → 表详情 → 血缘关系】页面 | 页面成功加载，历史 Doris 指标节点可正常展示。 |
| 2 | 定位历史升级前创建的 Doris 指标【历史成交金额】 | 升级后的历史指标仍可在页面中被识别并定位。 |
| 3 | 展开该指标的上游表和字段链路 | 升级前的历史指标数据仍能继续查看完整血缘关系，不会出现链路丢失。 |
| 4 | 刷新页面后再次定位该历史指标 | 刷新后历史 Doris 指标血缘仍保持可见，升级后兼容性正常。 |
