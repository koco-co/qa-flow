---
name: "【江苏银行】计算引擎适配Gaussdb9.1(#9673)（XMind）"
description: "【江苏银行】计算引擎适配Gaussdb9.1(#9673)（XMind）"
tags:
  - 离线开发
  - 江苏银行
  - 计算引擎适配Gaussdb
module: batch-works
version: v6.4.3
source: zentao-cases/XMind/离线开发/202511-离线开发v6.4.3.xmind
created_at: 2026-03-29
origin: xmind
---
# 【江苏银行】计算引擎适配Gaussdb9.1(#9673)（XMind）
> 来源：zentao-cases/XMind/离线开发/202511-离线开发v6.4.3.xmind

---

### 验证「创建项目」添加GaussDB 数据源显示正常(初始化方式: 创建)
#### 进入「离线开发」页面, 点击「创建项目」
- 进入创建项目页面
#### 配置如下: 
项目标识&项目名称: ${nameA}
计算引擎配置: GaussDB, 初始化方式: 「创建」
- 配置成功, 初始化方式问号hover提示：当选择不创建且不对接 Schema 时，创建任务后编辑SQL时需要去指定使用的Schema
#### 点击「创建项目」
- 创建成功
#### 进入${nameA}项目的「数据源」页面
- 数据源列表存在类型为GaussDB, 数据源名称为${nameA}_GaussDB的数据源记录

### 验证「创建项目」添加GaussDB 数据源显示正常(初始化方式: 对接)
#### 进入「离线开发」页面, 点击「创建项目」
- 进入创建项目页面
#### 配置如下: 
项目标识&项目名称: ${nameA}
计算引擎配置: GaussDB, 初始化方式:「对接已有GaussDB Schema」、${schemaA}、${表类目A}
- 配置成功
#### 点击「创建项目」
- 创建成功
#### 进入${nameA}项目的「数据源」页面
- 数据源列表存在类型为GaussDB, 数据源名称为${nameA}_GaussDB的数据源记录

### 验证「创建项目」添加GaussDB数据源显示正常(初始化方式: 不创建且不对接)
#### 进入「离线开发」页面, 点击「创建项目」
- 进入创建项目页面
#### 配置如下: 
项目标识&项目名称: ${nameA}
计算引擎配置: GaussDB, 初始化方式:  「不创建且不对接 Schema」
- 配置成功
#### 点击「创建项目」
- 创建成功
#### 进入${nameA}项目的「数据源」页面
- 数据源列表存在类型为GaussDB, 数据源名称为${nameA}_GaussDB的数据源记录

### 验证「数据开发」GaussDB SQL任务创建功能正常
#### 进入「离线开发-数据开发-周期任务」页面
- 进入成功
#### 右键「任务开发」, 选择GaussDB SQL任务
- 选择成功
#### 新建周期任务:
任务名称: ${nameA}
任务类型: GaussDB SQL
集群名称: ${datasourceA}
- 周期任务创建成功
#### 进入「手动任务」, 新建手动任务:
任务名称: ${nameB}
任务类型: GaussDB SQL
集群名称: ${datasourceA}
- 手动任务创建成功
#### 进入「临时查询」, 新建临时查询:
查询名称: ${nameC}
任务类型: GaussDB SQL
集群名称: ${datasourceA}
- 临时查询创建成功

### 验证 GaussDB SQL任务调度功能运行正常(DDL)
#### 进入「离线开发-数据开发-周期任务」页面
- 进入成功
#### 创建GaussDB SQL任务${task01}、${task02}、${task03}, 临时运行后, 保存并提交
- 提交至运维中心
#### 进入调度属性-任务间依赖, 给SQL任务添加依赖关系( ${task02}、${task03} -> ${task01} ) 后再次提交
- 依赖添加成功
#### 周期运行, 查看结果
- 周期任务实例中新增该任务的实例记录并运行成功
#### 查看表结构
- 表结构变更
#### 补数据运行, 查看结果
- 补数据任务实例中新增该任务的实例记录并运行成功
#### 查看表结构
- 表结构变更
#### 进入「离线开发-数据开发-手动任务」页面
- 进入成功
#### 创建GaussDB SQL任务${task01}、${task02}、${task03}并添加依赖关系后, 提交到运维中心手动运行
- 手动任务实例中新增该任务的实例记录并运行成功
#### 查看表结构
- 表结构变更

