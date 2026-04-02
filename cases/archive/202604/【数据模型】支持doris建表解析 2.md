---
suite_name: 【数据模型】支持doris建表解析 v7.0.2
description: 【数据模型】支持doris建表解析 v7.0.2
prd_id: 15693
prd_version: v7.0.2
prd_path: cases/requirements/data-assets/v6.4.10/.trash/PRD-15693-raw.md
product: data-assets
tags:
  - 数据资产
  - 数据资产-数据模型
  - 数据模型
  - 支持doris建表解析
create_at: 2026-03-29
status: ""
health_warnings: []
case_count: 10
origin: csv
---
> 来源：zentao-cases/dtstack-platform/数据资产/archive-cases/v7.0.2/【数据模型】支持doris建表解析.csv
> 用例数：10

---

## 数据资产-数据模型

##### 【P2】验证Doris建表语句模式建表-客户SQL校验

> 前置条件
```
CREATE TABLE `ods_gate_common_rebate_ref_code_df` (
`part_date` date NULL COMMENT '分区字段 按日分区',
`id` bigint NULL COMMENT '业务主键ID',
`ref_code` varchar(255) NULL COMMENT '邀请码',
`uid` int NULL COMMENT '用户uid',
`type` tinyint NULL COMMENT '类型',
`updated_at` datetime(6) NULL COMMENT '更新时间',
`created_at` datetime(6) NULL COMMENT '创建时间',
`status` tinyint NULL COMMENT '状态'
) ENGINE=OLAP
UNIQUE KEY(`part_date`, `id`)
COMMENT '用户邀请码表'
PARTITION BY RANGE(`part_date`)
(PARTITION p20250624 VALUES [('2025-06-24'), ('2025-06-25')),
PARTITION p20250625 VALUES [('2025-06-25'), ('2025-06-26')),
PARTITION p20250626 VALUES [('2025-06-26'), ('2025-06-27')),
PARTITION p20250627 VALUES [('2025-06-27'), ('2025-06-28')),
PARTITION p20250628 VALUES [('2025-06-28'), ('2025-06-29')),
PARTITION p20250629 VALUES [('2025-06-29'), ('2025-06-30')),
PARTITION p20250630 VALUES [('2025-06-30'), ('2025-07-01')),
PARTITION p20250701 VALUES [('2025-07-01'), ('2025-07-02')),
PARTITION p20250702 VALUES [('2025-07-02'), ('2025-07-03')))
DISTRIBUTED BY HASH(`id`) BUCKETS 3
PROPERTIES (
“replication_allocation“ = “tag.location.default: 3“,
“min_load_replica_num“ = “-1“,
“is_being_synced“ = “false“,
“dynamic_partition.enable“ = “true“,
“dynamic_partition.time_unit“ = “DAY“,
“dynamic_partition.time_zone“ = “Etc/UTC“,
“dynamic_partition.start“ = “-7“,
“dynamic_partition.end“ = “1“,
“dynamic_partition.prefix“ = “p“,
“dynamic_partition.replication_allocation“ = “tag.location.default: 3“,
“dynamic_partition.buckets“ = “3“,
“dynamic_partition.create_history_partition“ = “false“,
“dynamic_partition.history_partition_num“ = “-1“,
“dynamic_partition.hot_partition_num“ = “0“,
“dynamic_partition.reserved_history_periods“ = “NULL“,
“dynamic_partition.storage_policy“ = “,
“storage_medium“ = “hdd“,
“storage_format“ = “V2“,
“inverted_index_storage_format“ = “V1“,
“enable_unique_key_merge_on_write“ = “true“,
“light_schema_change“ = “true“,
“disable_auto_compaction“ = “false“,
“enable_single_replica_compaction“ = “false“,
“group_commit_interval_ms“ = “10000“,
“group_commit_data_bytes“ = “134217728“,
“enable_mow_light_delete“ = “false“
);
CREATE TABLE `ods_gateio_social_mt_vote_user_hi` (
`id` int NULL COMMENT '自增id',
`uid` varchar(255) NULL COMMENT '用户id',
`mid` int NULL COMMENT '帖子id',
`vid` int NULL COMMENT '选项id',
`create_timest` datetime NULL COMMENT '此条数据创建时间',
`this_create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '此条数据创建时间'
) ENGINE=OLAP
UNIQUE KEY(`id`)
COMMENT '用户投票表'
DISTRIBUTED BY HASH(`id`) BUCKETS 4
PROPERTIES (
“replication_allocation“ = “tag.location.default: 3“,
“min_load_replica_num“ = “-1“,
“is_being_synced“ = “false“,
“storage_medium“ = “hdd“,
“storage_format“ = “V2“,
“inverted_index_storage_format“ = “V1“,
“enable_unique_key_merge_on_write“ = “true“,
“light_schema_change“ = “true“,
“disable_auto_compaction“ = “false“,
“enable_single_replica_compaction“ = “false“,
“group_commit_interval_ms“ = “10000“,
“group_commit_data_bytes“ = “134217728“,
“enable_mow_light_delete“ = “false“
);
CREATE TABLE `ods_strategybot_user_info_df` (
`part_date` date NULL COMMENT '业务日期，分区日期',
`id` bigint NULL,
`user_id` int NOT NULL DEFAULT “0“,
`nickname` varchar(255) NOT NULL DEFAULT “,
`tier` tinyint NOT NULL,
`avatar` varchar(255) NOT NULL DEFAULT “,
`anonymous` varchar(255) NOT NULL,
`create_time` int NOT NULL,
`update_time` int NOT NULL,
`nick` varchar(256) NOT NULL DEFAULT “,
`nick_en` varchar(256) NOT NULL DEFAULT “,
`hide_name` varchar(256) NOT NULL DEFAULT “,
`verified` tinyint NOT NULL DEFAULT “0“,
`country_id` int NOT NULL DEFAULT “0“,
`risk_noticed` tinyint NOT NULL DEFAULT “0“
) ENGINE=OLAP
UNIQUE KEY(`part_date`, `id`, `user_id`)
COMMENT '量化用户信息全量表'
PARTITION BY RANGE(`part_date`)
(PARTITION p202301 VALUES [('2023-01-01'), ('2023-02-01')),
PARTITION p202302 VALUES [('2023-02-01'), ('2023-03-01')),
PARTITION p202303 VALUES [('2023-03-01'), ('2023-04-01')),
PARTITION p202304 VALUES [('2023-04-01'), ('2023-05-01')),
PARTITION p202305 VALUES [('2023-05-01'), ('2023-06-01')),
PARTITION p202306 VALUES [('2023-06-01'), ('2023-07-01')),
PARTITION p202307 VALUES [('2023-07-01'), ('2023-08-01')),
PARTITION p202308 VALUES [('2023-08-01'), ('2023-09-01')),
PARTITION p202309 VALUES [('2023-09-01'), ('2023-10-01')),
PARTITION p202310 VALUES [('2023-10-01'), ('2023-11-01')),
PARTITION p202311 VALUES [('2023-11-01'), ('2023-12-01')),
PARTITION p202312 VALUES [('2023-12-01'), ('2024-01-01')),
PARTITION p202401 VALUES [('2024-01-01'), ('2024-02-01')),
PARTITION p202402 VALUES [('2024-02-01'), ('2024-03-01')),
PARTITION p202403 VALUES [('2024-03-01'), ('2024-04-01')),
PARTITION p202404 VALUES [('2024-04-01'), ('2024-05-01')),
PARTITION p202405 VALUES [('2024-05-01'), ('2024-06-01')),
PARTITION p202406 VALUES [('2024-06-01'), ('2024-07-01')),
PARTITION p202407 VALUES [('2024-07-01'), ('2024-08-01')),
PARTITION p202408 VALUES [('2024-08-01'), ('2024-09-01')),
PARTITION p202409 VALUES [('2024-09-01'), ('2024-10-01')),
PARTITION p202410 VALUES [('2024-10-01'), ('2024-11-01')),
PARTITION p202411 VALUES [('2024-11-01'), ('2024-12-01')),
PARTITION p202412 VALUES [('2024-12-01'), ('2025-01-01')),
PARTITION p202501 VALUES [('2025-01-01'), ('2025-02-01')),
PARTITION p202502 VALUES [('2025-02-01'), ('2025-03-01')),
PARTITION p202503 VALUES [('2025-03-01'), ('2025-04-01')),
PARTITION p202504 VALUES [('2025-04-01'), ('2025-05-01')),
PARTITION p202505 VALUES [('2025-05-01'), ('2025-06-01')),
PARTITION p202506 VALUES [('2025-06-01'), ('2025-07-01')),
PARTITION p202507 VALUES [('2025-07-01'), ('2025-08-01')),
PARTITION p202508 VALUES [('2025-08-01'), ('2025-09-01')),
PARTITION p202509 VALUES [('2025-09-01'), ('2025-10-01')),
PARTITION p202510 VALUES [('2025-10-01'), ('2025-11-01')))
DISTRIBUTED BY HASH(`part_date`) BUCKETS 8
PROPERTIES (
“replication_allocation“ = “tag.location.default: 3“,
“min_load_replica_num“ = “-1“,
“is_being_synced“ = “false“,
“dynamic_partition.enable“ = “true“,
“dynamic_partition.time_unit“ = “MONTH“,
“dynamic_partition.time_zone“ = “UTC“,
“dynamic_partition.start“ = “-36“,
“dynamic_partition.end“ = “3“,
“dynamic_partition.prefix“ = “p“,
“dynamic_partition.replication_allocation“ = “tag.location.default: 3“,
“dynamic_partition.buckets“ = “8“,
“dynamic_partition.create_history_partition“ = “false“,
“dynamic_partition.history_partition_num“ = “-1“,
“dynamic_partition.hot_partition_num“ = “0“,
“dynamic_partition.reserved_history_periods“ = “NULL“,
“dynamic_partition.storage_policy“ = “,
“dynamic_partition.start_day_of_month“ = “1“,
“storage_medium“ = “hdd“,
“storage_format“ = “V2“,
“inverted_index_storage_format“ = “V1“,
“enable_unique_key_merge_on_write“ = “false“,
“light_schema_change“ = “true“,
“function_column.sequence_col“ = “part_date“,
“disable_auto_compaction“ = “false“,
“enable_single_replica_compaction“ = “false“,
“group_commit_interval_ms“ = “10000“,
“group_commit_data_bytes“ = “134217728“
);
CREATE TABLE `ods_rebate_social_transaction_record_hi` (
`id` bigint NOT NULL COMMENT '主键id',
`type` varchar(255) NULL COMMENT '类型',
`time` datetime NULL COMMENT '时间',
`order_id` bigint NULL COMMENT '订单id',
`trade_id` bigint NULL COMMENT '交易id',
`user_id` bigint NULL COMMENT '用户id',
`market` varchar(65533) NULL COMMENT 'market',
`role` smallint NULL COMMENT '角色',
`deal_price` decimal(38,10) NULL COMMENT 'deal_price',
`fee` decimal(38,10) NULL COMMENT 'fee',
`deal_fee` decimal(38,10) NULL COMMENT 'deal_fee',
`status` smallint NULL COMMENT '状态',
`reconciliation_status` smallint NULL COMMENT '对账状态',
`remark` varchar(255) NULL COMMENT '评述',
`rebate_total` decimal(38,10) NULL COMMENT '返利',
`amount` decimal(38,10) NULL COMMENT 'amount',
`asset` varchar(255) NULL COMMENT '资产',
`ref_uid` bigint NULL COMMENT '返佣_uid',
`rebate_link_info` json NULL COMMENT '返利信息',
`point_fee` decimal(38,10) NULL COMMENT '点卡fee',
`deal_point_fee` decimal(38,10) NULL COMMENT '交易点卡fee',
`gt_fee` decimal(38,10) NULL COMMENT 'gt_fee',
`deal_gt_fee` decimal(38,10) NULL COMMENT '交易gt_fee',
`price` decimal(38,10) NULL COMMENT '价格',
`rebate_total_u` decimal(38,10) NULL COMMENT '返利',
`transfer_info` json NULL COMMENT '转移信息',
`channel_id` varchar(255) NULL COMMENT '渠道id',
`fee_u` decimal(38,10) NULL COMMENT 'fee_u',
`deal_fee_u` decimal(38,10) NULL COMMENT 'deal_fee_u',
`action_id` bigint NULL COMMENT '行为id',
`deal_price_u` decimal(38,10) NULL COMMENT '交易价格',
`total_fee_u` decimal(38,10) NULL COMMENT 'total_fee_u',
`created_at` datetime NULL COMMENT '创建时间',
`updated_at` datetime NULL COMMENT '更新时间',
`this_create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '此条数据创建时间'
) ENGINE=OLAP
UNIQUE KEY(`id`)
COMMENT '社交返利交易记录'
DISTRIBUTED BY HASH(`id`) BUCKETS 4
PROPERTIES (
“replication_allocation“ = “tag.location.default: 3“,
“min_load_replica_num“ = “-1“,
“is_being_synced“ = “false“,
“storage_medium“ = “hdd“,
“storage_format“ = “V2“,
“inverted_index_storage_format“ = “V1“,
“enable_unique_key_merge_on_write“ = “true“,
“light_schema_change“ = “true“,
“disable_auto_compaction“ = “false“,
“enable_single_replica_compaction“ = “false“,
“group_commit_interval_ms“ = “10000“,
“group_commit_data_bytes“ = “134217728“,
“enable_mow_light_delete“ = “false“
);
CREATE TABLE `ods_memebox_asset_info_10mf` (
`part_time` datetime NULL COMMENT '分区',
`web3_chain_name` varchar(255) NULL COMMENT 'web3链名，v2/chain/list的chain',
`contract_addr` varchar(255) NULL COMMENT '合约地址',
`blue_chip_index` text NULL COMMENT '蓝筹指数',
`brief_c` text NULL COMMENT '中文简介',
`brief_en` text NULL COMMENT '英文简介',
`brief_tw` text NULL COMMENT '繁体简介',
`chain_icon` text NULL COMMENT '链图标',
`cir_rate` text NULL COMMENT '流通率，市值/全流通市值',
`cir_supply` text NULL COMMENT '流通供应量',
`coin_num_accu` int NULL COMMENT '币种数量精度',
`coin_price_accu` int NULL COMMENT '币种价格精度',
`coin_short_name` text NULL COMMENT '币种简称',
`data_status` int NULL COMMENT '数据状态，1：正常交易，2：暂停交易，3：下架',
`full_cir_market_value` text NULL COMMENT '全流通市值',
`holding_addr_num` text NULL COMMENT '持有地址数量',
`inno_chain_name` text NULL COMMENT '创新交易链名,get-coinbd-all-chain的gate_chain',
`insider_trading` text NULL COMMENT '内幕交易',
`logo_url` text NULL COMMENT '币种logo',
`logo_url_hd` text NULL COMMENT '高清币种logo',
`market_rank` text NULL COMMENT '市值',
`market_value` text NULL COMMENT '市值',
`meme_chain_name` text NULL COMMENT 'memebox的链名',
`memebox_id` text NULL COMMENT 'Memebox的ID',
`official_addr` text NULL COMMENT '官网地址',
`pair` text NULL COMMENT '池子地址',
`publish_date` text NULL COMMENT '发布时间',
`smart_money_num` text NULL COMMENT '聪明钱数量',
`telegram` text NULL COMMENT '电报',
`telegram_group_members` text NULL COMMENT 'Telegram 群组成员数量',
`top_10` text NULL COMMENT '前 10',
`total_supply` text NULL COMMENT '总供应量',
`trading_symbols` text NULL COMMENT '交易符号',
`web3_key` text NULL COMMENT 'web3 key， v2/chain/list的web3_key',
`x_addr` text NULL COMMENT 'Twitter(X)地址',
`x_followers` text NULL COMMENT 'X 关注者数量'
) ENGINE=OLAP
UNIQUE KEY(`part_time`, `web3_chain_name`, `contract_addr`)
COMMENT 'ods-memebox币种信息配置表'
PARTITION BY RANGE(`part_time`)
(PARTITION p202503 VALUES [('2025-03-01 00:00:00'), ('2025-04-01 00:00:00')),
PARTITION p202504 VALUES [('2025-04-01 00:00:00'), ('2025-05-01 00:00:00')),
PARTITION p202505 VALUES [('2025-05-01 00:00:00'), ('2025-06-01 00:00:00')),
PARTITION p202506 VALUES [('2025-06-01 00:00:00'), ('2025-07-01 00:00:00')),
PARTITION p202507 VALUES [('2025-07-01 00:00:00'), ('2025-08-01 00:00:00')),
PARTITION p202508 VALUES [('2025-08-01 00:00:00'), ('2025-09-01 00:00:00')),
PARTITION p202509 VALUES [('2025-09-01 00:00:00'), ('2025-10-01 00:00:00')),
PARTITION p202510 VALUES [('2025-10-01 00:00:00'), ('2025-11-01 00:00:00')))
DISTRIBUTED BY HASH(`web3_chain_name`, `contract_addr`) BUCKETS 3
PROPERTIES (
“replication_allocation“ = “tag.location.default: 3“,
“min_load_replica_num“ = “-1“,
“is_being_synced“ = “false“,
“dynamic_partition.enable“ = “true“,
“dynamic_partition.time_unit“ = “MONTH“,
“dynamic_partition.time_zone“ = “Etc/UTC“,
“dynamic_partition.start“ = “-2147483648“,
“dynamic_partition.end“ = “3“,
“dynamic_partition.prefix“ = “p“,
“dynamic_partition.replication_allocation“ = “tag.location.default: 3“,
“dynamic_partition.buckets“ = “3“,
“dynamic_partition.create_history_partition“ = “false“,
“dynamic_partition.history_partition_num“ = “-1“,
“dynamic_partition.hot_partition_num“ = “0“,
“dynamic_partition.reserved_history_periods“ = “NULL“,
“dynamic_partition.storage_policy“ = “,
“dynamic_partition.start_day_of_month“ = “1“,
“storage_medium“ = “hdd“,
“storage_format“ = “V2“,
“inverted_index_storage_format“ = “V1“,
“enable_unique_key_merge_on_write“ = “true“,
“light_schema_change“ = “true“,
“disable_auto_compaction“ = “false“,
“enable_single_replica_compaction“ = “false“,
“group_commit_interval_ms“ = “10000“,
“group_commit_data_bytes“ = “134217728“,
“enable_mow_light_delete“ = “false“
);
CREATE TABLE `ods_launchpool_launchpool_reward_logs_backup_hi` (
`id` int NULL COMMENT '自增ID',
`uid` int NULL COMMENT '用户ID',
`part_hour` datetime NULL COMMENT '分区',
`pid` int NULL COMMENT '产品ID',
`reward_pool_id` int NULL COMMENT '奖池ID',
`coin` varchar(255) NULL COMMENT '币种',
`amount` decimal(30,10) NULL COMMENT '奖励金额',
`valid_mortgage_amount` decimal(30,10) NULL COMMENT '有效质押数',
`mortgage_coin` varchar(50) NULL COMMENT '抵押币种名称',
`create_timest` datetime NULL COMMENT '创建时间',
`update_timest` datetime NULL COMMENT '更新时间',
`reward_timest` datetime NULL COMMENT '奖励日期',
`status` tinyint NULL COMMENT '状态 0待发 1成功 2失败',
`ext` varchar(255) NULL COMMENT '扩展字段',
`related_coin` varchar(255) NULL COMMENT '关联币种',
`related_coin_valid_amount` decimal(30,10) NULL COMMENT '关联币种有效质押数'
) ENGINE=OLAP
UNIQUE KEY(`id`, `uid`, `part_hour`)
COMMENT '新币挖矿奖励流水记录'
PARTITION BY RANGE(`part_hour`)
(PARTITION p202405 VALUES [('2024-05-01 00:00:00'), ('2024-06-01 00:00:00')),
PARTITION p202406 VALUES [('2024-06-01 00:00:00'), ('2024-07-01 00:00:00')),
PARTITION p202407 VALUES [('2024-07-01 00:00:00'), ('2024-08-01 00:00:00')),
PARTITION p202408 VALUES [('2024-08-01 00:00:00'), ('2024-09-01 00:00:00')),
PARTITION p202409 VALUES [('2024-09-01 00:00:00'), ('2024-10-01 00:00:00')),
PARTITION p202410 VALUES [('2024-10-01 00:00:00'), ('2024-11-01 00:00:00')),
PARTITION p202411 VALUES [('2024-11-01 00:00:00'), ('2024-12-01 00:00:00')),
PARTITION p202412 VALUES [('2024-12-01 00:00:00'), ('2025-01-01 00:00:00')),
PARTITION p202501 VALUES [('2025-01-01 00:00:00'), ('2025-02-01 00:00:00')),
PARTITION p202502 VALUES [('2025-02-01 00:00:00'), ('2025-03-01 00:00:00')),
PARTITION p202503 VALUES [('2025-03-01 00:00:00'), ('2025-04-01 00:00:00')),
PARTITION p202504 VALUES [('2025-04-01 00:00:00'), ('2025-05-01 00:00:00')),
PARTITION p202505 VALUES [('2025-05-01 00:00:00'), ('2025-06-01 00:00:00')),
PARTITION p202506 VALUES [('2025-06-01 00:00:00'), ('2025-07-01 00:00:00')),
PARTITION p202507 VALUES [('2025-07-01 00:00:00'), ('2025-08-01 00:00:00')),
PARTITION p202508 VALUES [('2025-08-01 00:00:00'), ('2025-09-01 00:00:00')),
PARTITION p202509 VALUES [('2025-09-01 00:00:00'), ('2025-10-01 00:00:00')),
PARTITION p202510 VALUES [('2025-10-01 00:00:00'), ('2025-11-01 00:00:00')),
PARTITION p202511 VALUES [('2025-11-01 00:00:00'), ('2025-12-01 00:00:00')),
PARTITION p202512 VALUES [('2025-12-01 00:00:00'), ('2026-01-01 00:00:00')))
DISTRIBUTED BY HASH(`part_hour`) BUCKETS 3
PROPERTIES (
“replication_allocation“ = “tag.location.default: 3“,
“min_load_replica_num“ = “-1“,
“is_being_synced“ = “false“,
“dynamic_partition.enable“ = “true“,
“dynamic_partition.time_unit“ = “MONTH“,
“dynamic_partition.time_zone“ = “Etc/UTC“,
“dynamic_partition.start“ = “-2147483648“,
“dynamic_partition.end“ = “1“,
“dynamic_partition.prefix“ = “p“,
“dynamic_partition.replication_allocation“ = “tag.location.default: 3“,
“dynamic_partition.buckets“ = “3“,
“dynamic_partition.create_history_partition“ = “false“,
“dynamic_partition.history_partition_num“ = “-1“,
“dynamic_partition.hot_partition_num“ = “0“,
“dynamic_partition.reserved_history_periods“ = “NULL“,
“dynamic_partition.storage_policy“ = “,
“dynamic_partition.start_day_of_month“ = “1“,
“storage_medium“ = “hdd“,
“storage_format“ = “V2“,
“inverted_index_storage_format“ = “V1“,
“enable_unique_key_merge_on_write“ = “false“,
“light_schema_change“ = “true“,
“disable_auto_compaction“ = “false“,
“enable_single_replica_compaction“ = “false“,
“group_commit_interval_ms“ = “10000“,
“group_commit_data_bytes“ = “134217728“
);
CREATE TABLE `tmp_thomas_0701` (
`source_db_name` varchar(255) NULL,
`source_table_name` varchar(255) NULL,
`source_column_name` varchar(255) NULL,
`result_db_name` varchar(255) NULL,
`result_table_name` varchar(255) NULL,
`result_column_name` varchar(255) NULL,
`create_time` varchar(255) NULL,
`modified_time` varchar(255) NULL,
`is_delete` tinyint NULL
) ENGINE=OLAP
DUPLICATE KEY(`source_db_name`)
DISTRIBUTED BY HASH(`source_db_name`) BUCKETS 10
PROPERTIES (
“replication_allocation“ = “tag.location.default: 3“,
“min_load_replica_num“ = “-1“,
“is_being_synced“ = “false“,
“storage_medium“ = “hdd“,
“storage_format“ = “V2“,
“inverted_index_storage_format“ = “V1“,
“light_schema_change“ = “true“,
“disable_auto_compaction“ = “false“,
“enable_single_replica_compaction“ = “false“,
“group_commit_interval_ms“ = “10000“,
“group_commit_data_bytes“ = “134217728“
);
CREATE TABLE `hanlin_kafka_int_test` (
`c1` int NULL
) ENGINE=OLAP
DUPLICATE KEY(`c1`)
DISTRIBUTED BY RANDOM BUCKETS AUTO
PROPERTIES (
“replication_allocation“ = “tag.location.default: 3“,
“min_load_replica_num“ = “-1“,
“is_being_synced“ = “false“,
“storage_medium“ = “hdd“,
“storage_format“ = “V2“,
“inverted_index_storage_format“ = “V1“,
“light_schema_change“ = “true“,
“disable_auto_compaction“ = “false“,
“enable_single_replica_compaction“ = “false“,
“group_commit_interval_ms“ = “10000“,
“group_commit_data_bytes“ = “134217728“
);
CREATE TABLE `dwd_meta_lineage_column_full` (
`source_db_name` varchar(255) NULL,
`source_table_name` varchar(255) NULL,
`source_column_name` varchar(255) NULL,
`result_db_name` varchar(255) NULL,
`result_table_name` varchar(255) NULL,
`result_column_name` varchar(255) NULL,
`create_time` varchar(255) NULL,
`modified_time` varchar(255) NULL,
`is_delete` tinyint NULL
) ENGINE=OLAP
DUPLICATE KEY(`source_db_name`)
DISTRIBUTED BY HASH(`source_db_name`) BUCKETS 10
PROPERTIES (
“replication_allocation“ = “tag.location.default: 3“,
“min_load_replica_num“ = “-1“,
“is_being_synced“ = “false“,
“storage_medium“ = “hdd“,
“storage_format“ = “V2“,
“inverted_index_storage_format“ = “V1“,
“light_schema_change“ = “true“,
“disable_auto_compaction“ = “false“,
“enable_single_replica_compaction“ = “false“,
“group_commit_interval_ms“ = “10000“,
“group_commit_data_bytes“ = “134217728“
);
CREATE TABLE `ods_gatelive_video_stats_hi` (
`pk_id` int NOT NULL COMMENT '主键ID',
`stream_id` varchar(255) NULL COMMENT '直播ID',
`timestamp` int NULL COMMENT '生成时间戳',
`online_users` int NULL COMMENT '在线用户数',
`likes` int NULL COMMENT '点赞数量',
`max_online_users` int NULL COMMENT '最大在线人数',
`this_create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '此条数据创建时间'
) ENGINE=OLAP
UNIQUE KEY(`pk_id`)
COMMENT 'video_stats表'
DISTRIBUTED BY HASH(`pk_id`) BUCKETS 4
PROPERTIES (
“replication_allocation“ = “tag.location.default: 3“,
“min_load_replica_num“ = “-1“,
“is_being_synced“ = “false“,
“storage_medium“ = “hdd“,
“storage_format“ = “V2“,
“inverted_index_storage_format“ = “V1“,
“enable_unique_key_merge_on_write“ = “true“,
“light_schema_change“ = “true“,
“disable_auto_compaction“ = “false“,
“enable_single_replica_compaction“ = “false“,
“group_commit_interval_ms“ = “10000“,
“group_commit_data_bytes“ = “134217728“,
“enable_mow_light_delete“ = “false“
);
CREATE TABLE `ods_gatelive_video_hf` (
`pk_id` int NULL COMMENT '主键ID',
`id` varchar(255) NULL COMMENT '视频ID',
`stream_id` varchar(255) NULL COMMENT '直播ID，该视频关联的直播活动 ID，只有直播回放视频该字段有值',
`started_at` datetime NULL COMMENT '录播开始时间，只有直播回放视频该字段有值',
`ended_at` datetime NULL COMMENT '录播结束时间，只有直播回放视频该字段有值',
`created_at` datetime NULL COMMENT '视频创建时间',
`status` varchar(255) NULL COMMENT '视频状态',
`duration` int NULL COMMENT '视频时长，单位为 s',
`title` varchar(765) NULL COMMENT '视频标题',
`cover` varchar(765) NULL COMMENT '封面图片地址',
`watched` int NULL COMMENT '视频观看次数',
`creator` varchar(255) NULL COMMENT '主播ID',
`pull_domain` varchar(255) NULL COMMENT '拉流域名地址',
`require_sub` tinyint NULL COMMENT 'require_sub',
`region_id` varchar(255) NULL COMMENT '区域名称',
`weight` int NULL COMMENT '权重',
`session_id` varchar(765) NULL COMMENT '同stream表session_id',
`notes` text NULL COMMENT '录播简介',
`file_id` varchar(765) NULL COMMENT '文件ID',
`im_sync_status` tinyint NULL COMMENT '1-标记该视频已经更新',
`this_create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '此条数据创建时间'
) ENGINE=OLAP
UNIQUE KEY(`pk_id`)
COMMENT '录播（回放）表'
DISTRIBUTED BY HASH(`pk_id`) BUCKETS 4
PROPERTIES (
“replication_allocation“ = “tag.location.default: 3“,
“min_load_replica_num“ = “-1“,
“is_being_synced“ = “false“,
“storage_medium“ = “hdd“,
“storage_format“ = “V2“,
“inverted_index_storage_format“ = “V1“,
“enable_unique_key_merge_on_write“ = “true“,
“light_schema_change“ = “true“,
“disable_auto_compaction“ = “false“,
“enable_single_replica_compaction“ = “false“,
“group_commit_interval_ms“ = “10000“,
“group_commit_data_bytes“ = “134217728“,
“enable_mow_light_delete“ = “false“
);
CREATE TABLE `ods_gatelive_stream_hi` (
`pk_id` int NOT NULL COMMENT '主键ID',
`id` varchar(255) NULL COMMENT 'id',
`name` varchar(255) NULL COMMENT '名称',
`app` varchar(255) NULL COMMENT 'app',
`stream` varchar(255) NULL COMMENT '直播',
`deleted` tinyint NULL COMMENT '是否删除',
`status` tinyint NULL COMMENT '0: idle, 1: streaming, 2: closed',
`domain_id` varchar(255) NULL COMMENT 'domain_id',
`host_id` varchar(255) NULL COMMENT '主播id',
`chatroom_id` varchar(255) NULL COMMENT 'chatroom_id',
`chat_group_id` varchar(255) NULL COMMENT 'chat_group_id',
`cover` varchar(765) NULL COMMENT 'cover',
`placeholder` varchar(765) NULL COMMENT 'placeholder',
`created_at` datetime NULL COMMENT '创建时间',
`updated_at` datetime NULL COMMENT '更新时间',
`started_at` bigint NULL COMMENT '开始时间',
`last` int NULL COMMENT 'last',
`notes` text NULL COMMENT 'notes',
`stat` text NULL COMMENT 'stat',
`notified` tinyint NULL COMMENT 'notified',
`broadcast` tinyint NULL COMMENT 'broadcast',
`push_domain` varchar(765) NULL COMMENT 'push_domain',
`has_vod` tinyint NULL COMMENT 'has_vod',
`region_id` varchar(255) NULL COMMENT 'region_id',
`horizontal` tinyint NULL COMMENT 'horizontal',
`can_invite` tinyint NULL COMMENT 'can_invite',
`tags` varchar(765) NULL COMMENT '标签',
`require_sub` tinyint NULL COMMENT 'require_sub',
`weight` int NULL COMMENT '权重',
`session_id` varchar(765) NULL COMMENT 'session_id',
`origin` tinyint NULL COMMENT '1 阿里 2 腾讯',
`yt_channel_id` varchar(255) NULL COMMENT 'yt_channel_id',
`this_create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '此条数据创建时间'
) ENGINE=OLAP
UNIQUE KEY(`pk_id`)
COMMENT '主播表'
DISTRIBUTED BY HASH(`pk_id`) BUCKETS 4
PROPERTIES (
“replication_allocation“ = “tag.location.default: 3“,
“min_load_replica_num“ = “-1“,
“is_being_synced“ = “false“,
“storage_medium“ = “hdd“,
“storage_format“ = “V2“,
“inverted_index_storage_format“ = “V1“,
“enable_unique_key_merge_on_write“ = “true“,
“light_schema_change“ = “true“,
“disable_auto_compaction“ = “false“,
“enable_single_replica_compaction“ = “false“,
“group_commit_interval_ms“ = “10000“,
“group_commit_data_bytes“ = “134217728“,
“enable_mow_light_delete“ = “false“
);
CREATE TABLE `ods_gatelive_space_record_hi` (
`pk_id` int NOT NULL COMMENT '主键ID',
`stream_id` varchar(255) NULL COMMENT '直播ID',
`session_id` varchar(255) NULL COMMENT '场次ID',
`name` varchar(255) NULL COMMENT '主题',
`record_status` tinyint NULL COMMENT '状态 0 - 未录制完成 1 - 录制完成',
`host_id` varchar(255) NULL COMMENT '主播ID',
`language` varchar(32) NULL COMMENT '语言',
`post_id` int NULL COMMENT '动态发帖ID',
`url` varchar(255) NULL COMMENT '语音播放地址',
`status` int NULL COMMENT '状态',
`duration` int NULL COMMENT '语音时长 单位S',
`operator_uid` varchar(255) NULL COMMENT '操作者uid',
`operator_at` int NULL COMMENT '操作',
`start_at` int NULL COMMENT '语音直播开始时间',
`end_at` int NULL COMMENT '语音直播结束时间',
`created_at` datetime NULL COMMENT '记录创建时间',
`updated_at` datetime NULL COMMENT '记录跟新时间',
`this_create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '此条数据创建时间'
) ENGINE=OLAP
UNIQUE KEY(`pk_id`)
COMMENT 'space开播表'
DISTRIBUTED BY HASH(`pk_id`) BUCKETS 4
PROPERTIES (
“replication_allocation“ = “tag.location.default: 3“,
“min_load_replica_num“ = “-1“,
“is_being_synced“ = “false“,
“storage_medium“ = “hdd“,
“storage_format“ = “V2“,
“inverted_index_storage_format“ = “V1“,
“enable_unique_key_merge_on_write“ = “true“,
“light_schema_change“ = “true“,
“disable_auto_compaction“ = “false“,
“enable_single_replica_compaction“ = “false“,
“group_commit_interval_ms“ = “10000“,
“group_commit_data_bytes“ = “134217728“,
“enable_mow_light_delete“ = “false“
);
CREATE TABLE `ods_gatelive_space_host_hi` (
`pk_id` int NULL COMMENT '主建id',
`user_id` bigint NULL COMMENT '用户id',
`first_at` bigint NULL COMMENT '首次开播时间（单位毫秒)',
`last_at` bigint NULL COMMENT '最近一次开播时间（单位毫秒)',
`cnt` int NULL COMMENT '开播次数',
`created_at` datetime NULL COMMENT '创建时间',
`updated_at` datetime NULL COMMENT '更新时间',
`this_create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '此条数据创建时间'
) ENGINE=OLAP
UNIQUE KEY(`pk_id`)
COMMENT 'space主播表'
DISTRIBUTED BY HASH(`pk_id`) BUCKETS 4
PROPERTIES (
“replication_allocation“ = “tag.location.default: 3“,
“min_load_replica_num“ = “-1“,
“is_being_synced“ = “false“,
“storage_medium“ = “hdd“,
“storage_format“ = “V2“,
“inverted_index_storage_format“ = “V1“,
“enable_unique_key_merge_on_write“ = “true“,
“light_schema_change“ = “true“,
“disable_auto_compaction“ = “false“,
“enable_single_replica_compaction“ = “false“,
“group_commit_interval_ms“ = “10000“,
“group_commit_data_bytes“ = “134217728“,
“enable_mow_light_delete“ = “false“
);
CREATE TABLE `ods_gatelive_host_hi` (
`pk_id` int NOT NULL COMMENT '主键ID',
`id` varchar(255) NULL COMMENT '主播ID',
`name` varchar(255) NULL COMMENT '主播名称',
`avatar` varchar(765) NULL COMMENT '头像地址',
`description` text NULL COMMENT '主播描述',
`deleted` tinyint NULL COMMENT '是否删除 0-未删除 1-已删除',
`created_at` datetime NULL COMMENT '创建时间',
`updated_at` datetime NULL COMMENT '更新时间',
`tips` text NULL COMMENT '主播相关提示信息，按默认语种为中文来处理',
`tags` varchar(765) NULL COMMENT '主播标签',
`language` varchar(255) NULL COMMENT '主播语言',
`contact` varchar(255) NULL COMMENT '主播联系方式',
`reason` text NULL COMMENT '申请理由',
`weight` int NULL COMMENT '权重',
`fans` int NULL COMMENT '粉丝总量',
`contact_type` varchar(255) NULL COMMENT '主播联系方式类型',
`name_en` varchar(255) NULL COMMENT '主播英文名',
`tier_timest` int NULL COMMENT 'vip等级到期时间',
`tier` int NULL COMMENT 'vip等级',
`login_name` varchar(255) NULL COMMENT '登录时间',
`first_time` datetime NULL COMMENT '首次开播时间',
`this_create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '此条数据创建时间'
) ENGINE=OLAP
UNIQUE KEY(`pk_id`)
COMMENT '主播表'
DISTRIBUTED BY HASH(`pk_id`) BUCKETS 4
PROPERTIES (
“replication_allocation“ = “tag.location.default: 3“,
“min_load_replica_num“ = “-1“,
“is_being_synced“ = “false“,
“storage_medium“ = “hdd“,
“storage_format“ = “V2“,
“inverted_index_storage_format“ = “V1“,
“enable_unique_key_merge_on_write“ = “true“,
“light_schema_change“ = “true“,
“disable_auto_compaction“ = “false“,
“enable_single_replica_compaction“ = “false“,
“group_commit_interval_ms“ = “10000“,
“group_commit_data_bytes“ = “134217728“,
“enable_mow_light_delete“ = “false“
);
CREATE TABLE `ods_gateio_social_mt_reward_records_hi` (
`id` bigint NOT NULL COMMENT '自增id',
`mid` bigint NULL COMMENT '动态ID',
`uid` bigint NULL COMMENT '用户id',
`name` varchar(765) NULL COMMENT '用户名',
`reward_uid` bigint NULL COMMENT '被打赏人ID',
`asset` varchar(255) NULL COMMENT '币种',
`amount` decimal(18,6) NULL COMMENT '打赏数量',
`order_id` varchar(255) NULL COMMENT '订单ID',
`tx_id` varchar(255) NULL COMMENT '交易流水号',
`status` tinyint NULL COMMENT '打赏状态（0：用户扣款成功，主播未收到打赏;1：打赏成功；)',
`create_timest` datetime NULL COMMENT '创建时间',
`update_timest` datetime NULL COMMENT '更新时间',
`this_create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '此条数据创建时间'
) ENGINE=OLAP
UNIQUE KEY(`id`)
COMMENT '社交-动态打赏表'
DISTRIBUTED BY HASH(`id`) BUCKETS 4
PROPERTIES (
“replication_allocation“ = “tag.location.default: 3“,
“min_load_replica_num“ = “-1“,
“is_being_synced“ = “false“,
“storage_medium“ = “hdd“,
“storage_format“ = “V2“,
“inverted_index_storage_format“ = “V1“,
“enable_unique_key_merge_on_write“ = “true“,
“light_schema_change“ = “true“,
“disable_auto_compaction“ = “false“,
“enable_single_replica_compaction“ = “false“,
“group_commit_interval_ms“ = “10000“,
“group_commit_data_bytes“ = “134217728“,
“enable_mow_light_delete“ = “false“
);
CREATE TABLE `ods_gateio_social_mt_news_user_statistics_hi` (
`id` int NOT NULL COMMENT '自增id',
`uid` int NULL COMMENT '用户id',
`following_count` int NULL COMMENT '新增关注数',
`cancel_following_count` int NULL COMMENT '取消关注数',
`shielding_count` int NULL COMMENT '新增屏蔽数',
`cancel_shielding_count` int NULL COMMENT '取消屏蔽数',
`create_timest` datetime NULL COMMENT '创建时间',
`update_timest` datetime NULL COMMENT '更新时间',
`like_count` int NULL COMMENT '点赞数',
`comment_count` int NULL COMMENT '评论数',
`share_count` int NULL COMMENT '分享数',
`reward_count` decimal(18,6) NULL COMMENT 'reward_count',
`date` datetime NULL COMMENT '时间',
`post_count` int NULL COMMENT '发帖数',
`text_count` int NULL COMMENT '短文本数量',
`long_text_count` int NULL COMMENT '长文本数量',
`video_count` int NULL COMMENT '视频动态数量',
`page_view` int NULL COMMENT '浏览量',
`this_create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '此条数据创建时间'
) ENGINE=OLAP
UNIQUE KEY(`id`)
COMMENT '动态用户统计表'
DISTRIBUTED BY HASH(`id`) BUCKETS 4
PROPERTIES (
“replication_allocation“ = “tag.location.default: 3“,
“min_load_replica_num“ = “-1“,
“is_being_synced“ = “false“,
“storage_medium“ = “hdd“,
“storage_format“ = “V2“,
“inverted_index_storage_format“ = “V1“,
“enable_unique_key_merge_on_write“ = “true“,
“light_schema_change“ = “true“,
“disable_auto_compaction“ = “false“,
“enable_single_replica_compaction“ = “false“,
“group_commit_interval_ms“ = “10000“,
“group_commit_data_bytes“ = “134217728“,
“enable_mow_light_delete“ = “false“
);
CREATE TABLE `ods_gateio_social_mt_news_user_message_statistics_hi` (
`id` int NOT NULL COMMENT '自增主键',
`mid` int NULL COMMENT '动态id',
`page_view` int NULL COMMENT 'pv',
`unique_view` int NULL COMMENT 'uv',
`like_count` int NULL COMMENT '点赞数',
`comment_count` int NULL COMMENT '评论数',
`share_count` int NULL COMMENT '分享数',
`reward_count` decimal(18,6) NULL COMMENT '赞数数单位 usdt',
`create_timest` datetime NULL COMMENT '创建时间',
`update_timest` datetime NULL COMMENT '更新时间',
`uid` int NULL COMMENT '用户id',
`date` datetime NULL COMMENT '时间',
`type` varchar(255) NULL COMMENT '动态类型',
`this_create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '此条数据创建时间'
) ENGINE=OLAP
UNIQUE KEY(`id`)
COMMENT '动态帖子统计表'
DISTRIBUTED BY HASH(`id`) BUCKETS 4
PROPERTIES (
“replication_allocation“ = “tag.location.default: 3“,
“min_load_replica_num“ = “-1“,
“is_being_synced“ = “false“,
“storage_medium“ = “hdd“,
“storage_format“ = “V2“,
“inverted_index_storage_format“ = “V1“,
“enable_unique_key_merge_on_write“ = “true“,
“light_schema_change“ = “true“,
“disable_auto_compaction“ = “false“,
“enable_single_replica_compaction“ = “false“,
“group_commit_interval_ms“ = “10000“,
“group_commit_data_bytes“ = “134217728“,
“enable_mow_light_delete“ = “false“
);
CREATE TABLE `ods_social_live_region_hf` (
`region_id` char(30) NULL COMMENT 'region_id',
`region_name` varchar(255) NULL COMMENT '地区',
`this_create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '此条数据创建时间'
) ENGINE=OLAP
UNIQUE KEY(`region_id`)
COMMENT '社交-直播地区表'
DISTRIBUTED BY HASH(`region_id`) BUCKETS 4
PROPERTIES (
“replication_allocation“ = “tag.location.default: 3“,
“min_load_replica_num“ = “-1“,
“is_being_synced“ = “false“,
“storage_medium“ = “hdd“,
“storage_format“ = “V2“,
“inverted_index_storage_format“ = “V1“,
“enable_unique_key_merge_on_write“ = “true“,
“light_schema_change“ = “true“,
“disable_auto_compaction“ = “false“,
“enable_single_replica_compaction“ = “false“,
“group_commit_interval_ms“ = “10000“,
“group_commit_data_bytes“ = “134217728“,
“enable_mow_light_delete“ = “false“
);
CREATE TABLE `ods_fx_history_usdt_liquidates_di` (
`part_date` date NOT NULL COMMENT '按天分区',
`time` datetime(6) NOT NULL COMMENT '成交时间',
`order_id` bigint NOT NULL,
`user_id` bigint NOT NULL COMMENT '成交用户ID',
`contract` text NOT NULL COMMENT '交易币对',
`leverage` decimal(38,18) NOT NULL,
`size` bigint NOT NULL COMMENT '买卖数量，负数代表卖出',
`margin` decimal(38,18) NOT NULL,
`entry_price` decimal(38,18) NOT NULL,
`liq_price` decimal(38,18) NOT NULL,
`mark_price` decimal(38,18) NOT NULL,
`order_price` decimal(38,18) NOT NULL,
`fill_price` decimal(38,18) NOT NULL,
`left` bigint NOT NULL,
`order_size` bigint NULL,
`text` text NULL COMMENT '成交相关的一些文本信息'
) ENGINE=OLAP
UNIQUE KEY(`part_date`, `time`, `order_id`, `user_id`)
COMMENT '合约交易-usdt-爆仓流水'
PARTITION BY RANGE(`part_date`)
(PARTITION p2022 VALUES [('2022-01-01'), ('2023-01-01')),
PARTITION p2023 VALUES [('2023-01-01'), ('2024-01-01')),
PARTITION p2024 VALUES [('2024-01-01'), ('2024-12-13')),
PARTITION p202501 VALUES [('2025-01-01'), ('2025-02-01')),
PARTITION p202502 VALUES [('2025-02-01'), ('2025-03-01')),
PARTITION p202503 VALUES [('2025-03-01'), ('2025-04-01')),
PARTITION p202504 VALUES [('2025-04-01'), ('2025-05-01')),
PARTITION p202505 VALUES [('2025-05-01'), ('2025-06-01')),
PARTITION p202506 VALUES [('2025-06-01'), ('2025-07-01')),
PARTITION p202507 VALUES [('2025-07-01'), ('2025-08-01')),
PARTITION p202508 VALUES [('2025-08-01'), ('2025-09-01')))
DISTRIBUTED BY HASH(`part_date`) BUCKETS 3
PROPERTIES (
“replication_allocation“ = “tag.location.default: 3“,
“min_load_replica_num“ = “-1“,
“is_being_synced“ = “false“,
“dynamic_partition.enable“ = “true“,
“dynamic_partition.time_unit“ = “MONTH“,
“dynamic_partition.time_zone“ = “Etc/UTC“,
“dynamic_partition.start“ = “-40“,
“dynamic_partition.end“ = “1“,
“dynamic_partition.prefix“ = “p“,
“dynamic_partition.replication_allocation“ = “tag.location.default: 3“,
“dynamic_partition.buckets“ = “3“,
“dynamic_partition.create_history_partition“ = “true“,
“dynamic_partition.history_partition_num“ = “-1“,
“dynamic_partition.hot_partition_num“ = “0“,
“dynamic_partition.reserved_history_periods“ = “NULL“,
“dynamic_partition.storage_policy“ = “,
“dynamic_partition.start_day_of_month“ = “1“,
“storage_medium“ = “hdd“,
“storage_format“ = “V2“,
“inverted_index_storage_format“ = “V1“,
“enable_unique_key_merge_on_write“ = “false“,
“light_schema_change“ = “true“,
“disable_auto_compaction“ = “false“,
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产】-【数据模型】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 点击【新建表】，数据源选择Doris类型，输入必填项，选择表类型为明细表，点击下一步 | 跳转【字段配置】页面 |
| 3 | 点击建表语句模式，输入前提条件内的建表SQL，点击解析 | 字段解析正确，内容与预期完全一致，无异常或错误 |
| 4 | 点击生成建表语句 | 建表语句生成正确，内容与预期完全一致，无异常或错误 |
| 5 | 点击建表 | 系统提示建表成功，数据库中成功创建该表，表结构与配置字段一致 |
| 6 | 点击表名 | 跳转到数据地图详情页 |

##### 【P1】验证Doris建表语句模式建表-复合分区字段校验

> 前置条件
```
CREATE TABLE IF NOT EXISTS example_db.composite_partitioned_table
(
id BIGINT,
name VARCHAR(50),
age INT,
salary DOUBLE,
hire_date DATE,
department_id INT
)
PARTITION BY RANGE(hire_date)
SUBPARTITION BY LIST(department_id)
(
PARTITION p2023 VALUES LESS THAN ('2024-01-01')
(
SUBPARTITION dept_1_2023 VALUES IN (1, 2),
SUBPARTITION dept_3_2023 VALUES IN (3, 4)
),
PARTITION p2024 VALUES LESS THAN ('2025-01-01')
(
SUBPARTITION dept_1_2024 VALUES IN (1, 2),
SUBPARTITION dept_3_2024 VALUES IN (3, 4)
)
)
DISTRIBUTED BY HASH(id) BUCKETS 10;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产】-【数据模型】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 点击【新建表】，数据源选择Doris类型，输入必填项，选择表类型为明细表，点击下一步 | 跳转【字段配置】页面 |
| 3 | 点击建表语句模式，输入前提条件内的建表SQL，点击解析 | 字段解析正确，内容与预期完全一致，无异常或错误 |
| 4 | 点击生成建表语句 | 建表语句生成正确，内容与预期完全一致，无异常或错误 |
| 5 | 点击建表 | 系统提示建表成功，数据库中成功创建该表，表结构与配置字段一致 |
| 6 | 点击表名 | 跳转到数据地图详情页 |

##### 【P2】验证Doris建表语句模式建表-list分区字段校验

> 前置条件
```
CREATE TABLE IF NOT EXISTS example_db.list_partitioned_table
(
id BIGINT,
name VARCHAR(50),
department_id INT,
salary DOUBLE
)
PARTITION BY LIST(department_id)
(
PARTITION dept_1 VALUES IN (1, 2, 3),
PARTITION dept_2 VALUES IN (4, 5, 6)
)
DISTRIBUTED BY HASH(id) BUCKETS 10;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产】-【数据模型】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 点击【新建表】，数据源选择Doris类型，输入必填项，选择表类型为明细表，点击下一步 | 跳转【字段配置】页面 |
| 3 | 点击建表语句模式，输入前提条件内的建表SQL，点击解析 | 字段解析正确，内容与预期完全一致，无异常或错误 |
| 4 | 点击生成建表语句 | 建表语句生成正确，内容与预期完全一致，无异常或错误 |
| 5 | 点击建表 | 系统提示建表成功，数据库中成功创建该表，表结构与配置字段一致 |
| 6 | 点击表名 | 跳转到数据地图详情页 |

##### 【P2】验证Doris建表语句模式建表-ranger分区字段校验

> 前置条件
```
CREATE TABLE IF NOT EXISTS example_db.date_range_partitioned_table
(
id BIGINT,
name VARCHAR(50),
age INT,
salary DOUBLE,
hire_date DATE
)
PARTITION BY RANGE(hire_date)
(
PARTITION p2023 VALUES LESS THAN ('2024-01-01'),
PARTITION p2024 VALUES LESS THAN ('2025-01-01'),
PARTITION p2025 VALUES LESS THAN ('2026-01-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产】-【数据模型】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 点击【新建表】，数据源选择Doris类型，输入必填项，选择表类型为明细表，点击下一步 | 跳转【字段配置】页面 |
| 3 | 点击建表语句模式，输入前提条件内的建表SQL，点击解析 | 字段解析正确，内容与预期完全一致，无异常或错误 |
| 4 | 点击生成建表语句 | 建表语句生成正确，内容与预期完全一致，无异常或错误 |
| 5 | 点击建表 | 系统提示建表成功，数据库中成功创建该表，表结构与配置字段一致 |
| 6 | 点击表名 | 跳转到数据地图详情页 |

##### 【P2】验证Doris建表语句模式建表-动态分区字段校验

> 前置条件
```
CREATE TABLE test_dynamic_partition(
order_id    BIGINT,
create_dt   DATE,
username    VARCHAR(20)
)
DUPLICATE KEY(order_id)
PARTITION BY RANGE(create_dt) ()
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES(
“dynamic_partition.enable“ = “true“,
“dynamic_partition.time_unit“ = “DAY“,
“dynamic_partition.start“ = “-1“,
“dynamic_partition.end“ = “2“,
“dynamic_partition.prefix“ = “p“,
“dynamic_partition.create_history_partition“ = “true“
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产】-【数据模型】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 点击【新建表】，数据源选择Doris类型，输入必填项，选择表类型为明细表，点击下一步 | 跳转【字段配置】页面 |
| 3 | 点击建表语句模式，输入前提条件内的建表SQL，点击解析 | 字段解析正确，内容与预期完全一致，无异常或错误 |
| 4 | 点击生成建表语句 | 建表语句生成正确，内容与预期完全一致，无异常或错误 |
| 5 | 点击建表 | 系统提示建表成功，数据库中成功创建该表，表结构与配置字段一致 |
| 6 | 点击表名 | 跳转到数据地图详情页 |

##### 【P2】验证Doris建表语句模式建表-分桶字段校验

> 前置条件
```
CREATE TABLE demo.hash_bucket_tbl(
oid         BIGINT,
dt          DATE,
region      VARCHAR(10),
amount      INT
)
DUPLICATE KEY(oid)
PARTITION BY RANGE(dt) (
PARTITION p250101 VALUES LESS THAN(“2025-01-01“),
PARTITION p250102 VALUES LESS THAN(“2025-01-02“)
)
DISTRIBUTED BY HASH(region) BUCKETS 8;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产】-【数据模型】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 点击【新建表】，数据源选择Doris类型，输入必填项，选择表类型为明细表，点击下一步 | 跳转【字段配置】页面 |
| 3 | 点击建表语句模式，输入前提条件内的建表SQL，点击解析 | 字段解析正确，内容与预期完全一致，无异常或错误 |
| 4 | 点击生成建表语句 | 建表语句生成正确，内容与预期完全一致，无异常或错误 |
| 5 | 点击建表 | 系统提示建表成功，数据库中成功创建该表，表结构与配置字段一致 |
| 6 | 点击表名 | 跳转到数据地图详情页 |

##### 【P2】验证Doris建表语句模式建表-支持聚合表

> 前置条件
```
CREATE TABLE IF NOT EXISTS example_tbl_agg
(
user_id             LARGEINT    NOT NULL,
load_dt             DATE        NOT NULL,
city                VARCHAR(20),
last_visit_dt       DATETIME    REPLACE DEFAULT “1970-01-01 00:00:00“,
cost                BIGINT      SUM DEFAULT “0“,
max_dwell           INT         MAX DEFAULT “0“,
)
AGGREGATE KEY(user_id, load_dt, city)
DISTRIBUTED BY HASH(user_id) BUCKETS 10;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产】-【数据模型】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 点击【新建表】，数据源选择Doris类型，输入必填项，选择表类型为聚合表，点击下一步 | 跳转【字段配置】页面 |
| 3 | 点击建表语句模式，输入前提条件内的建表SQL，点击解析 | 字段解析正确，内容与预期完全一致，无异常或错误 |
| 4 | 点击生成建表语句 | 建表语句生成正确，内容与预期完全一致，无异常或错误 |
| 5 | 点击建表 | 系统提示建表成功，数据库中成功创建该表，表结构与配置字段一致 |
| 6 | 点击表名 | 跳转到数据地图详情页 |

##### 【P2】验证Doris建表语句模式建表-支持主键表

> 前置条件
```
CREATE TABLE IF NOT EXISTS example_tbl_unique
(
user_id         LARGEINT        NOT NULL,
user_name       VARCHAR(50)     NOT NULL,
city            VARCHAR(20),
age             SMALLINT,
sex             TINYINT
)
UNIQUE KEY(user_id, user_name)
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES (
“enable_unique_key_merge_on_write“ = “true“
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产】-【数据模型】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 点击【新建表】，数据源选择Doris类型，输入必填项，选择表类型为主键表，点击下一步 | 跳转【字段配置】页面 |
| 3 | 点击建表语句模式，输入前提条件内的建表SQL，点击解析 | 字段解析正确，内容与预期完全一致，无异常或错误 |
| 4 | 点击生成建表语句 | 建表语句生成正确，内容与预期完全一致，无异常或错误 |
| 5 | 点击建表 | 系统提示建表成功，数据库中成功创建该表，表结构与配置字段一致 |
| 6 | 点击表名 | 跳转到数据地图详情页 |

##### 【P1】验证Doris建表语句模式建表-支持明细表

> 前置条件
```
CREATE TABLE IF NOT EXISTS example_tbl_duplicate
(
log_time        DATETIME       NOT NULL,
log_type        INT            NOT NULL,
error_code      INT,
error_msg       VARCHAR(1024),
op_id           BIGINT,
op_time         DATETIME
)
DUPLICATE KEY(log_time, log_type, error_code)
DISTRIBUTED BY HASH(log_type) BUCKETS 10;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产】-【数据模型】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 点击【新建表】，数据源选择Doris类型，输入必填项，选择表类型为明细表，点击下一步 | 跳转【字段配置】页面 |
| 3 | 点击建表语句模式，输入前提条件内的建表SQL，点击解析 | 字段解析正确，内容与预期完全一致，无异常或错误 |
| 4 | 点击生成建表语句 | 建表语句生成正确，内容与预期完全一致，无异常或错误 |
| 5 | 点击建表 | 系统提示建表成功，数据库中成功创建该表，表结构与配置字段一致 |
| 6 | 点击表名 | 跳转到数据地图详情页 |

##### 【P2】验证Doris新增【建表语句模式】建表

> 前置条件
```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产】-【数据模型】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 点击【新建表】，数据源选择Doris类型，输入必填项，点击下一步 | 跳转【字段配置】页面，页面新增【建表语句模式】tab按钮 |