### 验证 GaussDB SQL任务调度功能运行正常(DML)
#### 进入「离线开发-数据开发-周期任务」页面
- 进入成功
#### 创建GaussDB SQL任务${task01}、${task02}、${task03}, 临时运行后, 保存并提交
- 提交至运维中心
#### 进入调度属性-任务间依赖, 给SQL任务添加依赖关系(${task03} -> ${task02} -> ${task01}) 后再次提交
- 依赖添加成功
#### 周期运行, 查看结果
- 周期任务实例中新增该任务的实例记录并运行成功
#### 补数据运行, 查看结果
- 补数据任务实例中新增该任务的实例记录并运行成功
#### 进入「离线开发-数据开发-手动任务」页面
- 进入成功
#### 创建GaussDB SQL任务${task01}、${task02}、${task03}并添加依赖关系后, 提交到运维中心手动运行
- 手动任务实例中新增该任务的实例记录并运行成功

### 验证 GaussDB SQL任务调度功能运行正常(DQL)
#### 进入「离线开发-数据开发-周期任务」页面
- 进入成功
#### 创建GaussDB SQL任务${task01}、${task02}、${task03}, 临时运行后, 保存并提交
- 提交至运维中心
#### 周期运行, 查看结果
- 周期任务实例中新增该任务的实例记录并运行成功
#### 补数据运行, 查看结果
- 补数据任务实例中新增该任务的实例记录并运行成功
#### 进入「离线开发-数据开发-手动任务」页面
- 进入成功
#### 创建GaussDB SQL任务${task01}、${task02}、${task03}后, 提交到运维中心手动运行
- 手动任务实例中新增该任务的实例记录并运行成功

### 验证GaussDB数据源项目维度数据库绑定账号功能正常
#### 进入「离线开发-数据开发-周期任务」页面
- 进入成功
#### 新建 GaussDB SQL 任务
- 创建成功
#### 执行SQL: SELECT * FROM ${schemaA}.${tableA};
- 查询成功, 当前为root用户在执行
#### 进入项目管理-项目设置-开发设置-GaussDB配置中，开启项目绑定数据库账号, 新增test_user账号
- 新增成功, 数据回显正常
#### 执行SQL: SELECT * FROM ${schemaA}.${tableA};
- 查询失败
#### 执行SQL: SELECT * FROM batch_v53.${tableB};
- 查询成功, 当前为test_user用户在执行

### 验证GaussDB全数据类型支持并返回结果
#### 进入「离线开发-数据开发-周期任务」页面
- 进入成功
#### 新建GaussDB SQL任务, 输入测试SQL语句并运行
- 执行成功, 返回结果显示正常
#### 进入「离线开发-数据开发-手动任务」页面
- 进入成功
#### 新建GaussDB SQL任务, 输入测试SQL语句并运行
- 执行成功, 返回结果显示正常
#### 进入「离线开发-数据开发-临时查询」页面
- 进入成功
#### 新建GaussDB SQL任务, 输入测试SQL语句并运行
- 执行成功, 返回结果显示正常

### 验证 GaussDB 语法提示功能正常
#### 进入「离线开发-数据开发-周期任务」页面
- 进入成功
#### 新建 GaussDB SQL 任务
- 创建成功
#### 在编辑器中输入 SEL
- 自动提示补全 SELECT
#### 输入 SELECT * FROM t_
- 提示补全表名 t_user
#### 输入系统函数前缀 RA
- 自动提示 RANK()

### 验证 GaussDB 任务支持停止运行中的任务
#### 进入「离线开发-数据开发-周期任务」页面
- 进入成功
#### 新建 GaussDB SQL 任务
- 创建成功
#### 输入SQL测试语句并执行
- 运行成功, 控制台开始打印日志
#### 点击「停止」
- 运行终止, 日志停止打印

### 验证 GaussDB 任务支持系统函数
#### 进入「离线开发-数据开发-周期任务」页面
- 进入成功
#### 新建 GaussDB SQL 任务
- 创建成功
#### 输入SQL测试语句并执行
- 执行成功, 返回3行结果

### 验证 GaussDB 任务支持自定义函数
#### 进入「离线开发-数据开发-函数管理」页面
- 进入成功
#### 选择GaussDB SQL - 自定义函数, 右键「新建自定义函数」
- 弹出「新建自定义函数」弹窗, 内容展示如下:
1) 函数类型: 必填标识, 默认展示为GaussDB SQL, 置灰不可点击
2) 函数名称: 必填标识, 置灰提示“请输入函数名称”
3) 用途: 非必填, 置灰提示“请输入用途”
4) SQL: 必填标识, “函数名称”未填写时SQL内函数名称位置为空,置灰提示:
create function ${项目标识}.${函数名称}
RETURNS character varying
LANGUAGE 'plpgsq!'
COST 100
VOLATILE
AS $BODY$ BEGIN perform "PRO_BU_MAINTAIN" (to_Char(now(), yyyy-mm-dd')::varchar);
RETURN 'ok':
END
$BODY$;
ALTER FUNCTION odS."PROCOMPUT
INTAINCOMPUT"() OWNER TO bi:

5) 参数说明: 非必填, 置灰提示“请输入参数说明”
6) 存储位置: 必填标识, 默认展示自定义函数, 支持切换自定义函数下创建的文件夹
#### 自定义函数配置如下: 
1) 函数名称: calculate_fee
2) 用途: 根据交易类型和金额计算手续费
3) SQL: 
CREATE FUNCTION ${项目标识}.calculate_fee
(p_amount NUMERIC, p_type VARCHAR)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_fee NUMERIC := 0;
BEGIN
    IF p_type = 'withdraw' THEN
        -- 假设提现手续费 1%
        v_fee := p_amount * 0.01;
    ELSIF p_type = 'deposit' THEN
        -- 存款手续费 固定 2 单位货币
        v_fee := 2.00;
    ELSE
        -- 其它交易类型默认费用
        v_fee := p_amount * 0.005;
    END IF;

    RETURN v_fee;
END;
$$;

4) 参数说明: 无
5) 存储位置: 自定义函数
- 添加成功
#### 进入离线开发-周期任务, 创建gaussdb sql任务
- 创建成功
#### 执行建表语句并插入数据
- 执行成功
#### 调用自定义函数:
SELECT
    txn_id,
    account_id,
    txn_amount,
    txn_type,
    calculate_fee(txn_amount, txn_type) AS fee,
    txn_amount - calculate_fee(txn_amount, txn_type) AS net_amount,
    txn_time
FROM bank_transaction;
- SQL执行成功, 结果正常返回

### 验证 GaussDB 新建自定义函数(异常场景)
#### 进入「离线开发-数据开发-函数管理」页面
- 进入成功
#### 选择GaussDB SQL - 自定义函数, 右键「新建自定义函数」
- 弹出「新建自定义函数」弹窗, 内容展示如下:
1) 函数类型: 必填标识, 默认展示为GaussDB SQL, 置灰不可点击
2) 函数名称: 必填标识, 置灰提示“请输入函数名称”
3) 用途: 非必填, 置灰提示“请输入用途”
4) SQL: 必填标识, “函数名称”未填写时SQL内函数名称位置为空,置灰提示:
create function ${项目标识}.${函数名称}
RETURNS character varying
LANGUAGE 'plpgsq!'
COST 100
VOLATILE
AS $BODY$ BEGIN perform "PRO_BU_MAINTAIN" (to_Char(now(), yyyy-mm-dd')::varchar);
RETURN 'ok':
END
$BODY$;
ALTER FUNCTION odS."PROCOMPUT
INTAINCOMPUT"() OWNER TO bi:

5) 参数说明: 非必填, 置灰提示“请输入参数说明”
6) 存储位置: 必填标识, 默认展示自定义函数, 支持切换自定义函数下创建的文件夹
#### 「函数名称」为空, 提交表单
- 置红提示: 函数名称不可为空！
#### 「函数名称」输入123, 提交表单
- 置红提示: 函数名称开头必须是英文！
#### 「函数名称」输入非法字符#¥%, 提交表单
- 置红提示: 函数名称只能由字母、数字、下划线组成！
#### 「函数名称」输入21个英文字符, 提交表单
- 置红提示: 函数名称不得超过20个字符！
#### 「函数名称」输入20个英文字符, 提交表单
- 无红色提示, 「SQL」配置项中自动补充函数名称
#### 「用途」输入201个字符, 提交表单
- 置红提示: 请控制在200个字符以内！
#### 「用途」输入200个字符, 提交表单
- 无红色提示
#### 「SQL」为空, 提交表单
- SQL不能为空！
#### 「参数说明」输入201个字符, 提交表单
- 置红提示: 请控制在200个字符以内！
#### 「参数说明」输入200个字符, 提交表单
- 无红色提示

### 验证 GaussDB 自定义函数增删改查功能正常
#### 进入「离线开发-数据开发-函数管理」页面
- 进入成功
#### 新建GaussDB 自定义函数, 配置如下:
1) 函数名称: calculate_fee
2) SQL: 
CREATE FUNCTION ${项目标识}.calculate_fee
(p_amount NUMERIC, p_type VARCHAR)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_fee NUMERIC := 0;
BEGIN
    IF p_type = 'withdraw' THEN
        -- 假设提现手续费 1%
        v_fee := p_amount * 0.01;
    ELSIF p_type = 'deposit' THEN
        -- 存款手续费 固定 2 单位货币
        v_fee := 2.00;
    ELSE
        -- 其它交易类型默认费用
        v_fee := p_amount * 0.005;
    END IF;

    RETURN v_fee;
END;
$$;
- Toast提示: 创建成功
#### 右键编辑calculate_fee函数, 配置如下:
用途: 根据交易类型和金额计算手续费
- Toast提示: 编辑成功
#### 在「自定义函数」目录下新增子目录A后, 右键移动calculate_fee函数存储位置到目录A
- 移动成功
#### 点击calculate_fee函数
- 展示「函数信息」, 内容回显正确
#### 右键删除calculate_fee函数
- Toast提示: 删除成功

### 验证 GaussDB 任务支持存储过程
#### 进入「离线开发-数据开发-函数管理」页面
- 进入成功
#### 选择GaussDB SQL - 存储过程, 右键「新建存储过程」
- 弹出「新建存储过程」弹窗, 内容展示如下:
1) 存储过程类型: 必填标识, 默认展示为GaussDB SQL, 置灰不可点击
2) 存储过程名称: 必填标识, 置灰提示“请输入存储过程”
3) 用途: 非必填, 置灰提示“请输入用途”
4) SQL: 必填标识, “存储过程名称”未填写时SQL内存储过程名称位置为空,置灰提示:
create or replace procedure ${项目标识}.${存储过程名称}
RETURNS character varying
LANGUAGE 'plpgsq!'
COST 100
VOLATILE
AS $BODY$ BEGIN perform "PRO_BU_MAINTAIN" (to_Char(now(), yyyy-mm-dd')::varchar);
RETURN 'ok':
END
$BODY$;
ALTER FUNCTION odS."PROCOMPUT
INTAINCOMPUT"() OWNER TO bi:

5) 参数说明: 非必填, 置灰提示“请输入参数说明”
6) 存储位置: 必填标识, 默认展示存储过程, 支持切换存储过程下创建的文件夹
#### 存储过程配置如下: 
1) 存储过程名称: proc_account_summary
2) 用途: 
3) SQL: 
create or replace procedure gauss_create.process_account_txns (
    p_account_id IN BIGINT,
    deleted_count OUT INTEGER,
    updated_count OUT INTEGER
) IS
BEGIN
    -- 删除 txn_type = 'other' 的记录
    DELETE FROM bank_transaction
    WHERE account_id = p_account_id AND txn_type = 'other';
    deleted_count := SQL%ROWCOUNT;

    -- 更新 deposit 交易金额（增加10%）
    UPDATE bank_transaction
    SET txn_amount = txn_amount * 1.10
    WHERE account_id = p_account_id AND txn_type = 'deposit';
    updated_count := SQL%ROWCOUNT;
END;

4) 参数说明: 无
5) 存储位置: 存储过程
- 添加成功
#### 进入离线开发-周期任务, 创建gaussdb sql任务
- 创建成功
#### 执行建表语句并插入数据
- 执行成功
#### 调用存储过程:
DECLARE
    v_deleted INTEGER;
    v_updated INTEGER;
BEGIN
    gauss_create.process_account_txns(1002, v_deleted, v_updated);
    RAISE NOTICE 'Deleted % rows, Updated % rows', v_deleted, v_updated;
END;
- SQL执行成功, 结果正常返回
#### 执行: select  * from bank_transaction;
- 存储过程执行生效

### 验证 GaussDB 新建存储过程(异常场景)
#### 进入「离线开发-数据开发-函数管理」页面
- 进入成功
#### 选择GaussDB SQL - 存储过程, 右键「新建存储过程」
- 弹出「新建存储过程」弹窗, 内容展示如下:
1) 存储过程类型: 必填标识, 默认展示为GaussDB SQL, 置灰不可点击
2) 存储过程名称: 必填标识, 置灰提示“请输入存储过程”
3) 用途: 非必填, 置灰提示“请输入用途”
4) SQL: 必填标识, “存储过程名称”未填写时SQL内存储过程名称位置为空,置灰提示:
create or replace procedure ${项目标识}.${存储过程名称}
RETURNS character varying
LANGUAGE 'plpgsq!'
COST 100
VOLATILE
AS $BODY$ BEGIN perform "PRO_BU_MAINTAIN" (to_Char(now(), yyyy-mm-dd')::varchar);
RETURN 'ok':
END
$BODY$;
ALTER FUNCTION odS."PROCOMPUT
INTAINCOMPUT"() OWNER TO bi:

5) 参数说明: 非必填, 置灰提示“请输入参数说明”
6) 存储位置: 必填标识, 默认展示存储过程, 支持切换存储过程下创建的文件夹
#### 「存储过程名称」为空, 提交表单
- 置红提示: 存储过程名称不可为空！
#### 「存储过程名称」输入123, 提交表单
- 置红提示: 存储过程名称开头必须是英文！
#### 「存储过程名称」输入非法字符#¥%, 提交表单
- 置红提示: 存储过程名称只能由字母、数字、下划线组成！
#### 「存储过程名称」输入21个英文字符, 提交表单
- 置红提示: 存储过程名称不得超过20个字符！
#### 「存储过程名称」输入20个英文字符, 提交表单
- 无红色提示, 「SQL」配置项中自动补充存储过程名称
#### 「用途」输入201个字符, 提交表单
- 置红提示: 请控制在200个字符以内！
#### 「用途」输入200个字符, 提交表单
- 无红色提示
#### 「SQL」为空, 提交表单
- SQL不能为空！
#### 「参数说明」输入201个字符, 提交表单
- 置红提示: 请控制在200个字符以内！
#### 「参数说明」输入200个字符, 提交表单
- 无红色提示

### 验证 GaussDB 存储过程增删改查功能正常
#### 进入「离线开发-数据开发-函数管理」页面
- 进入成功
#### 新建GaussDB 存储过程, 配置如下:
1) 存储过程名称: proc_account_summary
2) SQL: 
CREATE OR REPLACE PROCEDURE ${项目标识}.proc_account_summary(
    IN p_account_id BIGINT,
    OUT o_txn_count BIGINT,
    OUT o_total_amount NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    SELECT COUNT(*), SUM(txn_amount)
      INTO o_txn_count, o_total_amount
    FROM bank_transaction
    WHERE account_id = p_account_id;
    RAISE NOTICE 'Account % has % transactions, total_amount = %', p_account_id, o_txn_count, o_total_amount;
END;
$$;
- Toast提示: 创建成功
#### 右键编辑proc_account_summary 存储过程, 配置如下:
用途: 根据交易类型和金额计算手续费
- Toast提示: 编辑成功
#### 在「自定义函数」目录下新增子目录A后, 右键移动proc_account_summary 存储过程存储位置到目录A
- 移动成功
#### 点击 proc_account_summary 存储过程
- 展示「存储过程信息」, 内容回显正确
#### 右键删除 proc_account_summary 存储过程
- Toast提示: 删除成功

### 验证 GaussDB 任务一键发布&导入导出发布功能正常
#### 进入projectA(测试项目) -> 数据开发-周期任务
- 进入成功
#### 创建gaussdb sql任务taskA, 执行建表语句后, 保存并发布
- 发布成功, 跳转到「创建发布包」页面
#### 勾选任务taskA并打包
- 打包成功, 跳转到「发布至目标项目」页面
#### 点击「导出」按钮
- zip文件${fileA}导出成功
#### 点击「发布」按钮
- 发布状态由「待发布」 -> 「发布成功」
#### 切换到projectB(生产项目) -> 数据开发-周期任务
- 新增周期任务taskA, 任务内容与projectA(测试项目)中的taskA保持一致
#### 临时运行任务taskA后删除
- 运行/删除成功, GaussDB 任务一键发布功能正常
#### 进入projectB(生产项目) -> 任务发布 -> 发布至本项目
- 进入成功
#### 点击「导入发布包」, 选择zip文件${fileA}后, 点击「发布」按钮
- 弹出「发布包校验」弹窗, 「数据源」需要手动配置, 其他配置均校验通过
#### 「数据源 - 本项目数据源」中选择projectB(生产项目)中的gaussdb数据源后, 点击「发布」
- 发布成功
#### 检查 projectB(生产项目) -> 数据开发-周期任务
- 新增周期任务taskA, 任务内容与projectA(测试项目)中的taskA保持一致
#### 临时运行任务taskA
- 运行成功, GaussDB 任务导入导出发布功能正常

### 验证 GaussDB 数据源映射配置功能正常
#### 进入projectA(测试项目) -> 数据源
- 进入成功
#### 选择数据源${datasourceA}, 点击「映射配置」
- 弹出「映射配置」弹窗, 存在必填项「发布目标」
#### 展开「发布目标」
- 加载出projectB(生产项目)中的所有同类型(GaussDB)的Meta数据源名称
#### 选择${datasourceB}后, 点击「确定」
- 映射配置成功
#### 再次点击「映射配置」
- 数据源映射配置回显正常

