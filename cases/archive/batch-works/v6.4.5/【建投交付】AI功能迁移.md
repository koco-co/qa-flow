---
name: 【建投交付】AI功能迁移 v6.4.5
description: 【建投交付】AI功能迁移 v6.4.5
tags:
  - 离线开发
  - 离线开发-数据开发-AI功能
  - 建投交付
  - AI功能迁移
module: batch-works
version: v6.4.5
source: zentao-cases/dtstack-platform/离线开发/archive-cases/v6.4.5/【建投交付】AI功能迁移.csv
case_count: 173
created_at: 2026-03-29
origin: csv
---
# 【建投交付】AI功能迁移 v6.4.5
> 来源：zentao-cases/dtstack-platform/离线开发/archive-cases/v6.4.5/【建投交付】AI功能迁移.csv
> 用例数：173

---

## 离线开发-数据开发-AI功能

##### 验证同一个问题重复提问 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，表 company中的所有数据 | 对应生成sql：select * from company，并展示表中所有数据 |
| 3 | 再次提问：对应生成sql：select * from company，并展示表中所有数据 | 给出一样的答案，对应生成sql：select * from company，并展示表中所有数据 |

##### 验证DM for oracle 数据查询-验证没有权限查询数据的角色 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 运维 | starrocksl数据源表，没有查询数据权限 |
| 3 | 访客 | starrocks数据源表，没有查询数据权限 |
| 4 | 查询信息时会弹出回复 | 回答：权限不足，请联系管理员处理 |

##### 验证DM for oracle 数据查询-验证有权限查询数据的角色 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 项目所有者 | starrocks数据源表可查询 |
| 3 | 项目管理员 | starrocks数据源表可查询 |
| 4 | 数据开发 | starrocks数据源表可查询 |

##### 验证DM for oracle 数据查询-验证查询不存在的表数据 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 不存在表：test_new |  |
| 3 | 输入查询语句：查询任务类型，表test_new的所有数据 | 返回提示没有该表 |

##### 验证DM for oracle 数据查询-验证控制台查询上限小于1000，并设置下载上限大于1000，预览仅显示设置上限数据 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 控制台-绑定租户-通用信息：开启允许下载select查询结果，查询上限100，下载上限为1100 |  |
| 3 | 创建表test，导入1200条数据 | 系统提示导入成功，数据已同步至对应列表，记录数与导入文件中数据量一致 |
| 4 | 查询任务类型，表test中的所有数据 | 展示前100条数据，下载显示1100条数据 |

##### 验证DM for oracle 数据查询-验证控制台查询上限大于1000，并设置下载上限小于1000，预览仅显示1000条数据 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 控制台-绑定租户-通用信息：开启允许下载select查询结果，查询上限1200，下载上限为200 |  |
| 3 | 创建表test，导入1200条数据 | 系统提示导入成功，数据已同步至对应列表，记录数与导入文件中数据量一致 |
| 4 | 查询任务类型，表test中的所有数据 | 展示前1200条数据，下载显示200条数据 |

##### 验证DM for oracle 数据查询-验证控制台查询上限小于1000，预览仅显示设置上限数据 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 控制台-绑定租户-通用信息：关闭允许下载select查询结果，select查询条数的上线设置为800 |  |
| 3 | 创建表test，导入1200条数据 | 系统提示导入成功，数据已同步至对应列表，记录数与导入文件中数据量一致 |
| 4 | 查询任务类型，表test中的所有数据 | 展示前800条数据，下载显示1200条数据 |

##### 验证DM for oracle 数据查询-验证控制台查询上限大于1000，预览仅显示1000条数据 「P2」

> 前置条件
```
create table test(id int,age int,name string)
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 控制台-绑定租户-通用信息：关闭允许下载select查询结果，select查询条数的上线设置为2000 |  |
| 3 | 创建表test，导入1200条数据 | 系统提示导入成功，数据已同步至对应列表，记录数与导入文件中数据量一致 |
| 4 | 查询任务类型，表test中的所有数据 | 展示前1000条数据，下载显示1200条数据 |

##### 验证DM for oracle 数据查询-多表联合查询（join。。。on。。。）【跨库联合查询，同库联合查询】 「P1」

> 前置条件
```
-- 员工表（使用Oracle兼容语法）
CREATE TABLE employee(
 id NUMBER(10) NOT NULL,
 name VARCHAR2(50),
 salary NUMBER(10,2),
 CONSTRAINT pk_employee PRIMARY KEY (id)
);

COMMENT ON TABLE employee IS '员工信息表';
COMMENT ON COLUMN employee.id IS '员工编号';
COMMENT ON COLUMN employee.name IS '员工姓名';
COMMENT ON COLUMN employee.salary IS '员工工资';

-- 员工住址信息表
CREATE TABLE employee_address (
 id NUMBER(10) NOT NULL,
 street VARCHAR2(100),
 city VARCHAR2(50),
 CONSTRAINT fk_address_employee FOREIGN KEY (id) REFERENCES employee(id)
);

COMMENT ON TABLE employee_address IS '员工住址信息表';
COMMENT ON COLUMN employee_address.id IS '员工编号';
COMMENT ON COLUMN employee_address.street IS '员工所在街道';
COMMENT ON COLUMN employee_address.city IS '员工所在城市';

-- 员工联系方式表
CREATE TABLE employee_connection (
 id NUMBER(10) NOT NULL,
 phno VARCHAR2(20),
 email VARCHAR2(100),
 CONSTRAINT fk_connection_employee FOREIGN KEY (id) REFERENCES employee(id)
);

COMMENT ON TABLE employee_connection IS '员工联系方式表';
COMMENT ON COLUMN employee_connection.id IS '员工编号';
COMMENT ON COLUMN employee_connection.phno IS '员工电话';
COMMENT ON COLUMN employee_connection.email IS '员工邮箱';

-- 插入数据（达梦支持多行插入语法）
INSERT ALL
 INTO employee VALUES (1, '张三', 5000)
 INTO employee VALUES (2, '李四', 5500)
 INTO employee VALUES (3, '赵四', 5500)
 
 INTO employee_address VALUES (1, '西溪大街', '杭州')
 INTO employee_address VALUES (2, '东北大街', '哈尔滨')
 INTO employee_address VALUES (3, '东北大街', '哈尔滨')
 
 INTO employee_connection VALUES (1, '15655555555', 'zhangsan@qq.com')
 INTO employee_connection VALUES (2, '15655555551', 'lisi@qq.com')
 INTO employee_connection VALUES (3, '15655555541', 'zhaosi@qq.com')
SELECT 1 FROM dual;

COMMIT;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，根据表employee，employee_address，查询所有员工的员工姓名，员工所在街道，员工所在城市 | 对应生成sql,并展示表中正确的数据 |

##### 验证DM for oracle 数据查询-验证查询数据（avg） 「P2」

> 前置条件
```
DROP TABLE IF EXISTS company_sale;
  CREATE TABLE company_sale( 
  号码 BIGINT COMMENT'编号', 
  qy_type SMALLINT COMMENT'类型', 
  company_code BIGINT COMMENT'公司编号', 
  company_name VARCHAR(30) COMMENT'公司名称', 
  project_no BIGINT COMMENT'项目编号', 
  project_name VARCHAR(30) COMMENT'项目名称', 
  projectstage_name VARCHAR(30) COMMENT'项目地址', 
  jz_type_name SMALLINT COMMENT'类型名称', 
  building_name VARCHAR(30) COMMENT'建造单位', 
  sale BIGINT COMMENT'销售额' ); 

INSERT INTO company_sale VALUES
  (1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云','1113'), 
  (2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云','14113'), 
  (3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机','2012'), 
  (4,4,4,'dtstack_04',4,'dtstack_03','杭州',4,'杭州袋鼠','9000');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，表 company_sale中的所有数据 | 对应生成sql：select * from company_sale，并展示表中所有数据 |
| 3 | 根据销售额计算出所有员工的平均销售额 | 对应生成sql,并展示表中正确的数据 |

##### 验证DM for oracle 数据查询-验证查询数据去重（distinct.） 「P2」

> 前置条件
```
DROP TABLE IF EXISTS company_sale;
  CREATE TABLE company_sale( 
  号码 BIGINT COMMENT'编号', 
  qy_type SMALLINT COMMENT'类型', 
  company_code BIGINT COMMENT'公司编号', 
  company_name VARCHAR(30) COMMENT'公司名称', 
  project_no BIGINT COMMENT'项目编号', 
  project_name VARCHAR(30) COMMENT'项目名称', 
  projectstage_name VARCHAR(30) COMMENT'项目地址', 
  jz_type_name SMALLINT COMMENT'类型名称', 
  building_name VARCHAR(30) COMMENT'建造单位', 
  sale BIGINT COMMENT'销售额' ); 

INSERT INTO company_sale VALUES
  (1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云','1113'), 
  (2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云','14113'), 
  (3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机','2012'), 
  (4,4,4,'dtstack_04',4,'dtstack_03','杭州',4,'杭州袋鼠','9000');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，company_sale中的所有数据 | 对应生成sql：select * from company_sale，并展示表中所有数据 |
| 3 | 查询项目名称去重的数据 | 对应生成sql,并展示表中正确的数据 |

##### 验证DM for oracle 数据查询-验证查询分组数据（Group...by...） 「P1」

> 前置条件
```
-- 创建表语句（达梦/Oracle语法）
CREATE TABLE company (
 id NUMBER(19) COMMENT '编号',
 qy_type NUMBER(5) COMMENT '类型',
 company_code NUMBER(19) COMMENT '公司编号',
 company_name VARCHAR2(100) COMMENT '公司名称',
 project_no NUMBER(19) COMMENT '项目编号',
 project_name VARCHAR2(100) COMMENT '项目名称',
 project_address VARCHAR2(100) COMMENT '项目地址',
 jz_type NUMBER(5) COMMENT '类型名称',
 builder_name VARCHAR2(100) COMMENT '建造单位',
 sale_amount NUMBER(19) COMMENT '销售额'
);

-- 添加注释（达梦/Oracle单独的COMMENT语法）
COMMENT ON TABLE company IS '公司销售表';
COMMENT ON COLUMN company.id IS '编号';
COMMENT ON COLUMN company.qy_type IS '类型';
-- 其他列注释类似...

-- 插入数据语句
INSERT INTO company VALUES
 (1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云',1113);
INSERT INTO company VALUES
 (2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云',14113);
INSERT INTO company VALUES
 (3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机',2012);
INSERT INTO company VALUES
 (4,4,4,'dtstack_04',4,'dtstack_04','杭州',4,'杭州袋鼠',9000);

-- 提交事务
COMMIT;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，表 company_sale中的所有数据 | 对应生成sql：select * from company_sale，并展示表中所有数据 |
| 3 | 在 company_sale下，帮我查询项目地址为湖州的数据 | 对应生成sql,并展示表中正确的数据 |

##### 验证DM for oracle 数据查询-验证查询数据之间的数据（between...and...） 「P1」

> 前置条件
```
-- 创建表语句（达梦/Oracle语法）
CREATE TABLE company (
 id NUMBER(19) COMMENT '编号',
 qy_type NUMBER(5) COMMENT '类型',
 company_code NUMBER(19) COMMENT '公司编号',
 company_name VARCHAR2(100) COMMENT '公司名称',
 project_no NUMBER(19) COMMENT '项目编号',
 project_name VARCHAR2(100) COMMENT '项目名称',
 project_address VARCHAR2(100) COMMENT '项目地址',
 jz_type NUMBER(5) COMMENT '类型名称',
 builder_name VARCHAR2(100) COMMENT '建造单位',
 sale_amount NUMBER(19) COMMENT '销售额'
);

-- 添加注释（达梦/Oracle单独的COMMENT语法）
COMMENT ON TABLE company IS '公司销售表';
COMMENT ON COLUMN company.id IS '编号';
COMMENT ON COLUMN company.qy_type IS '类型';
-- 其他列注释类似...

-- 插入数据语句
INSERT INTO company VALUES
 (1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云',1113);
INSERT INTO company VALUES
 (2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云',14113);
INSERT INTO company VALUES
 (3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机',2012);
INSERT INTO company VALUES
 (4,4,4,'dtstack_04',4,'dtstack_04','杭州',4,'杭州袋鼠',9000);

-- 提交事务
COMMIT;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，表 company_sale中的所有数据 | 对应生成sql：select * from company，并展示表中所有数据 |
| 3 | 在 company_sale下，查询销售额在3000到9000之间的数据 | 对应生成sql：SELECT * FROM company_sale WHERE sale BETWEEN 3000 AND 9000; |
| 4 |  | ,并展示表中正确的数据 |

##### 验证DM for oracle 数据查询-验证查询最高销售额数据（desc...limit） 「P1」

> 前置条件
```
-- 创建表语句（达梦/Oracle语法）
CREATE TABLE company (
 id NUMBER(19) COMMENT '编号',
 qy_type NUMBER(5) COMMENT '类型',
 company_code NUMBER(19) COMMENT '公司编号',
 company_name VARCHAR2(100) COMMENT '公司名称',
 project_no NUMBER(19) COMMENT '项目编号',
 project_name VARCHAR2(100) COMMENT '项目名称',
 project_address VARCHAR2(100) COMMENT '项目地址',
 jz_type NUMBER(5) COMMENT '类型名称',
 builder_name VARCHAR2(100) COMMENT '建造单位',
 sale_amount NUMBER(19) COMMENT '销售额'
);

-- 添加注释（达梦/Oracle单独的COMMENT语法）
COMMENT ON TABLE company IS '公司销售表';
COMMENT ON COLUMN company.id IS '编号';
COMMENT ON COLUMN company.qy_type IS '类型';
-- 其他列注释类似...

-- 插入数据语句
INSERT INTO company VALUES
 (1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云',1113);
INSERT INTO company VALUES
 (2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云',14113);
INSERT INTO company VALUES
 (3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机',2012);
INSERT INTO company VALUES
 (4,4,4,'dtstack_04',4,'dtstack_04','杭州',4,'杭州袋鼠',9000);

-- 提交事务
COMMIT;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，表 company中的所有数据 | 对应生成sql：select * from company，并展示表中所有数据 |
| 3 | 在 company下，帮我查询销售额sale最高的数据 | 对应生成sql,并展示表中销售额最高的数据 |

##### 验证同一个问题重复提问 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，表 company中的所有数据 | 对应生成sql：select * from company，并展示表中所有数据 |
| 3 | 再次提问：对应生成sql：select * from company，并展示表中所有数据 | 给出一样的答案，对应生成sql：select * from company，并展示表中所有数据 |

##### 验证starrocks 数据查询-验证没有权限查询数据的角色 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 运维 | starrocksl数据源表，没有查询数据权限 |
| 3 | 访客 | starrocks数据源表，没有查询数据权限 |
| 4 | 查询信息时会弹出回复 | 回答：权限不足，请联系管理员处理 |

##### 验证starrocks 数据查询-验证有权限查询数据的角色 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 项目所有者 | starrocks数据源表可查询 |
| 3 | 项目管理员 | starrocks数据源表可查询 |
| 4 | 数据开发 | starrocks数据源表可查询 |

##### 验证starrocks 数据查询-验证查询不存在的表数据 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 不存在表：test_new |  |
| 3 | 输入查询语句：查询任务类型，表test_new的所有数据 | 返回提示没有该表 |

##### 验证starrocks 数据查询-验证控制台查询上限小于1000，并设置下载上限大于1000，预览仅显示设置上限数据 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 控制台-绑定租户-通用信息：开启允许下载select查询结果，查询上限100，下载上限为1100 |  |
| 3 | 创建表test，导入1200条数据 | 系统提示导入成功，数据已同步至对应列表，记录数与导入文件中数据量一致 |
| 4 | 查询任务类型，表test中的所有数据 | 展示前100条数据，下载显示1100条数据 |

##### 验证starrocks 数据查询-验证控制台查询上限大于1000，并设置下载上限小于1000，预览仅显示1000条数据 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 控制台-绑定租户-通用信息：开启允许下载select查询结果，查询上限1200，下载上限为200 |  |
| 3 | 创建表test，导入1200条数据 | 系统提示导入成功，数据已同步至对应列表，记录数与导入文件中数据量一致 |
| 4 | 查询任务类型，表test中的所有数据 | 展示前1200条数据，下载显示200条数据 |

##### 验证starrocks 数据查询-验证控制台查询上限小于1000，预览仅显示设置上限数据 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 控制台-绑定租户-通用信息：关闭允许下载select查询结果，select查询条数的上线设置为800 |  |
| 3 | 创建表test，导入1200条数据 | 系统提示导入成功，数据已同步至对应列表，记录数与导入文件中数据量一致 |
| 4 | 查询任务类型，表test中的所有数据 | 展示前800条数据，下载显示1200条数据 |

##### 验证starrocks 数据查询-验证控制台查询上限大于1000，预览仅显示1000条数据 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 控制台-绑定租户-通用信息：关闭允许下载select查询结果，select查询条数的上线设置为2000 |  |
| 3 | 创建表test，导入1200条数据 | 系统提示导入成功，数据已同步至对应列表，记录数与导入文件中数据量一致 |
| 4 | 查询任务类型，表test中的所有数据 | 展示前1000条数据，下载显示1200条数据 |

##### 验证starrocks 数据查询-多表联合查询（join。。。on。。。）【跨库联合查询，同库联合查询】 「P1」

> 前置条件
```
--table1: 员工表
  DROP TABLE IF EXISTS employee;
  CREATE TABLE employee(
  id int comment '员工编号', name VARCHAR(30) comment '员工姓名', salary int comment '员工工资' 
  )PROPERTIES ( 
  “replication_num“ = “2“
  );

--table2:员工住址信息表 
  DROP TABLE IF EXISTS employee_address;
  CREATE TABLE employee_address (
  id int comment '员工编号', street VARCHAR(30) comment '员工所在街道', city VARCHAR(30) comment '员工所在城市' 
  )PROPERTIES ( 
  “replication_num“ = “2“
  ); 

--table3:员工联系方式表 
  DROP TABLE IF EXISTS employee_connection;
  CREATE TABLE employee_connection ( 
  id int comment '员工编号', phone VARCHAR(30) comment '员工电话', email VARCHAR(30) comment '员工邮箱' 
  )PROPERTIES ( 
  “replication_num“ = “2“
  ); 

insert into employee values(1,'张三',5000),(2,'李四',5500),(3,'赵四',5500); 
  insert into employee_address values (1,'西溪大街','杭州'),(2,'东北大街','哈尔滨'),(3,'东北大街','哈尔滨'); 
  insert into employee_connection values (1,'15655555555','zhangsan@qq.com'),(2,'15655555551','lisi@qq.com'),(3,'15655555541','zhaosi@qq.com');

-- 步骤1
  SELECT * FROM employee;

-- 步骤2，查询任务类型，根据表employee，employee_address，查询所有员工的员工姓名，员工所在街道，员工所在城市
  SELECT 
  e1.name as “员工姓名“, 
  e2.street as “员工所在街道“, 
  e2.city as “员工所在城市“
  FROM employee e1
  JOIN employee_address e2 ON e1.id = e2.id;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，根据表employee，employee_address，查询所有员工的员工姓名，员工所在街道，员工所在城市 | 对应生成sql,并展示表中正确的数据 |

##### 验证starrocks 数据查询-验证查询数据（avg） 「P2」

> 前置条件
```
DROP TABLE IF EXISTS company;
  CREATE TABLE company(
  id BIGINT COMMENT'编号',
  qy_type SMALLINT COMMENT'类型',
  company_code BIGINT COMMENT'公司编号',
  company_name VARCHAR(30) COMMENT'公司名称',
  project_no BIGINT COMMENT'项目编号',
  project_name VARCHAR(30) COMMENT'项目名称',
  projectstage_name VARCHAR(30) COMMENT'项目地址',
  jz_type_name SMALLINT COMMENT'类型名称',
  building_name VARCHAR(30) COMMENT'建造单位',
  sale BIGINT COMMENT'销售额' 
  )PROPERTIES ( 
  “replication_num“ = “2“
  );

INSERT INTO company VALUES
  (1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云','1113'),
  (2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云','14113'),
  (3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机','2012'),
  (4,4,4,'dtstack_04',4,'dtstack_03','杭州',4,'杭州袋鼠','9000');

-- 步骤1
  SELECT * FROM company;

-- 步骤2, 根据销售额计算出所有员工的平均销售额
  SELECT AVG(sale) AS 平均销售额 FROM company;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，表 company中的所有数据 | 对应生成sql：select * from company，并展示表中所有数据 |
| 3 | 根据销售额计算出所有员工的平均销售额 | 对应生成sql,并展示表中正确的数据 |

##### 验证starrocks 数据查询-验证查询数据去重（distinct.） 「P2」

> 前置条件
```
DROP TABLE IF EXISTS company;
  CREATE TABLE company( 
  id BIGINT COMMENT'编号', 
  qy_type SMALLINT COMMENT'类型', 
  company_code BIGINT COMMENT'公司编号', 
  company_name VARCHAR(30) COMMENT'公司名称', 
  project_no BIGINT COMMENT'项目编号', 
  project_name VARCHAR(30) COMMENT'项目名称', 
  projectstage_name VARCHAR(30) COMMENT'项目地址', 
  jz_type_name SMALLINT COMMENT'类型名称', 
  building_name VARCHAR(30) COMMENT'建造单位', 
  sale BIGINT COMMENT'销售额' 
  )ENGINE=OLAP 
  DISTRIBUTED BY HASH(id) BUCKETS 10 
  PROPERTIES ( 
  “replication_num“ = “2“
  );

INSERT INTO company VALUES
  (1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云','1113'), 
  (2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云','14113'), 
  (3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机','2012'), 
  (4,4,4,'dtstack_04',4,'dtstack_03','杭州',4,'杭州袋鼠','9000');
  
  -- 步骤1
  SELECT * FROM company;

-- 步骤2
  select distinct(project_name) FROM company;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，company中的所有数据 | 对应生成sql：select * from company，并展示表中所有数据 |
| 3 | 帮我查询项目名称去重的数据 | 对应生成sql,并展示表中正确的数据 |

##### 验证starrocks 数据查询-验证查询分组数据（Group...by...） 「P1」

> 前置条件
```
DROP TABLE IF EXISTS company;
      CREATE TABLE company( 
      id BIGINT COMMENT'编号', 
      qy_type SMALLINT COMMENT'类型', 
      company_code BIGINT COMMENT'公司编号', 
      company_name VARCHAR(30) COMMENT'公司名称', 
      project_no BIGINT COMMENT'项目编号', 
      project_name VARCHAR(30) COMMENT'项目名称', 
      projectstage_name VARCHAR(30) COMMENT'项目地址', 
      jz_type_name SMALLINT COMMENT'类型名称', 
      building_name VARCHAR(30) COMMENT'建造单位', 
      sale BIGINT COMMENT'销售额' 
      )ENGINE=OLAP 
      DISTRIBUTED BY HASH(id) BUCKETS 10 
      PROPERTIES ( 
      “replication_num“ = “2“
      );

INSERT INTO company VALUES
      (1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云','1113'), 
      (2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云','14113'), 
      (3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机','2012'), 
      (4,4,4,'dtstack_04',4,'dtstack_03','杭州',4,'杭州袋鼠','9000');

-- 步骤1
      SELECT * FROM company;

-- 步骤2
      SELECT
      projectstage_name AS 项目地址,
      SUM(sale) AS 总销售额,
      AVG(sale) AS 平均销售额,
      COUNT(*) AS 项目数量
      FROM
      company
      GROUP BY
      projectstage_name;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，表 company中的所有数据 | 对应生成sql：select * from company，并展示表中所有数据 |
| 3 | 在 company下，帮我查询项目地址为湖州的数据 | 对应生成sql,并展示表中正确的数据 |

##### 验证starrocks 数据查询-验证查询数据之间的数据（between...and...） 「P1」

> 前置条件
```
-- 创建表语句（StarRocks 语法）
CREATE TABLE IF NOT EXISTS `company`(
 `id` BIGINT COMMENT '编号',
 `qy_type` SMALLINT COMMENT '类型',
 `company_code` BIGINT COMMENT '公司编号',
 `company_name` VARCHAR(100) COMMENT '公司名称',
 `project_no` BIGINT COMMENT '项目编号',
 `project_name` VARCHAR(100) COMMENT '项目名称',
 `project_address` VARCHAR(100) COMMENT '项目地址',
 `jz_type` SMALLINT COMMENT '类型名称',
 `builder_name` VARCHAR(100) COMMENT '建造单位',
 `sale_amount` BIGINT COMMENT '销售额'
)
DISTRIBUTED BY HASH(`id`) BUCKETS 10
PROPERTIES (
 “replication_num“ = “3“
);

-- 插入数据语句（StarRocks 语法）
INSERT INTO company VALUES
 (1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云',1113),
 (2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云',14113),
 (3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机',2012),
 (4,4,4,'dtstack_04',4,'dtstack_04','杭州',4,'杭州袋鼠',9000);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询l任务类型，表 company中的所有数据 | 对应生成sql：select * from company，并展示表中所有数据 |
| 3 | 在 company下，帮我查询销售额在3000到9000之间的数据 | 对应生成sql,并展示表中正确的数据 |

##### 验证starrocks 数据查询-验证查询最高销售额数据（desc...limit） 「P1」

> 前置条件
```
-- 创建表语句（StarRocks 语法）
CREATE TABLE IF NOT EXISTS `company`(
 `id` BIGINT COMMENT '编号',
 `qy_type` SMALLINT COMMENT '类型',
 `company_code` BIGINT COMMENT '公司编号',
 `company_name` VARCHAR(100) COMMENT '公司名称',
 `project_no` BIGINT COMMENT '项目编号',
 `project_name` VARCHAR(100) COMMENT '项目名称',
 `project_address` VARCHAR(100) COMMENT '项目地址',
 `jz_type` SMALLINT COMMENT '类型名称',
 `builder_name` VARCHAR(100) COMMENT '建造单位',
 `sale_amount` BIGINT COMMENT '销售额'
)
DISTRIBUTED BY HASH(`id`) BUCKETS 10
PROPERTIES (
 “replication_num“ = “3“
);

-- 插入数据语句（StarRocks 语法）
INSERT INTO company VALUES
 (1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云',1113),
 (2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云',14113),
 (3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机',2012),
 (4,4,4,'dtstack_04',4,'dtstack_04','杭州',4,'杭州袋鼠',9000);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，表 company中的所有数据 | 对应生成sql：select * from company，并展示表中所有数据 |
| 3 | 在 company下，帮我查询销售额sale最高的数据 | 对应生成sql,并展示表中销售额最高的数据 |

##### 验证同一个问题重复提问 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，表 company中的所有数据 | 对应生成sql：select * from company，并展示表中所有数据 |
| 3 | 再次提问：对应生成sql：select * from company，并展示表中所有数据 | 给出一样的答案，对应生成sql：select * from company，并展示表中所有数据 |

##### 验证hivesql 数据查询-验证没有权限查询数据的角色 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 运维 | hivesqll数据源表，没有查询数据权限 |
| 3 | 访客 | hivesql数据源表，没有查询数据权限 |
| 4 | 查询信息时会弹出回复 | 回答：权限不足，请联系管理员处理 |

##### 验证hivesql 数据查询-验证有权限查询数据的角色 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 项目所有者 | hivesql数据源表可查询 |
| 3 | 项目管理员 | hivesql数据源表可查询 |
| 4 | 数据开发 | hivesql数据源表可查询 |

##### 验证hivesql 数据查询-验证查询不存在的表数据 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 不存在表：test_new |  |
| 3 | 输入查询语句：查询任务类型，表test_new的所有数据 | 返回提示没有该表 |

##### 验证hivesql 数据查询-验证控制台查询上限小于1000，并设置下载上限大于1000，预览仅显示设置上限数据 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 控制台-绑定租户-通用信息：开启允许下载select查询结果，查询上限100，下载上限为1100 |  |
| 3 | 创建表test，导入1200条数据 | 系统提示导入成功，数据已同步至对应列表，记录数与导入文件中数据量一致 |
| 4 | 查询任务类型，表test中的所有数据 | 展示前100条数据，下载显示1100条数据 |

##### 验证hivesql 数据查询-验证控制台查询上限大于1000，并设置下载上限小于1000，预览仅显示1000条数据 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 控制台-绑定租户-通用信息：开启允许下载select查询结果，查询上限1200，下载上限为200 |  |
| 3 | 创建表test，导入1200条数据 | 系统提示导入成功，数据已同步至对应列表，记录数与导入文件中数据量一致 |
| 4 | 查询任务类型，表test中的所有数据 | 展示前1200条数据，下载显示200条数据 |

##### 验证hivesql 数据查询-验证控制台查询上限小于1000，预览仅显示设置上限数据 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 控制台-绑定租户-通用信息：关闭允许下载select查询结果，select查询条数的上线设置为800 |  |
| 3 | 创建表test，导入1200条数据 | 系统提示导入成功，数据已同步至对应列表，记录数与导入文件中数据量一致 |
| 4 | 查询任务类型，表test中的所有数据 | 展示前800条数据，下载显示1200条数据 |

##### 验证hivesql 数据查询-验证控制台查询上限大于1000，预览仅显示1000条数据 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 控制台-绑定租户-通用信息：关闭允许下载select查询结果，select查询条数的上线设置为2000 |  |
| 3 | 创建表test，导入1200条数据 | 系统提示导入成功，数据已同步至对应列表，记录数与导入文件中数据量一致 |
| 4 | 查询任务类型，表test中的所有数据 | 展示前1000条数据，下载显示1200条数据 |

##### 验证hivesql 数据查询-多表联合查询（join。。。on。。。）【跨库联合查询，同库联合查询】 「P1」

> 前置条件
```
--table1: 员工表
CREATE TABLE employee(
id int comment '员工编号',
name string comment '员工姓名',
salary int comment '员工工资'
) ;
--table2:员工住址信息表
CREATE TABLE employee_address (
id int  comment '员工编号',
street string  comment '员工所在街道',
city string  comment '员工所在城市'
);
--table3:员工联系方式表
CREATE TABLE employee_connection (
id int  comment '员工编号',
phno string  comment '员工电话',
email string  comment '员工邮箱'
);
insert into employee values(1,'张三',5000),(2,'李四',5500),(3,'赵四',5500);
insert into employee_address values (1,'西溪大街','杭州'),(2,'东北大街','哈尔滨'),(3,'东北大街','哈尔滨');
insert into employee_connection values (1,'15655555555','zhangsan@qq.com'),(2,'15655555551','lisi@qq.com'),(3,'15655555541','zhaosi@qq.com');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，根据表employee，employee_address，查询所有员工的员工姓名，员工所在街道，员工所在城市 | 对应生成sql,并展示表中正确的数据 |

##### 验证hivesql 数据查询-验证查询数据（avg） 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，表 company中的所有数据 | 对应生成sql：select * from company，并展示表中所有数据 |
| 3 | 在 company下，根据销售额计算出所有员工的平均销售额 | 对应生成sql,并展示表中正确的数据 |

##### 验证hivesql 数据查询-验证查询数据去重（distinct.） 「P2」

> 前置条件
```
CREATE TABLE IF NOT EXISTS `company_sale`(
    `号码` BIGINT COMMENT'编号',
    `qy_type` SMALLINT COMMENT'类型',
    `company_code` BIGINT COMMENT'公司编号',
    `company_name` STRING COMMENT'公司名称',
    `project_no` BIGINT COMMENT'项目编号',
    `project_name` STRING COMMENT'项目名称',
    `projectstage_name` STRING COMMENT'项目地址',
    `jz_type_name` SMALLINT COMMENT'类型名称',
    `building_name` STRING COMMENT'建造单位',
    `sale` BIGINT COMMENT'销售额'
 )stored as orc;

 INSERT INTO TABLE
   company_sale
VALUES
    (1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云','1113'),
    (2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云','14113'),
    (3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机','2012'),
    (4,4,4,'dtstack_04',4,'dtstack_03','杭州',4,'杭州袋鼠','9000')
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，表 company中的所有数据 | 对应生成sql：select * from company，并展示表中所有数据 |
| 3 | 在 company下，帮我查询项目名称去重的数据 | 对应生成sql,并展示表中正确的数据 |

##### 验证hivesql 数据查询-验证查询分组数据（Group...by...） 「P1」

> 前置条件
```
CREATE TABLE IF NOT EXISTS `company_sale`(
 `号码` BIGINT COMMENT'编号',
 `qy_type` SMALLINT COMMENT'类型',
 `company_code` BIGINT COMMENT'公司编号',
 `company_name` STRING COMMENT'公司名称',
 `project_no` BIGINT COMMENT'项目编号',
 `project_name` STRING COMMENT'项目名称',
 `projectstage_name` STRING COMMENT'项目地址',
 `jz_type_name` SMALLINT COMMENT'类型名称',
 `building_name` STRING COMMENT'建造单位',
 `sale` BIGINT COMMENT'销售额'
 )stored as orc;

 INSERT INTO TABLE
 company_sale
VALUES
 (1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云','1113'),
 (2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云','14113'),
 (3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机','2012'),
 (4,4,4,'dtstack_04',4,'dtstack_03','杭州',4,'杭州袋鼠','9000')
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，表 company中的所有数据 | 对应生成sql：select * from company，并展示表中所有数据 |
| 3 | 在 company下，帮我查询项目地址为湖州的数据 | 对应生成sql,并展示表中正确的数据 |

##### 验证hivesql 数据查询-验证查询数据之间的数据（between...and...） 「P1」

> 前置条件
```
CREATE TABLE IF NOT EXISTS `company_sale`(
 `号码` BIGINT COMMENT'编号',
 `qy_type` SMALLINT COMMENT'类型',
 `company_code` BIGINT COMMENT'公司编号',
 `company_name` STRING COMMENT'公司名称',
 `project_no` BIGINT COMMENT'项目编号',
 `project_name` STRING COMMENT'项目名称',
 `projectstage_name` STRING COMMENT'项目地址',
 `jz_type_name` SMALLINT COMMENT'类型名称',
 `building_name` STRING COMMENT'建造单位',
 `sale` BIGINT COMMENT'销售额'
 )stored as orc;

 INSERT INTO TABLE
 company_sale
VALUES
 (1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云','1113'),
 (2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云','14113'),
 (3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机','2012'),
 (4,4,4,'dtstack_04',4,'dtstack_03','杭州',4,'杭州袋鼠','9000')
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，表 company中的所有数据 | 对应生成sql：select * from company，并展示表中所有数据 |
| 3 | 帮我查询销售额在3000到9000之间的数据 | 对应生成sql,并展示表中正确的数据 |

##### 验证hivesql 数据查询-验证查询最高销售额数据（desc...limit） 「P1」

> 前置条件
```
CREATE TABLE IF NOT EXISTS `company_sale`(
 `号码` BIGINT COMMENT'编号',
 `qy_type` SMALLINT COMMENT'类型',
 `company_code` BIGINT COMMENT'公司编号',
 `company_name` STRING COMMENT'公司名称',
 `project_no` BIGINT COMMENT'项目编号',
 `project_name` STRING COMMENT'项目名称',
 `projectstage_name` STRING COMMENT'项目地址',
 `jz_type_name` SMALLINT COMMENT'类型名称',
 `building_name` STRING COMMENT'建造单位',
 `sale` BIGINT COMMENT'销售额'
 )stored as orc;

 INSERT INTO TABLE
 company_sale
VALUES
 (1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云','1113'),
 (2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云','14113'),
 (3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机','2012'),
 (4,4,4,'dtstack_04',4,'dtstack_03','杭州',4,'杭州袋鼠','9000')
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，表 company中的所有数据 | 对应生成sql：select * from company，并展示表中所有数据 |
| 3 | 在 company下，帮我查询销售额sale最高的数据 | 对应生成sql,并展示表中销售额最高的数据 |

##### 验证同一个问题重复提问 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，表 company中的所有数据 | 对应生成sql：select * from company，并展示表中所有数据 |
| 3 | 再次提问：对应生成sql：select * from company，并展示表中所有数据 | 给出一样的答案，对应生成sql：select * from company，并展示表中所有数据 |

##### 验证oushu 数据查询-验证没有权限查询数据的角色 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 运维 | oushu sqll数据源表，没有查询数据权限 |
| 3 | 访客 | oushu sql数据源表，没有查询数据权限 |
| 4 | 数据开发 | oushu sql数据源表，没有查询数据权限 |
| 5 | 查询信息时会弹出回复 | 回答：权限不足，请联系管理员处理 |

##### 验证oushu 数据查询-验证有权限查询数据的角色 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 项目所有者 | oushu sql数据源表可查询 |
| 3 | 项目管理员 | oushu sql数据源表可查询 |

##### 验证oushu 数据查询-验证查询不存在的表数据 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 不存在表：test_new |  |
| 3 | 输入查询语句：查询任务类型，表test_new的所有数据 | 返回提示没有该表 |

##### 验证oushu 数据查询-验证控制台查询上限小于1000，并设置下载上限大于1000，预览仅显示设置上限数据 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 控制台-绑定租户-通用信息：开启允许下载select查询结果，查询上限100，下载上限为1100 |  |
| 3 | 创建表test，导入1200条数据 | 系统提示导入成功，数据已同步至对应列表，记录数与导入文件中数据量一致 |
| 4 | 查询任务类型，表test中的所有数据 | 展示前100条数据，下载显示1100条数据 |

##### 验证oushu 数据查询-验证控制台查询上限大于1000，并设置下载上限小于1000，预览仅显示1000条数据 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 控制台-绑定租户-通用信息：开启允许下载select查询结果，查询上限1200，下载上限为200 |  |
| 3 | 创建表test，导入1200条数据 | 系统提示导入成功，数据已同步至对应列表，记录数与导入文件中数据量一致 |
| 4 | 查询任务类型，表test中的所有数据 | 展示前1200条数据，下载显示200条数据 |

##### 验证oushu 数据查询-验证控制台查询上限小于1000，预览仅显示设置上限数据 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 控制台-绑定租户-通用信息：关闭允许下载select查询结果，select查询条数的上线设置为800 |  |
| 3 | 创建表test，导入1200条数据 | 系统提示导入成功，数据已同步至对应列表，记录数与导入文件中数据量一致 |
| 4 | 查询任务类型，表test中的所有数据 | 展示前800条数据，下载显示1200条数据 |

##### 验证oushu 数据查询-验证控制台查询上限大于1000，预览仅显示1000条数据 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 控制台-绑定租户-通用信息：关闭允许下载select查询结果，select查询条数的上线设置为2000 |  |
| 3 | 创建表test，导入1200条数据 | 系统提示导入成功，数据已同步至对应列表，记录数与导入文件中数据量一致 |
| 4 | 查询任务类型，表test中的所有数据 | 展示前1000条数据，下载显示1200条数据 |

##### 验证oushu 数据查询-多表联合查询（join。。。on。。。）【跨库联合查询，同库联合查询】 「P1」

> 前置条件
```
-- 员工表（添加主键和分布策略）
CREATE TABLE employee(
 id int PRIMARY KEY comment '员工编号',
 name varchar(50) comment '员工姓名',
 salary int comment '员工工资'
) DISTRIBUTED BY (id);

-- 员工住址信息表（添加外键关系）
CREATE TABLE employee_address (
 id int REFERENCES employee(id) comment '员工编号',
 street varchar(100) comment '员工所在街道',
 city varchar(50) comment '员工所在城市'
) DISTRIBUTED BY (id);

-- 员工联系方式表（添加外键关系）
CREATE TABLE employee_connection (
 id int REFERENCES employee(id) comment '员工编号',
 phno varchar(20) comment '员工电话',
 email varchar(100) comment '员工邮箱'
) DISTRIBUTED BY (id);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，根据表employee，employee_address，查询所有员工的员工姓名，员工所在街道，员工所在城市 | 对应生成sql,并展示表中正确的数据 |

##### 验证oushu 数据查询-验证查询数据（avg） 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，表 company中的所有数据 | 对应生成sql：select * from company，并展示表中所有数据 |
| 3 | 在 company下，根据销售额计算出所有员工的平均销售额 | 对应生成sql,并展示表中正确的数据 |

##### 验证oushu 数据查询-验证查询数据去重（distinct.） 「P2」

> 前置条件
```
CREATE TABLE IF NOT EXISTS `company`(
  `号码` BIGINT COMMENT '编号', 
  `qy_type` SMALLINT COMMENT '类型', 
  `company_code` BIGINT COMMENT '公司编号', 
  `company_name` VARCHAR(100) COMMENT '公司名称', 
  `project_no` BIGINT COMMENT '项目编号', 
  `project_name` VARCHAR(100) COMMENT '项目名称', 
  `project_address` VARCHAR(100) COMMENT '项目地址', 
  `jz_type` SMALLINT COMMENT '类型名称', 
  `building_name` VARCHAR(100) COMMENT '建造单位', 
  `sale` BIGINT COMMENT '销售额'
) 
STORED AS ORC
DISTRIBUTED BY (号码);

INSERT INTO company 
VALUES 
  (1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云',1113), 
  (2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云',14113), 
  (3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机',2012), 
  (4,4,4,'dtstack_04',4,'dtstack_04','杭州',4,'杭州袋鼠',9000);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，表 company中的所有数据 | 对应生成sql：select * from company，并展示表中所有数据 |
| 3 | 在 company下，帮我查询项目名称去重的数据 | 对应生成sql,并展示表中正确的数据 |

##### 验证oushu 数据查询-验证查询分组数据（Group...by...） 「P1」

> 前置条件
```
CREATE TABLE IF NOT EXISTS `company`(
  `号码` BIGINT COMMENT '编号', 
  `qy_type` SMALLINT COMMENT '类型', 
  `company_code` BIGINT COMMENT '公司编号', 
  `company_name` VARCHAR(100) COMMENT '公司名称', 
  `project_no` BIGINT COMMENT '项目编号', 
  `project_name` VARCHAR(100) COMMENT '项目名称', 
  `project_address` VARCHAR(100) COMMENT '项目地址', 
  `jz_type` SMALLINT COMMENT '类型名称', 
  `building_name` VARCHAR(100) COMMENT '建造单位', 
  `sale` BIGINT COMMENT '销售额'
) 
STORED AS ORC
DISTRIBUTED BY (号码);

INSERT INTO company 
VALUES 
  (1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云',1113), 
  (2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云',14113), 
  (3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机',2012), 
  (4,4,4,'dtstack_04',4,'dtstack_04','杭州',4,'杭州袋鼠',9000);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，表 company中的所有数据 | 对应生成sql：select * from company，并展示表中所有数据 |
| 3 | 帮我查询项目地址为湖州的数据 | 对应生成sql,并展示表中正确的数据 |

##### 验证oushu 数据查询-验证查询数据之间的数据（between...and...） 「P1」

> 前置条件
```
CREATE TABLE IF NOT EXISTS `company`(
  `号码` BIGINT COMMENT '编号', 
  `qy_type` SMALLINT COMMENT '类型', 
  `company_code` BIGINT COMMENT '公司编号', 
  `company_name` VARCHAR(100) COMMENT '公司名称', 
  `project_no` BIGINT COMMENT '项目编号', 
  `project_name` VARCHAR(100) COMMENT '项目名称', 
  `project_address` VARCHAR(100) COMMENT '项目地址', 
  `jz_type` SMALLINT COMMENT '类型名称', 
  `building_name` VARCHAR(100) COMMENT '建造单位', 
  `sale` BIGINT COMMENT '销售额'
) 
STORED AS ORC
DISTRIBUTED BY (号码);

INSERT INTO company 
VALUES 
  (1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云',1113), 
  (2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云',14113), 
  (3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机',2012), 
  (4,4,4,'dtstack_04',4,'dtstack_04','杭州',4,'杭州袋鼠',9000);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，表 company中的所有数据 | 对应生成sql：select * from company，并展示表中所有数据 |
| 3 | 帮我查询销售额在3000到9000之间的数据 | 对应生成sql,并展示表中正确的数据 |

##### 验证oushu 数据查询-多个表具有相同的comment 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 多个表的表名字段comment相同，根据中文comment查询表名时，随机查询表 |  |

##### 验证oushu 数据查询-思考过程 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 比如查询一张表，有详细过程操作 | 用户请求查询表employee的所有数据 |
| 3 |  | 检查Schema信息，未找到名为employee的表 |
| 4 |  | 由于没有匹配的表，无法生成查询SQL |
| 5 |  | 返回空结果并说明原因：提供的表结构信息不足以生成 sql 查询 |

##### 验证oushu 数据查询-验证表结构变更实时性 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 编辑表字段，新增，删除表字段 | 查询数据字段实时变化 |
| 3 | 表中数据新增 | 查询数据实时变化 |
| 4 | 表被删除，查询会报错 | 待做 |

##### 验证oushu 数据查询-验证只要查询表名 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | Meta数据源中的表，只需要直接查询表名 | 查询出表数据 |

##### 验证oushu 数据查询-验证查询最高销售额数据（desc...limit） 「P1」

> 前置条件
```
CREATE TABLE IF NOT EXISTS `company`(
  `号码` BIGINT COMMENT '编号', 
  `qy_type` SMALLINT COMMENT '类型', 
  `company_code` BIGINT COMMENT '公司编号', 
  `company_name` VARCHAR(100) COMMENT '公司名称', 
  `project_no` BIGINT COMMENT '项目编号', 
  `project_name` VARCHAR(100) COMMENT '项目名称', 
  `project_address` VARCHAR(100) COMMENT '项目地址', 
  `jz_type` SMALLINT COMMENT '类型名称', 
  `building_name` VARCHAR(100) COMMENT '建造单位', 
  `sale` BIGINT COMMENT '销售额'
) 
STORED AS ORC
DISTRIBUTED BY (号码);

INSERT INTO company 
VALUES 
  (1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云',1113), 
  (2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云',14113), 
  (3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机',2012), 
  (4,4,4,'dtstack_04',4,'dtstack_04','杭州',4,'杭州袋鼠',9000);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 查询任务类型，表 company中的所有数据 | 对应生成sql：select * from company，并展示表中所有数据 |
| 3 | 帮我查询销售额sale最高的数据 | 对应生成sql,并展示表中销售额最高的数据 |

##### 验证同一个问题重复提问 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 给出答案一样 |  |

##### 验证数栈操作答疑 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 输入操作手册中的问题 | 回答正确，内容与预期完全一致，无异常或错误 |
| 3 | 参考离线操作手册 |  |

##### 验证text to sql，写操作语句 「P1」

> 前置条件
```
1.比如生成表名test，字段id为整型，字段name为字符串的表
2.生成插入id为1，name为张三的sql
3.生成删除id为1的sql
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 下发指令，让其生成建表语句，插入语句，删除语句等 | 生成sql语句成功，系统给出成功反馈，相关页面/数据状态更新为最新 |

##### 验证通用功能 数据查询-验证查询的表名，表字段comment有中文 「P1」

> 前置条件
```
CREATE TABLE employee(
id int comment '员工编号',
name string comment '员工姓名',
salary int comment '员工工资'
)comment '员工' ;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 可根据表名和表字段的comment描述查询数据 | 数据查询正确，内容与预期完全一致，无异常或错误 |
| 3 | 指定任务类型，查询表员工表中的员工编号和员工姓名 | 数据查询正确，内容与预期完全一致，无异常或错误 |

##### 验证通用功能 数据查询-验证查询的sql类型不支持的情况 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 平台对接了Meta数据源 | 可以正常查询 |
| 3 | 平台没有对接Meta数据源 | 回答：目前还不支持xxx类型的查询，不支持 |

##### 验证通用功能 数据查询-验证非查询类语句 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 若用户编辑语句修改为create、insert，delete等语句 | 回答：执行的语句中包含DDL语句，无法进行查询操作 |
| 3 |  | 具体以实际内容返回的为主 |

##### 验证执行多条sql语句 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 指令中要求同时查两个表 | 后端抛出报错 |
| 3 | 运行sql中执行2条或者多条查询sql语句 | 后端抛出报错 |

##### 验证通用功能 数据查询-验证无法写出具体sql的情况 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 当没有给出具体的查询信息时：比如没有指明sql类型，表名 | 请告诉我要写的查询sql类型，以及查询的具体数据库、数据表名称。（模型可以根据问题判断出，有哪些关键点没有获取到，并对应回答） |

##### 验证通用功能 数据查询-验证可查询的问题的运行结果 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 提出可查询的问题：查询数据源，schema为test，表test的所有数据 | 对应生成sql：select * from test和结果 |
| 3 | 结果 | 展示查询到的数据信息 |
| 4 | 去除查看日志 | 错误信息右上角弹出提示，查询中和查询正确无提示 |
| 5 | 点击下载数据 | 可下载数据文件，打开文件数据展示正确，内容与预期完全一致，无异常或错误 |
| 6 | 点击hover图标 | 显示：预览仅显示1000条，点击’下载‘获取完整结果 |
| 7 | 刷新按钮 | 刷新次数无限制，记录最近五次的结果，可以左右切换5次的结果 |

##### 验证通用功能 数据查询-验证可查询的问题生成的sql 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 提出可查询的问题：查询数据源，schema为test，表test的所有数据 | 对应生成sql：select * from test和结果 |
| 3 | 生成的sql | 默认为收起状态 |
| 4 | 生成的sql可点击右边的展开/收起图标 | 分别展开和收起弹窗 |
| 5 | sql任务点击运行按钮 | 可分别运行SQL |
| 6 | sql任务点击停止按钮 | 停止SQL任务运行 |
| 7 | sql任务编辑后点击运行 | 可二次运行，生成新的数据 |
| 8 | 点击右上角的复制按钮 | 可复制sql任务，并粘贴数据成功，系统给出成功反馈，相关页面/数据状态更新为最新 |

##### 验证通用功能 产品操作答疑-验证输入无关问题 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 输入与离线开发无关的问题：今天天气如何 | 回答：您好，灵瞳暂时不支持无关问题问答，请询问关于sql问答、数据查询、产品操作答疑类问题。 |

##### 验证智能小助手页面展示 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 左上角，小助手名称 | 灵瞳 |
| 3 | 左上角，橡皮擦清除按钮 | 清除当前对话 |
| 4 | 右上角，收缩按钮 | 对话框收缩和扩大，具体参考UI设计图 |
| 5 | 右上角：收起对话 | 关闭小助手对话框 |
| 6 | 页面默认数据展示参考ui设计图 |  |

##### 验证代码续写——验证sql输入错误的语法、关键字、函数进行智能优化ai如何应对 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL周期/手动/临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句包含错误的语法、关键字、函数） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 选中部分/全部/空白sql语句点击智能优化/右键-点击智能优化 | 1.问题发送成功2.ai对该情况作出正确应对 |

##### 验证代码续写——验证sql输入离线不支持的sql语法、函数进行智能优化ai如何应对 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL周期/手动/临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句包含离线不支持的语法或函数） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 选中部分/全部/空白sql语句点击智能优化/右键-点击智能优化 | 1.问题发送成功2.ai对该情况作出正确应对 |

##### 验证代码续写——验证不存在任何sql语句进行智能优化ai如何应对 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL周期/手动/临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 点击智能优化/右键-点击智能优化 | 弹出提示：提问内容为空 |

##### 验证代码续写——验证使用正确且完整的sql智能优化ai如何应对 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL周期/手动/临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句正确且完整无误） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 选中部分/全部/空白sql语句点击智能优化/右键-点击智能优化 | 1.问题发送成功2.ai对该情况作出正确应对 |

##### 验证智能诊断——验证多次进行日志智能解析ai如何应对 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL周期/手动/临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（任务内的sql运行会导致报错） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 点击运行 | 1.任务运行失败 |
| 5 | 点击日志智能解析按钮 | 1.问题发送成功2.ai对该情况作出正确应对 |
| 6 | 再次点击日志智能解析按钮 | 1.问题发送成功2.ai对同一报错情况作出相同应对 |

##### 验证智能诊断——验证由于无数据源或数据源链接失败等其他非sql原因报错进行日志智能解析ai如何应对 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL周期/手动/临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句正常运行不报错，但有其他如无数据源或数据源链接失败导致的报错） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 点击运行 | 1.任务运行失败 |
| 5 | 点击日志智能解析按钮 | 1.问题发送成功2.ai对该情况作出正确应对 |

##### 验证智能诊断——验证无sql报错时进行日志智能解析ai如何应对 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL周期/手动/临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句正常运行不报错） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 点击运行 | 1.任务运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 5 | 点击日志智能解析按钮 | 1.问题发送成功2.ai对该情况作出正确应对 |

##### 验证智能解释——验证sql输入错误的语法、关键字、函数进行智能解释ai如何应对 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL周期/手动/临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句包含错误的语法、关键字、函数） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 选中部分/全部/空白sql语句点击智能解释/右键-点击智能解释 | 1.问题发送成功2.ai对该情况作出正确应对 |

##### 验证智能解释——验证sql输入离线不支持的sql语法、函数进行智能解释ai如何应对 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL周期/手动/临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句包含离线不支持的语法或函数） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 选中部分/全部/空白sql语句点击智能解释/右键-点击智能解释 | 1.问题发送成功2.ai对该情况作出正确应对 |

##### 验证智能解释——验证不输入任何sql进行智能解释ai如何应对 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL周期/手动/临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 点击智能解释/右键-点击智能解释 | 弹出提示：提问内容为空 |

##### 验证智能解释——验证对同一sql多次进行智能解释ai如何应对 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL周期/手动/临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存 | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 选中部分/全部/空白sql语句点击智能解释/右键-点击智能解释 | 1.问题发送成功2.ai对该情况作出正确应对 |

##### 验证智能注释——验证sql输入错误的语法、关键字、函数进行智能注释ai如何应对 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL周期/手动/临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句包含错误的语法、关键字、函数） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 选中部分/全部/空白sql语句点击智能注释/右键-点击智能注释 | 1.问题发送成功2.ai对该情况作出正确应对 |

##### 验证智能注释——验证sql输入离线不支持的sql语法、函数进行智能注释ai如何应对 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL周期/手动/临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句包含离线不支持的语法或函数） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 选中部分/全部/空白sql语句点击智能注释/右键-点击智能注释 | 1.问题发送成功2.ai对该情况作出正确应对 |

##### 验证智能注释——验证不输入任何sql进行智能注释ai如何应对 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL周期/手动/临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 点击智能注释/右键-点击智能注释 | 弹出提示：提问内容为空 |

##### 验证智能注释——验证已添加注释的sql进行智能注释ai如何应对 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL周期/手动/临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql并添加注释后点击保存 | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 选中部分/全部/空白sql语句点击智能注释/右键-点击智能注释 | 1.问题发送成功2.ai对该情况作出正确应对 |

##### 验证智能优化——验证sql输入错误的语法、关键字、函数进行智能优化ai如何应对 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL周期/手动/临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句包含错误的语法、关键字、函数） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 选中部分/全部/空白sql语句点击智能优化/右键-点击智能优化 | 1.问题发送成功2.ai修复为正确的语法 |

##### 验证智能优化——验证sql输入离线不支持的sql语法、函数进行智能优化ai如何应对 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL周期/手动/临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句包含离线不支持的语法或函数） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 选中部分/全部/空白sql语句点击智能优化/右键-点击智能优化 | 1.问题发送成功2.ai对该情况作出正确应对 |

##### 验证智能优化——验证不存在任何sql语句进行智能优化ai如何应对 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL周期/手动/临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 点击智能优化/右键-点击智能优化 | 弹出提示：提问内容为空 |

##### 验证智能优化——验证使用正确且完整的sql智能优化ai如何应对 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL周期/手动/临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句正确且完整无误） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 选中部分/全部/空白sql语句点击智能优化/右键-点击智能优化 | 1.问题发送成功2.ai对该情况作出正确应对 |

##### 验证智能诊断——验证prd所提任务不支持日志智能解析功能 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建事件任务、分支任务、工作流父任务、虚节点、Hadoop MR、Spark、Flink、文件拷贝任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句运行会导致报错） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 点击运行 | 1.任务运行失败2.不出现日志智能解析按钮 |

##### 验证智能优化——验证prd所提任务不支持智能优化功能 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 分别在周期任务、手动任务、临时查询新建事件任务、分支任务、工作流父任务、虚节点、Hadoop MR、greenplum、Flink、文件拷贝、python文件类型、shell文件类型、python on agent文件类型、shell on agent文件类型任务 | 1.任务新建成功2.工具栏无智能优化按钮3.选择sql语句右键也无智能优化、智能注释、智能解释按钮 |

##### 验证starrocks 智能诊断——验证starrocks SQL周期任务补数据实例运行日志智能解析功能正常使用 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 选择一个starrocks SQL周期任务进行提交（任务内的sql运行会导致报错） | 1.提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 3 | 点击补数据 | 补数据实例开始运行且失败 |
| 4 | 点击日志框中的日志智能解析按钮 | 1.任务核心报错内容以及用户执行的SQL内容以prd规定格式传输给AI2.控制台新的窗口中打印日志智能解析的结果3.参照建议修改后sql语句正常运行4.代码片段支持特殊内容展示，支持直接复制5.支持【重新生成】操作 |

##### 验证starrocks 智能诊断——验证starrocksSQL周期任务实例运行日志智能解析功能正常使用 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 选择一个starrocks SQL周期任务进行提交（任务内的sql运行会导致报错） | 1.提交成功2.到达预定时间后周期任务实例提交运行且报错 |
| 3 | 点击日志框中的日志智能解析按钮 | 1.任务核心报错内容以及用户执行的SQL内容以prd规定格式传输给AI2.控制台新的窗口中打印日志智能解析的结果3.参照建议修改后sql语句正常运行4.代码片段支持特殊内容展示，支持直接复制5.支持【重新生成】操作 |

##### 验证starrocks 智能诊断——验证starrocksSQL临时查询任务日志智能解析功能正常使用 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建starrocks SQL临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句运行会导致报错） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 点击运行 | 1.任务运行失败2.出现日志智能解析按钮 |
| 5 | 点击日志智能解析按钮 | 1.任务核心报错内容以及用户执行的SQL内容以prd规定格式传输给AI2.控制台新的窗口中打印日志智能解析的结果3.参照建议修改后sql语句正常运行4.代码片段支持特殊内容展示，支持直接复制5.支持【重新生成】和【复制】操作 |

##### 验证starrocks 智能诊断——验证starrocks SQL手动任务日志智能解析功能正常使用 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建starrocks SQL手动任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句运行会导致报错） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 点击运行 | 1.任务运行失败2.出现日志智能解析按钮 |
| 5 | 点击日志智能解析按钮 | 1.任务核心报错内容以及用户执行的SQL内容以prd规定格式传输给AI2.控制台新的窗口中打印日志智能解析的结果3.参照建议修改后sql语句正常运行4.代码片段支持特殊内容展示，支持直接复制5.支持【重新生成】和【复制】操作 |

##### 验证starrocks 智能诊断——验证starrocksSQL周期任务日志智能解析功能正常使用 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建starrocks SQL周期任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句运行会导致报错） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 点击运行 | 1.任务运行失败2.出现日志智能解析按钮 |
| 5 | 点击日志智能解析按钮 | 1.任务核心报错内容以及用户执行的SQL内容以prd规定格式传输给AI2.控制台新的窗口中打印日志智能解析的结果3.参照建议修改后sql语句正常运行4.代码片段支持特殊内容展示，支持直接复制5.支持【重新生成】和【复制】操作 |

##### 验证starrocks 智能优化——验证starrocks SQL手动任务智能优化、注释、解释正常使用 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建starrocksSQL手动任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句至少包含创建、插入数据、查询、清除数据、增加列、删除等） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 选中部分/全部/空白sql语句点击智能优化/右键-点击智能优化 | 1,编辑界面返回展示代码对比框 |
| 5 | 选中部分/全部/空白sql语句点击智能注释/右键-点击智能注释 | 2,点击接受后覆盖原有内容 |
| 6 | 选中部分/全部/空白sql语句点击智能解释/右键-点击智能解释 | 3,新sql语句可正常执行且得到预期结果 |
| 7 | 选中部分/全部/空白sql语句点击智能注释/右键或者代码栏-点击代码续写 | 4,不选择sql语句时将作用于全部语句 |
| 8 |  | 1,编辑界面返回展示代码对比框 |
| 9 |  | 2,点击接受后覆盖原有内容 |
| 10 |  | 3,新sql语句可正常执行且得到预期结果 |
| 11 |  | 4,不选择sql语句时将作用于全部语句 |
| 12 |  | 1,编辑界面返回展示代码对比框 |
| 13 |  | 2,点击复制可复制解释内容，点击重新生成可重新生成解释 |
| 14 |  | 4,不选择sql语句时将作用于全部语句 |
| 15 |  | 1,编辑界面返回展示代码对比框 |
| 16 |  | 2,点击接受后覆盖原有内容 |
| 17 |  | 3,新sql语句可正常执行且得到预期结果4 |
| 18 |  | 4,不选择sql语句时将作用于全部语句 |

##### 验证starrocks 智能优化——验证starrocks SQL周期任务智能优化、注释、解释正常使用 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建starrocks SQL周期任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句至少包含创建、插入数据、查询、清除数据、增加列、删除等） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 选中部分/全部/空白sql语句点击智能优化/右键-点击智能优化 | 1,编辑界面返回展示代码对比框 |
| 5 | 选中部分/全部/空白sql语句点击智能注释/右键-点击智能注释 | 2,点击接受后覆盖原有内容 |
| 6 | 选中部分/全部/空白sql语句点击智能解释/右键-点击智能解释 | 3,新sql语句可正常执行且得到预期结果 |
| 7 | 选中部分/全部/空白sql语句点击智能注释/右键或者代码栏-点击代码续写 | 4,不选择sql语句时将作用于全部语句 |
| 8 |  | 1,编辑界面返回展示代码对比框 |
| 9 |  | 2,点击接受后覆盖原有内容 |
| 10 |  | 3,新sql语句可正常执行且得到预期结果 |
| 11 |  | 4,不选择sql语句时将作用于全部语句 |
| 12 |  | 1,编辑界面返回展示代码对比框 |
| 13 |  | 2,点击复制可复制解释内容，点击重新生成可重新生成解释 |
| 14 |  | 4,不选择sql语句时将作用于全部语句 |
| 15 |  | 1,编辑界面返回展示代码对比框 |
| 16 |  | 2,点击接受后覆盖原有内容 |
| 17 |  | 3,新sql语句可正常执行且得到预期结果4 |
| 18 |  | 4,不选择sql语句时将作用于全部语句 |

##### 验证starrocks 智能优化——验证starrocks SQL临时查询任务智能优化、注释、解释正常使用 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建starrocks SQL临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句至少包含创建、插入数据、查询、清除数据、增加列、删除等） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 选中部分/全部/空白sql语句点击智能注释/右键或者代码栏-点击智能优化 | 1,编辑界面返回展示代码对比框 |
| 5 | 选中部分/全部/空白sql语句点击智能注释/右键或者代码栏-点击智能注释 | 2,点击接受后覆盖原有内容 |
| 6 | 选中部分/全部/空白sql语句点击智能注释/右键或者代码栏-点击智能解释 | 3,新sql语句可正常执行且得到预期结果 |
| 7 | 选中部分/全部/空白sql语句点击智能注释/右键或者代码栏-点击代码续写 | 4,不选择sql语句时将作用于全部语句 |
| 8 |  | 1,编辑界面返回展示代码对比框 |
| 9 |  | 2,点击接受后覆盖原有内容 |
| 10 |  | 3,新sql语句可正常执行且得到预期结果 |
| 11 |  | 4,不选择sql语句时将作用于全部语句 |
| 12 |  | 1,编辑界面返回展示代码对比框 |
| 13 |  | 2,点击复制可复制解释内容，点击重新生成可重新生成解释 |
| 14 |  | 4,不选择sql语句时将作用于全部语句 |
| 15 |  | 1,编辑界面返回展示代码对比框 |
| 16 |  | 2,点击接受后覆盖原有内容 |
| 17 |  | 3,新sql语句可正常执行且得到预期结果4 |
| 18 |  | 4,不选择sql语句时将作用于全部语句 |

##### 验证dm for oracle 智能诊断——验证dm for oracle SQL周期任务补数据实例运行日志智能解析功能正常使用 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 选择一个dm for oracle SQL周期任务进行提交（任务内的sql运行会导致报错） | 1.提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 3 | 点击补数据 | 补数据实例开始运行且失败 |
| 4 | 点击日志框中的日志智能解析按钮 | 1.任务核心报错内容以及用户执行的SQL内容以prd规定格式传输给AI2.控制台新的窗口中打印日志智能解析的结果3.参照建议修改后sql语句正常运行4.代码片段支持特殊内容展示，支持直接复制5.支持【重新生成】操作 |

##### 验证dm for oracle 智能诊断——验证dm for oracleSQL周期任务实例运行日志智能解析功能正常使用 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 选择一个dm for oracle SQL周期任务进行提交（任务内的sql运行会导致报错） | 1.提交成功2.到达预定时间后周期任务实例提交运行且报错 |
| 3 | 点击日志框中的日志智能解析按钮 | 1.任务核心报错内容以及用户执行的SQL内容以prd规定格式传输给AI2.控制台新的窗口中打印日志智能解析的结果3.参照建议修改后sql语句正常运行4.代码片段支持特殊内容展示，支持直接复制5.支持【重新生成】操作 |

##### 验证dm for oracle 智能诊断——验证dm for oracleSQL临时查询任务日志智能解析功能正常使用 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建dm for oracle SQL临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句运行会导致报错） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 点击运行 | 1.任务运行失败2.出现日志智能解析按钮 |
| 5 | 点击日志智能解析按钮 | 1.任务核心报错内容以及用户执行的SQL内容以prd规定格式传输给AI2.控制台新的窗口中打印日志智能解析的结果3.参照建议修改后sql语句正常运行4.代码片段支持特殊内容展示，支持直接复制5.支持【重新生成】和【复制】操作 |

##### 验证dm for oracle 智能诊断——验证dm for oracle SQL手动任务日志智能解析功能正常使用 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建dm for oracle SQL手动任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句运行会导致报错） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 点击运行 | 1.任务运行失败2.出现日志智能解析按钮 |
| 5 | 点击日志智能解析按钮 | 1.任务核心报错内容以及用户执行的SQL内容以prd规定格式传输给AI2.控制台新的窗口中打印日志智能解析的结果3.参照建议修改后sql语句正常运行4.代码片段支持特殊内容展示，支持直接复制5.支持【重新生成】和【复制】操作 |

##### 验证dm for oracle 智能诊断——验证dm for oracleSQL周期任务日志智能解析功能正常使用 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建dm for oracle SQL周期任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句运行会导致报错） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 点击运行 | 1.任务运行失败2.出现日志智能解析按钮 |
| 5 | 点击日志智能解析按钮 | 1.任务核心报错内容以及用户执行的SQL内容以prd规定格式传输给AI2.控制台新的窗口中打印日志智能解析的结果3.参照建议修改后sql语句正常运行4.代码片段支持特殊内容展示，支持直接复制5.支持【重新生成】和【复制】操作 |

##### 验证dm for oracle 智能优化——验证dm for oracle SQL手动任务智能优化、注释、解释正常使用 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建dm for oracleSQL手动任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句至少包含创建、插入数据、查询、清除数据、增加列、删除等） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 选中部分/全部/空白sql语句点击智能优化/右键-点击智能优化 | 1,编辑界面返回展示代码对比框 |
| 5 | 选中部分/全部/空白sql语句点击智能注释/右键-点击智能注释 | 2,点击接受后覆盖原有内容 |
| 6 | 选中部分/全部/空白sql语句点击智能解释/右键-点击智能解释 | 3,新sql语句可正常执行且得到预期结果 |
| 7 | 选中部分/全部/空白sql语句点击智能注释/右键或者代码栏-点击代码续写 | 4,不选择sql语句时将作用于全部语句 |
| 8 |  | 1,编辑界面返回展示代码对比框 |
| 9 |  | 2,点击接受后覆盖原有内容 |
| 10 |  | 3,新sql语句可正常执行且得到预期结果 |
| 11 |  | 4,不选择sql语句时将作用于全部语句 |
| 12 |  | 1,编辑界面返回展示代码对比框 |
| 13 |  | 2,点击复制可复制解释内容，点击重新生成可重新生成解释 |
| 14 |  | 4,不选择sql语句时将作用于全部语句 |
| 15 |  | 1,编辑界面返回展示代码对比框 |
| 16 |  | 2,点击接受后覆盖原有内容 |
| 17 |  | 3,新sql语句可正常执行且得到预期结果4 |
| 18 |  | 4,不选择sql语句时将作用于全部语句 |

##### 验证dm for oracle 智能优化——验证dm for oracle SQL周期任务智能优化、注释、解释正常使用 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建dm for oracle SQL周期任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句至少包含创建、插入数据、查询、清除数据、增加列、删除等） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 选中部分/全部/空白sql语句点击智能优化/右键-点击智能优化 | 1,编辑界面返回展示代码对比框 |
| 5 | 选中部分/全部/空白sql语句点击智能注释/右键-点击智能注释 | 2,点击接受后覆盖原有内容 |
| 6 | 选中部分/全部/空白sql语句点击智能解释/右键-点击智能解释 | 3,新sql语句可正常执行且得到预期结果 |
| 7 | 选中部分/全部/空白sql语句点击智能注释/右键或者代码栏-点击代码续写 | 4,不选择sql语句时将作用于全部语句 |
| 8 |  | 1,编辑界面返回展示代码对比框 |
| 9 |  | 2,点击接受后覆盖原有内容 |
| 10 |  | 3,新sql语句可正常执行且得到预期结果 |
| 11 |  | 4,不选择sql语句时将作用于全部语句 |
| 12 |  | 1,编辑界面返回展示代码对比框 |
| 13 |  | 2,点击复制可复制解释内容，点击重新生成可重新生成解释 |
| 14 |  | 4,不选择sql语句时将作用于全部语句 |
| 15 |  | 1,编辑界面返回展示代码对比框 |
| 16 |  | 2,点击接受后覆盖原有内容 |
| 17 |  | 3,新sql语句可正常执行且得到预期结果4 |
| 18 |  | 4,不选择sql语句时将作用于全部语句 |

##### 验证dm for oracle 智能优化——验证dm for oracle SQL临时查询任务智能优化、注释、解释正常使用 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建dm for oracle SQL临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句至少包含创建、插入数据、查询、清除数据、增加列、删除等） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 选中部分/全部/空白sql语句点击智能注释/右键或者代码栏-点击智能优化 | 1,编辑界面返回展示代码对比框 |
| 5 | 选中部分/全部/空白sql语句点击智能注释/右键或者代码栏-点击智能注释 | 2,点击接受后覆盖原有内容 |
| 6 | 选中部分/全部/空白sql语句点击智能注释/右键或者代码栏-点击智能解释 | 3,新sql语句可正常执行且得到预期结果 |
| 7 | 选中部分/全部/空白sql语句点击智能注释/右键或者代码栏-点击代码续写 | 4,不选择sql语句时将作用于全部语句 |
| 8 |  | 1,编辑界面返回展示代码对比框 |
| 9 |  | 2,点击接受后覆盖原有内容 |
| 10 |  | 3,新sql语句可正常执行且得到预期结果 |
| 11 |  | 4,不选择sql语句时将作用于全部语句 |
| 12 |  | 1,编辑界面返回展示代码对比框 |
| 13 |  | 2,点击复制可复制解释内容，点击重新生成可重新生成解释 |
| 14 |  | 4,不选择sql语句时将作用于全部语句 |
| 15 |  | 1,编辑界面返回展示代码对比框 |
| 16 |  | 2,点击接受后覆盖原有内容 |
| 17 |  | 3,新sql语句可正常执行且得到预期结果4 |
| 18 |  | 4,不选择sql语句时将作用于全部语句 |

##### 验证oushu 智能诊断——验证oushu SQL周期任务补数据实例运行日志智能解析功能正常使用 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 选择一个oushu SQL周期任务进行提交（任务内的sql运行会导致报错） | 1.提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 3 | 点击补数据 | 补数据实例开始运行且失败 |
| 4 | 点击日志框中的日志智能解析按钮 | 1.任务核心报错内容以及用户执行的SQL内容以prd规定格式传输给AI2.控制台新的窗口中打印日志智能解析的结果3.参照建议修改后sql语句正常运行4.代码片段支持特殊内容展示，支持直接复制5.支持【重新生成】操作 |

##### 验证oushu 智能诊断——验证oushuSQL周期任务实例运行日志智能解析功能正常使用 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 选择一个oushu SQL周期任务进行提交（任务内的sql运行会导致报错） | 1.提交成功2.到达预定时间后周期任务实例提交运行且报错 |
| 3 | 点击日志框中的日志智能解析按钮 | 1.任务核心报错内容以及用户执行的SQL内容以prd规定格式传输给AI2.控制台新的窗口中打印日志智能解析的结果3.参照建议修改后sql语句正常运行4.代码片段支持特殊内容展示，支持直接复制5.支持【重新生成】操作 |

##### 验证oushu 智能诊断——验证oushuSQL临时查询任务日志智能解析功能正常使用 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建oushu SQL临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句运行会导致报错） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 点击运行 | 1.任务运行失败2.出现日志智能解析按钮 |
| 5 | 点击日志智能解析按钮 | 1.任务核心报错内容以及用户执行的SQL内容以prd规定格式传输给AI2.控制台新的窗口中打印日志智能解析的结果3.参照建议修改后sql语句正常运行4.代码片段支持特殊内容展示，支持直接复制5.支持【重新生成】和【复制】操作 |

##### 验证oushu 智能诊断——验证oushu SQL手动任务日志智能解析功能正常使用 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建oushu SQL手动任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句运行会导致报错） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 点击运行 | 1.任务运行失败2.出现日志智能解析按钮 |
| 5 | 点击日志智能解析按钮 | 1.任务核心报错内容以及用户执行的SQL内容以prd规定格式传输给AI2.控制台新的窗口中打印日志智能解析的结果3.参照建议修改后sql语句正常运行4.代码片段支持特殊内容展示，支持直接复制5.支持【重新生成】和【复制】操作 |

##### 验证oushu 智能诊断——验证oushuSQL周期任务日志智能解析功能正常使用 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建oushu SQL周期任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句运行会导致报错） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 点击运行 | 1.任务运行失败2.出现日志智能解析按钮 |
| 5 | 点击日志智能解析按钮 | 1.任务核心报错内容以及用户执行的SQL内容以prd规定格式传输给AI2.控制台新的窗口中打印日志智能解析的结果3.参照建议修改后sql语句正常运行4.代码片段支持特殊内容展示，支持直接复制5.支持【重新生成】和【复制】操作 |

##### 验证oushu 智能优化——验证oushu SQL手动任务智能优化、注释、解释正常使用 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建oushuSQL手动任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句至少包含创建、插入数据、查询、清除数据、增加列、删除等） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 选中部分/全部/空白sql语句点击智能优化/右键-点击智能优化 | 1,编辑界面返回展示代码对比框 |
| 5 | 选中部分/全部/空白sql语句点击智能注释/右键-点击智能注释 | 2,点击接受后覆盖原有内容 |
| 6 | 选中部分/全部/空白sql语句点击智能解释/右键-点击智能解释 | 3,新sql语句可正常执行且得到预期结果 |
| 7 | 选中部分/全部/空白sql语句点击智能注释/右键或者代码栏-点击代码续写 | 4,不选择sql语句时将作用于全部语句 |
| 8 |  | 1,编辑界面返回展示代码对比框 |
| 9 |  | 2,点击接受后覆盖原有内容 |
| 10 |  | 3,新sql语句可正常执行且得到预期结果 |
| 11 |  | 4,不选择sql语句时将作用于全部语句 |
| 12 |  | 1,编辑界面返回展示代码对比框 |
| 13 |  | 2,点击复制可复制解释内容，点击重新生成可重新生成解释 |
| 14 |  | 4,不选择sql语句时将作用于全部语句 |
| 15 |  | 1,编辑界面返回展示代码对比框 |
| 16 |  | 2,点击接受后覆盖原有内容 |
| 17 |  | 3,新sql语句可正常执行且得到预期结果4 |
| 18 |  | 4,不选择sql语句时将作用于全部语句 |

##### 验证oushu 智能优化——验证oushu SQL周期任务智能优化、注释、解释正常使用 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建oushu SQL周期任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句至少包含创建、插入数据、查询、清除数据、增加列、删除等） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 选中部分/全部/空白sql语句点击智能优化/右键-点击智能优化 | 1,编辑界面返回展示代码对比框 |
| 5 | 选中部分/全部/空白sql语句点击智能注释/右键-点击智能注释 | 2,点击接受后覆盖原有内容 |
| 6 | 选中部分/全部/空白sql语句点击智能解释/右键-点击智能解释 | 3,新sql语句可正常执行且得到预期结果 |
| 7 | 选中部分/全部/空白sql语句点击智能注释/右键或者代码栏-点击代码续写 | 4,不选择sql语句时将作用于全部语句 |
| 8 |  | 1,编辑界面返回展示代码对比框 |
| 9 |  | 2,点击接受后覆盖原有内容 |
| 10 |  | 3,新sql语句可正常执行且得到预期结果 |
| 11 |  | 4,不选择sql语句时将作用于全部语句 |
| 12 |  | 1,编辑界面返回展示代码对比框 |
| 13 |  | 2,点击复制可复制解释内容，点击重新生成可重新生成解释 |
| 14 |  | 4,不选择sql语句时将作用于全部语句 |
| 15 |  | 1,编辑界面返回展示代码对比框 |
| 16 |  | 2,点击接受后覆盖原有内容 |
| 17 |  | 3,新sql语句可正常执行且得到预期结果4 |
| 18 |  | 4,不选择sql语句时将作用于全部语句 |

##### 验证oushu 智能优化——验证oushu SQL临时查询任务智能优化、注释、解释正常使用 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建oushu SQL临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句至少包含创建、插入数据、查询、清除数据、增加列、删除等） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 选中部分/全部/空白sql语句点击智能注释/右键或者代码栏-点击智能优化 | 1,编辑界面返回展示代码对比框 |
| 5 | 选中部分/全部/空白sql语句点击智能注释/右键或者代码栏-点击智能注释 | 2,点击接受后覆盖原有内容 |
| 6 | 选中部分/全部/空白sql语句点击智能注释/右键或者代码栏-点击智能解释 | 3,新sql语句可正常执行且得到预期结果 |
| 7 | 选中部分/全部/空白sql语句点击智能注释/右键或者代码栏-点击代码续写 | 4,不选择sql语句时将作用于全部语句 |
| 8 |  | 1,编辑界面返回展示代码对比框 |
| 9 |  | 2,点击接受后覆盖原有内容 |
| 10 |  | 3,新sql语句可正常执行且得到预期结果 |
| 11 |  | 4,不选择sql语句时将作用于全部语句 |
| 12 |  | 1,编辑界面返回展示代码对比框 |
| 13 |  | 2,点击复制可复制解释内容，点击重新生成可重新生成解释 |
| 14 |  | 4,不选择sql语句时将作用于全部语句 |
| 15 |  | 1,编辑界面返回展示代码对比框 |
| 16 |  | 2,点击接受后覆盖原有内容 |
| 17 |  | 3,新sql语句可正常执行且得到预期结果4 |
| 18 |  | 4,不选择sql语句时将作用于全部语句 |

##### 验证hive 智能诊断——验证hive SQL周期任务补数据实例运行日志智能解析功能正常使用 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 选择一个hive SQL周期任务进行提交（任务内的sql运行会导致报错） | 1.提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 3 | 点击补数据 | 补数据实例开始运行且失败 |
| 4 | 点击日志框中的日志智能解析按钮 | 1.任务核心报错内容以及用户执行的SQL内容以prd规定格式传输给AI2.控制台新的窗口中打印日志智能解析的结果3.参照建议修改后sql语句正常运行4.代码片段支持特殊内容展示，支持直接复制5.支持【重新生成】操作 |

##### 验证hive 智能诊断——验证hiveSQL周期任务实例运行日志智能解析功能正常使用 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 选择一个hive SQL周期任务进行提交（任务内的sql运行会导致报错） | 1.提交成功2.到达预定时间后周期任务实例提交运行且报错 |
| 3 | 点击日志框中的日志智能解析按钮 | 1.任务核心报错内容以及用户执行的SQL内容以prd规定格式传输给AI2.控制台新的窗口中打印日志智能解析的结果3.参照建议修改后sql语句正常运行4.代码片段支持特殊内容展示，支持直接复制5.支持【重新生成】操作 |

##### 验证hive 智能诊断——验证hiveSQL临时查询任务日志智能解析功能正常使用 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句运行会导致报错） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 点击运行 | 1.任务运行失败2.出现日志智能解析按钮 |
| 5 | 点击日志智能解析按钮 | 1.任务核心报错内容以及用户执行的SQL内容以prd规定格式传输给AI2.控制台新的窗口中打印日志智能解析的结果3.参照建议修改后sql语句正常运行4.代码片段支持特殊内容展示，支持直接复制5.支持【重新生成】和【复制】操作 |

##### 验证hive 智能诊断——验证hive SQL手动任务日志智能解析功能正常使用 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL手动任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句运行会导致报错） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 点击运行 | 1.任务运行失败2.出现日志智能解析按钮 |
| 5 | 点击日志智能解析按钮 | 1.任务核心报错内容以及用户执行的SQL内容以prd规定格式传输给AI2.控制台新的窗口中打印日志智能解析的结果3.参照建议修改后sql语句正常运行4.代码片段支持特殊内容展示，支持直接复制5.支持【重新生成】和【复制】操作 |

##### 验证hive 智能诊断——验证hiveSQL周期任务日志智能解析功能正常使用 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL周期任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句运行会导致报错） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 点击运行 | 1.任务运行失败2.出现日志智能解析按钮 |
| 5 | 点击日志智能解析按钮 | 1.任务核心报错内容以及用户执行的SQL内容以prd规定格式传输给AI2.控制台新的窗口中打印日志智能解析的结果3.参照建议修改后sql语句正常运行4.代码片段支持特殊内容展示，支持直接复制5.支持【重新生成】和【复制】操作 |

##### 验证hive 智能优化——验证hive SQL手动任务智能优化、注释、解释正常使用 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL手动任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句至少包含创建、插入数据、查询、清除数据、增加列、删除等） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 选中部分/全部/空白sql语句点击智能优化/右键-点击智能优化 | 1,编辑界面返回展示代码对比框 |
| 5 | 选中部分/全部/空白sql语句点击智能注释/右键-点击智能注释 | 2,点击接受后覆盖原有内容 |
| 6 | 选中部分/全部/空白sql语句点击智能解释/右键-点击智能解释 | 3,新sql语句可正常执行且得到预期结果 |
| 7 | 选中部分/全部/空白sql语句点击智能注释/右键或者代码栏-点击代码续写 | 4,不选择sql语句时将作用于全部语句 |
| 8 |  | 1,编辑界面返回展示代码对比框 |
| 9 |  | 2,点击接受后覆盖原有内容 |
| 10 |  | 3,新sql语句可正常执行且得到预期结果 |
| 11 |  | 4,不选择sql语句时将作用于全部语句 |
| 12 |  | 1,编辑界面返回展示代码对比框 |
| 13 |  | 2,点击复制可复制解释内容，点击重新生成可重新生成解释 |
| 14 |  | 4,不选择sql语句时将作用于全部语句 |
| 15 |  | 1,编辑界面返回展示代码对比框 |
| 16 |  | 2,点击接受后覆盖原有内容 |
| 17 |  | 3,新sql语句可正常执行且得到预期结果4 |
| 18 |  | 4,不选择sql语句时将作用于全部语句 |

##### 验证hive 智能优化——验证hive SQL周期任务智能优化、注释、解释正常使用 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL周期任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句至少包含创建、插入数据、查询、清除数据、增加列、删除等） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 选中部分/全部/空白sql语句点击智能优化/右键-点击智能优化 | 1,编辑界面返回展示代码对比框 |
| 5 | 选中部分/全部/空白sql语句点击智能注释/右键-点击智能注释 | 2,点击接受后覆盖原有内容 |
| 6 | 选中部分/全部/空白sql语句点击智能解释/右键-点击智能解释 | 3,新sql语句可正常执行且得到预期结果 |
| 7 | 选中部分/全部/空白sql语句点击智能注释/右键或者代码栏-点击代码续写 | 4,不选择sql语句时将作用于全部语句 |
| 8 |  | 1,编辑界面返回展示代码对比框 |
| 9 |  | 2,点击接受后覆盖原有内容 |
| 10 |  | 3,新sql语句可正常执行且得到预期结果 |
| 11 |  | 4,不选择sql语句时将作用于全部语句 |
| 12 |  | 1,编辑界面返回展示代码对比框 |
| 13 |  | 2,点击复制可复制解释内容，点击重新生成可重新生成解释 |
| 14 |  | 4,不选择sql语句时将作用于全部语句 |
| 15 |  | 1,编辑界面返回展示代码对比框 |
| 16 |  | 2,点击接受后覆盖原有内容 |
| 17 |  | 3,新sql语句可正常执行且得到预期结果4 |
| 18 |  | 4,不选择sql语句时将作用于全部语句 |

##### 验证hive 智能优化——验证hive SQL临时查询任务智能优化、注释、解释正常使用 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 新建hive SQL临时查询任务 | 系统提示任务新建成功，任务列表中出现新建的任务记录，状态为【待提交/草稿】 |
| 3 | 输入sql后点击保存（sql语句至少包含创建、插入数据、查询、清除数据、增加列、删除等） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 选中部分/全部/空白sql语句点击智能注释/右键或者代码栏-点击智能优化 | 1,编辑界面返回展示代码对比框 |
| 5 | 选中部分/全部/空白sql语句点击智能注释/右键或者代码栏-点击智能注释 | 2,点击接受后覆盖原有内容 |
| 6 | 选中部分/全部/空白sql语句点击智能注释/右键或者代码栏-点击智能解释 | 3,新sql语句可正常执行且得到预期结果 |
| 7 | 选中部分/全部/空白sql语句点击智能注释/右键或者代码栏-点击代码续写 | 4,不选择sql语句时将作用于全部语句 |
| 8 |  | 1,编辑界面返回展示代码对比框 |
| 9 |  | 2,点击接受后覆盖原有内容 |
| 10 |  | 3,新sql语句可正常执行且得到预期结果 |
| 11 |  | 4,不选择sql语句时将作用于全部语句 |
| 12 |  | 1,编辑界面返回展示代码对比框 |
| 13 |  | 2,点击复制可复制解释内容，点击重新生成可重新生成解释 |
| 14 |  | 4,不选择sql语句时将作用于全部语句 |
| 15 |  | 1,编辑界面返回展示代码对比框 |
| 16 |  | 2,点击接受后覆盖原有内容 |
| 17 |  | 3,新sql语句可正常执行且得到预期结果4 |
| 18 |  | 4,不选择sql语句时将作用于全部语句 |

##### 验证ai的入口 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 任务详情的运行栏中有智能优化 | 下拉可选择智能注释，智能解释，代码续写 |
| 3 | 在任务内容页面，鼠标右击，弹出弹窗选项 | 有智能优化，智能注释，智能解释，代码续写 |

##### 验证查询所有schema 「P1」

> 前置条件
```
存在schema public
public下存在表test_oushu_biao1、test_oushu_biao2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——当前数据库中有哪些 schema？ | 返回相关查询sql：SELECT schema_name FROM information_schema.schemata; |
| 3 |  | 返回结果：当前oushu连接源下的所有已进入知识库的schema |
| 4 |  | 返回思考过程 |

##### 验证查询指定schema下的所有表 「P1」

> 前置条件
```
存在schema public
public下存在表test_oushu_biao1、test_oushu_biao2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——public schema 下有哪些表 | 返回相关查询sql：SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'; |
| 3 |  | 返回结果：当前public下所有已进入知识库的表 |
| 4 |  | 返回思考过程 |
| 5 |  | 返回结果为表查询下表与知识库下表取交集 |

##### 验证查询表结构信息 「P1」

> 前置条件
```
存在schema public
public下存在表test_oushu_biao1、test_oushu_biao2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——查询表test_oushu_biao1的所有字段及类型、是否可为空、默认值？ | 返回相关查询sql：SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'test_oushu_biao1'; |
| 3 |  | 返回结果：返回表test_oushu_biao1已传入知识库的字段名称、字段类型、是否可为空、默认值的结果 |
| 4 |  | 返回思考过程 |

##### 验证查询当前所使用schema 「P1」

> 前置条件
```
存在schema public
public下存在表test_oushu_biao1、test_oushu_biao2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——当前我用的是哪个schema | 返回相关查询sql：SELECT current_schema(); |
| 3 |  | 返回结果：返回当前所使用且已进入知识库的schema |
| 4 |  | 返回思考过程 |

##### 验证查询表使用约束类型（PRIMARY KEY）的字段有哪些 「P1」

> 前置条件
```
存在schema public
public下存在表test_oushu_biao1、test_oushu_biao2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——表test_oushu_biao1的主键字段有哪些 | 返回相关查询sql：SELECT kcu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name WHERE tc.table_schema = 'public' AND tc.table_name = 'test_oushu_biao1' AND tc.constraint_type = 'PRIMARY KEY'; |
| 3 |  | 返回结果：返回表test_oushu_biao1的已进入知识库的主键字段 |
| 4 |  | 返回思考过程 |

##### 验证查询指定表的权限 「P1」

> 前置条件
```
存在schema public
public下存在表test_oushu_biao1、test_oushu_biao2
存在用户test_user_ai_001，此用户无表test_oushu_biao1的权限
存在用户test_user_ai_002（只赋予dql权限），此用户有表test_oushu_biao1的权限（只dql权限）
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——哪些用户或角色对表test_oushu_biao1有权限？他们拥有哪些权限？ | 返回相关查询sql：SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name = 'test_oushu_biao1'; |
| 3 |  | 返回结果：返回对表test_oushu_biao1有权限的已进入知识库的所有用户及拥有的权限 |
| 4 |  | 返回思考过程 |

##### 验证查询系统函数返回结果正常 「P1」

> 前置条件
```
存在schema public
public下存在表test_oushu_biao1、test_oushu_biao2
存在用户test_user_ai_001，此用户无表test_oushu_biao1的权限
存在用户test_user_ai_002（只赋予dql权限），此用户有表test_oushu_biao1的权限（只dql权限）
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——当前连接使用的是哪个数据库？当前用户是谁？客户端 IP 是多少？ | 返回相关查询sql：SELECT current_database(), current_user, inet_client_addr(); |
| 3 |  | 返回结果：返回当前使用已进入知识库的数据库、用户、客户端ip |
| 4 |  | 返回思考过程 |

##### 验证查询public库下的test_oushu_biao1后接着查询public_1库下的表test_oushu_biao3数据内容正常 「P1」

> 前置条件
```
存在schema public、public_1
public下存在表test_oushu_biao1、test_oushu_biao2
public_1下存在表test_oushu_biao3
public不存在biao3，同时public1也不存在biao1、biao2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——帮我查询public库下的表test_oushu_biao1的所有数据 | 返回相关查询sql：SELECT * from test_oushu_biao1; |
| 3 | 询问——帮我查询public_1库下的表test_oushu_biao3的所有数据 | 返回结果：该表的所有数据 |
| 4 |  | 返回思考过程 |
| 5 |  | 返回相关查询sql：SELECT * from test_oushu_biao3; |
| 6 |  | 返回结果：该表的所有数据 |
| 7 |  | 返回思考过程 |

##### 验证存在上下文的情况下切换左侧任务框为其他数据源后询问返回当前任务框所属数据源类型结果 「P1」

> 前置条件
```
存在schema public、public_1
public下存在表test_oushu_biao1、test_oushu_biao2
public_1下存在表test_oushu_biao3
public不存在biao3，同时public1也不存在biao1、biao2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——帮我查询oushudb数据源public库下的所有表 | 返回相关查询sql：SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'; |
| 3 | 左侧切换为DM FOR ORACLE的任务框（当前项目对接schema或创建schema为test_dm_001） | 返回结果：当前public下所有已进入知识库的表 |
| 4 | 询问——帮我查询当前库下的所有表 | 返回思考过程 |
| 5 |  | 返回结果为表查询下表与知识库下表取交集 |
| 6 |  | 任务框切换成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 7 |  | 返回相关查询sql：SELECT table_name FROM information_schema.tables WHERE table_schema = 'test_dm_001'; |
| 8 |  | 返回结果：当前test_dm_001库下所有已进入知识库的表 |
| 9 |  | 返回思考过程 |
| 10 |  | 返回结果为表查询下表与知识库下表取交集 |

##### 验证存在上下文的情况下切换左侧任务框为其他同类型数据源不同schema后询问返回当前任务框所指定schema结果（不创建和不对接项目专属用例） 「P2」

> 前置条件
```
存在schema public、public_1
public下存在表test_oushu_biao1、test_oushu_biao2
public_1下存在表test_oushu_biao3
public不存在biao3，同时public1也不存在biao1、biao2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——帮我查询oushudb数据源public库下的所有表 | 返回相关查询sql：SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'; |
| 3 | 创建一个oushudb任务框并打开，左上角选择schema public_1 | 返回结果：当前public下所有已进入知识库的表 |
| 4 | 询问——帮我查询当前库下的所有表 | 返回思考过程 |
| 5 | 创建一个oushudb任务框并打开，左上角选择schema public_2 | 返回结果为表查询下表与知识库下表取交集 |
| 6 | 询问——帮我查询当前库下的所有表 | 任务创建、打开成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 7 |  | 返回相关查询sql：SELECT table_name FROM information_schema.tables WHERE table_schema = 'public_1'; |
| 8 |  | 返回结果：当前public_1库下所有已进入知识库的表 |
| 9 |  | 返回思考过程 |
| 10 |  | 返回结果为表查询下表与知识库下表取交集 |
| 11 |  | 任务创建、打开成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 12 |  | 返回相关查询sql：SELECT table_name FROM information_schema.tables WHERE table_schema = 'public_2'; |
| 13 |  | 返回结果：当前public_2库下所有已进入知识库的表 |
| 14 |  | 返回思考过程 |
| 15 |  | 返回结果为表查询下表与知识库下表取交集 |

##### 验证查询oushu数据源下的test_oushu_biao1后接着查询mysql下的表test_mysql_biao1数据内容是否正常 「P2」

> 前置条件
```
存在oushu数据源，源内存在schema public，库内存在表test_oushu_biao1
存在mysql数据源，源内存在schema mysql_public，库内存在表test_mysql_biao1
两个数据源不存在同名库
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——帮我查询public库下的表test_oushu_biao1的所有数据 | 返回相关查询sql：SELECT * from test_oushu_biao1; |
| 3 | 询问——帮我查询mysql_public库下的表test_mysql_biao1的所有数据 | 返回结果：该表的所有数据 |
| 4 |  | 返回思考过程 |
| 5 |  | 返回相关查询sql：SELECT * from test_mysql_biao1; |
| 6 |  | 返回结果：该表的所有数据 |
| 7 |  | 返回思考过程 |

##### 验证存在上下文的情况下切换项目后询问是否返回所切换项目的数据结果 「P1」

> 前置条件
```
存在schema public、public_1
public下存在表test_oushu_biao1、test_oushu_biao2
public_1下存在表test_oushu_biao3
public不存在biao3，同时public1也不存在biao1、biao2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——帮我查询oushudb数据源public库（当前项目对接schema）下的所有表 | 返回相关查询sql：SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'; |
| 3 | 切换项目test_other_001（项目创建schema test_other_001） | 返回结果：当前public下所有已进入知识库的表 |
| 4 | 询问——帮我查询当前库下的所有表 | 返回思考过程 |
| 5 |  | 返回结果为表查询下表与知识库下表取交集 |
| 6 |  | 项目切换成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 7 |  | 返回相关查询sql：SELECT table_name FROM information_schema.tables WHERE table_schema = 'test_other_001'; |
| 8 |  | 返回结果：当前test_other_001库下所有已进入知识库的表 |
| 9 |  | 返回思考过程 |
| 10 |  | 返回结果为表查询下表与知识库下表取交集 |

##### 验证询问表的中文注释正常返回表数据 「P1」

> 前置条件
```
存在表：
CREATE TABLE IF NOT EXISTS `test_oushu_biao1`(
`号码` BIGINT COMMENT '编号',
`qy_type` SMALLINT COMMENT '类型',
`company_code` BIGINT COMMENT '公司编号',
`company_name` VARCHAR(100) COMMENT '公司名称',
`project_no` BIGINT COMMENT '项目编号',
`project_name` VARCHAR(100) COMMENT '项目名称',
`project_address` VARCHAR(100) COMMENT '项目地址',
`jz_type` SMALLINT COMMENT '类型名称',
`building_name` VARCHAR(100) COMMENT '建造单位',
`sale` BIGINT COMMENT '销售额'
)
STORED AS ORC
DISTRIBUTED BY (号码);
添加表级注释：
COMMENT ON TABLE company IS '公司';
插入数据：
INSERT INTO company
VALUES
(1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云',1113),
(2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云',14113),
(3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机',2012),
(4,4,4,'dtstack_04',4,'dtstack_04','杭州',4,'杭州袋鼠',9000);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——公司是哪张表，表名是什么 | 返回相关查询sql：SELECT |
| 3 |  | c.relname AS table_name |
| 4 |  | FROM |
| 5 |  | pg_class c |
| 6 |  | JOIN |
| 7 |  | pg_namespace n ON n.oid = c.relnamespace |
| 8 |  | JOIN |
| 9 |  | pg_description d ON d.objoid = c.oid AND d.objsubid = 0 |
| 10 |  | WHERE |
| 11 |  | d.description ILIKE '%公司%' |
| 12 |  | AND c.relkind = 'r';  -- 只查普通表 |
| 13 |  | 返回结果：返回表注释为公司的所有表名 |
| 14 |  | 返回思考过程 |

##### 验证查询表的字段注释正常返回指定字段数据 「P1」

> 前置条件
```
存在表：
CREATE TABLE IF NOT EXISTS `test_oushu_biao1`(
`号码` BIGINT COMMENT '编号',
`qy_type` SMALLINT COMMENT '类型',
`company_code` BIGINT COMMENT '公司编号',
`company_name` VARCHAR(100) COMMENT '公司名称',
`project_no` BIGINT COMMENT '项目编号',
`project_name` VARCHAR(100) COMMENT '项目名称',
`project_address` VARCHAR(100) COMMENT '项目地址',
`jz_type` SMALLINT COMMENT '类型名称',
`building_name` VARCHAR(100) COMMENT '建造单位',
`sale` BIGINT COMMENT '销售额'
)
STORED AS ORC
DISTRIBUTED BY (号码);
添加表级注释：
COMMENT ON TABLE company IS '公司';
插入数据：
INSERT INTO company
VALUES
(1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云',1113),
(2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云',14113),
(3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机',2012),
(4,4,4,'dtstack_04',4,'dtstack_04','杭州',4,'杭州袋鼠',9000);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——表test_oushu_biao1里面公司编号是哪个字段 | 返回相关查询sql：SELECT |
| 3 |  | a.attname AS column_name, |
| 4 |  | d.description AS column_comment |
| 5 |  | FROM |
| 6 |  | pg_class c |
| 7 |  | JOIN |
| 8 |  | pg_namespace n ON n.oid = c.relnamespace |
| 9 |  | JOIN |
| 10 |  | pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped |
| 11 |  | LEFT JOIN |
| 12 |  | pg_description d ON d.objoid = a.attrelid AND d.objsubid = a.attnum |
| 13 |  | WHERE |
| 14 |  | c.relname = 'test_oushu_biao1' |
| 15 |  | AND d.description ILIKE '%公司编号%'; |
| 16 |  | 返回结果：返回表test_oushu_biao1字段注释为公司编号的字段 |
| 17 |  | 返回思考过程 |

##### 验证直接在灵瞳sql框内输入sql执行结果返回正常 「P1」

> 前置条件
```
存在表：
CREATE TABLE IF NOT EXISTS `test_oushu_biao1`(
`号码` BIGINT COMMENT '编号',
`qy_type` SMALLINT COMMENT '类型',
`company_code` BIGINT COMMENT '公司编号',
`company_name` VARCHAR(100) COMMENT '公司名称',
`project_no` BIGINT COMMENT '项目编号',
`project_name` VARCHAR(100) COMMENT '项目名称',
`project_address` VARCHAR(100) COMMENT '项目地址',
`jz_type` SMALLINT COMMENT '类型名称',
`building_name` VARCHAR(100) COMMENT '建造单位',
`sale` BIGINT COMMENT '销售额'
)
STORED AS ORC
DISTRIBUTED BY (号码);
添加表级注释：
COMMENT ON TABLE company IS '公司';
插入数据：
INSERT INTO company
VALUES
(1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云',1113),
(2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云',14113),
(3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机',2012),
(4,4,4,'dtstack_04',4,'dtstack_04','杭州',4,'杭州袋鼠',9000);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——帮我查询表test_oushu_biao1的所有数据 | 返回相关查询sql：SELECT * from test_oushu_biao1; |
| 3 | 直接在返回的sql框内修改查询sql：SELECT * from test_oushu_biao1 where sale >=9000; | 返回结果：返回表test_oushu_biao1的所有数据 |
| 4 | 直接在返回的sql框内修改查询sql：select str_length('hello word'); | 返回思考过程 |
| 5 | 直接在返回的sql框内修改查询sql：select CONCAT('hello','word'); | 返回结果：返回表test_oushu_biao1的所有符合结果的数据 |
| 6 | 直接在返回的sql框内修改查询sql：WITH recent_sales AS ( | 返回结果：返回自定义函数结果 |
| 7 | SELECT | 返回结果：返回系统函数结果 |
| 8 | “号码“, | 返回结果：返回筛选出销售额大于 5000 的公司记录，并给每条记录打上“高销售”“中销售”标签 |
| 9 | company_name, | 返回结果：返回统计每个项目地址（如“杭州”、“湖州”）下的项目数量 |
| 10 | sale, | 返回结果：返回结果筛选公司名以 dtstack 开头的记录，按销售额排序，跳过最高销售额那一条，取第2~4名，展示信息丰富：项目数、销售等级、名字长度、全大写、当前日期、JSON 格式摘要等 |
| 11 | project_address, |  |
| 12 | CASE |  |
| 13 | WHEN sale > 10000 THEN '高销售' |  |
| 14 | WHEN sale > 5000 THEN '中销售' |  |
| 15 | ELSE '低销售' |  |
| 16 | END AS sale_level |  |
| 17 | FROM company |  |
| 18 | WHERE sale > 5000 |  |
| 19 | ) |  |
| 20 | 直接在返回的sql框内修改查询sql：project_stats AS ( |  |
| 21 | SELECT |  |
| 22 | project_address, |  |
| 23 | COUNT(DISTINCT project_no) AS total_projects |  |
| 24 | FROM company |  |
| 25 | GROUP BY project_address |  |
| 26 | ) |  |
| 27 | 直接在返回的sql框内修改查询sql：SELECT |  |
| 28 | r.“号码“ AS id, |  |
| 29 | r.company_name, |  |
| 30 | r.sale, |  |
| 31 | r.sale_level, |  |
| 32 | p.total_projects, |  |
| 33 | r.project_address, |  |
| 34 | LENGTH(r.company_name) AS name_length, |  |
| 35 | UPPER(r.company_name) AS upper_name, |  |
| 36 | NOW()::DATE AS current_date, |  |
| 37 | json_build_object(...) AS json_data |  |
| 38 | FROM recent_sales r |  |
| 39 | LEFT JOIN project_stats p ON r.project_address = p.project_address |  |
| 40 | WHERE r.company_name ~ '^dtstack.*' |  |
| 41 | ORDER BY r.sale DESC |  |
| 42 | LIMIT 3 OFFSET 1; |  |

##### 验证询问指定表内有哪些字段包含注释 「P1」

> 前置条件
```
存在三张表：
CREATE TABLE employee_basic (
emp_id INT COMMENT '员工ID',
name VARCHAR(100),
department VARCHAR(100)
);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——表employee_basic内有哪些字段注释 | 返回相关查询sql：SELECT |
| 3 |  | column_name, |
| 4 |  | col_description(format('%s.%s', table_schema, table_name)::regclass::oid, ordinal_position) AS column_comment |
| 5 |  | FROM |
| 6 |  | information_schema.columns |
| 7 |  | WHERE |
| 8 |  | table_name = 'employee_basic' |
| 9 |  | AND table_schema = 'public'; |
| 10 |  | 返回结果：返回该表所有的字段注释 |
| 11 |  | 返回思考过程 |

##### 验证询问非返回sql问答结果正常 「P1」

> 前置条件
```
存在三张表：
CREATE TABLE employee_basic (
emp_id INT COMMENT '员工ID',
name VARCHAR(100),
department VARCHAR(100)
);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——oushudb有哪些数据类型，给出十种 | 不返回sql语句及sql查询框 |
| 3 | 询问——oushudb的left join和right join有哪些区别 | 使用自然语言返回相关问题结果 |
| 4 | 询问——报错SQL execute exception：Error while compiling statement: FAILED: ParseException line 11:1 missing EOF at 'PARTED' near的原因 | 返回思考过程 |
| 5 |  | 不返回sql语句及sql查询框 |
| 6 |  | 使用自然语言返回相关问题结果 |
| 7 |  | 返回思考过程 |
| 8 |  | 不返回sql语句及sql查询框 |
| 9 |  | 使用自然语言返回相关问题结果 |
| 10 |  | 返回思考过程 |

##### 验证通过表字段注释查询表名 「P2」

> 前置条件
```
存在三张表：
CREATE TABLE employee_basic (
emp_id INT COMMENT '员工ID',
name VARCHAR(100),
department VARCHAR(100)
);
CREATE TABLE salary_info (
employee_code INT COMMENT '员工ID',
salary DECIMAL(10,2),
bonus DECIMAL(10,2)
);
CREATE TABLE project_assignment (
emp_id INT COMMENT '分配的员工编号',
project_name VARCHAR(100),
assign_date DATE
);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——有哪些表有员工id字段 | 返回相关查询sql：SELECT |
| 3 |  | n.nspname AS schema_name, |
| 4 |  | c.relname AS table_name, |
| 5 |  | a.attname AS column_name, |
| 6 |  | d.description AS column_comment |
| 7 |  | FROM |
| 8 |  | pg_class c |
| 9 |  | JOIN pg_namespace n ON n.oid = c.relnamespace |
| 10 |  | JOIN pg_attribute a ON a.attrelid = c.oid |
| 11 |  | JOIN pg_description d ON d.objoid = c.oid AND d.objsubid = a.attnum |
| 12 |  | WHERE |
| 13 |  | d.description ILIKE '%员工id%' |
| 14 |  | AND c.relkind = 'r';  -- 只查普通表 |
| 15 |  | 返回结果：返回当前相关字段及表已进入知识库的表 |
| 16 |  | 返回思考过程 |

##### 验证通过表字段注释及结果查询表名 「P2」

> 前置条件
```
存在三张表：
CREATE TABLE employee_basic (
emp_id INT COMMENT '员工ID',
name VARCHAR(100),
department VARCHAR(100)
);
CREATE TABLE salary_info (
employee_code INT COMMENT '员工ID',
salary DECIMAL(10,2),
bonus DECIMAL(10,2)
);
CREATE TABLE project_assignment (
emp_id INT COMMENT '分配的员工编号',
project_name VARCHAR(100),
assign_date DATE
);
表插入：
INSERT INTO employee_basic (emp_id, name, department) VALUES
(101, 'Alice', 'HR'),
(102, 'Bob', 'Engineering'),
(103, 'Charlie', 'Marketing');

INSERT INTO salary_info (staff_no, base_salary, bonus) VALUES
(1, 6000.00, 500.00),
(202, 7500.00, 800.00),
(203, 5000.00, 300.00);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——哪些表的员工id是1 | 返回相关查询sql：WITH annotated_columns AS ( |
| 3 |  | SELECT |
| 4 |  | n.nspname AS schema_name, |
| 5 |  | c.relname AS table_name, |
| 6 |  | a.attname AS column_name |
| 7 |  | FROM |
| 8 |  | pg_class c |
| 9 |  | JOIN |
| 10 |  | pg_namespace n ON n.oid = c.relnamespace |
| 11 |  | JOIN |
| 12 |  | pg_attribute a ON a.attrelid = c.oid |
| 13 |  | JOIN |
| 14 |  | pg_description d ON d.objoid = c.oid AND d.objsubid = a.attnum |
| 15 |  | WHERE |
| 16 |  | d.description ILIKE '%员工id%' |
| 17 |  | AND c.relkind = 'r' |
| 18 |  | ), |
| 19 |  | sqls AS ( |
| 20 |  | SELECT |
| 21 |  | 'SELECT ''' \|\| schema_name \|\| '.' \|\| table_name \|\| ''' AS table_name FROM ' |
| 22 |  | \|\| schema_name \|\| '.' \|\| table_name \|\| ' WHERE ' \|\| column_name \|\| ' = 1 LIMIT 1' |
| 23 |  | AS sql_text |
| 24 |  | FROM annotated_columns |
| 25 |  | ), |
| 26 |  | results AS ( |
| 27 |  | SELECT * FROM ( |
| 28 |  | SELECT |
| 29 |  | (xpath('//text()', query_to_xml(sql_text, false, true, '')))[1]::text AS table_name |
| 30 |  | FROM sqls |
| 31 |  | ) AS sub |
| 32 |  | WHERE table_name IS NOT NULL |
| 33 |  | ) |
| 34 |  | SELECT * FROM results; |
| 35 |  | 返回结果：返回当前相关字段及表已进入知识库的表 |
| 36 |  | 返回思考过程 |

##### 验证询问表数据返回结果与表查询内表数据结果一致 「P2」

> 前置条件
```
存在表：
CREATE TABLE IF NOT EXISTS `test_oushu_biao1`(
`号码` BIGINT COMMENT '编号',
`qy_type` SMALLINT COMMENT '类型',
`company_code` BIGINT COMMENT '公司编号',
`company_name` VARCHAR(100) COMMENT '公司名称',
`project_no` BIGINT COMMENT '项目编号',
`project_name` VARCHAR(100) COMMENT '项目名称',
`project_address` VARCHAR(100) COMMENT '项目地址',
`jz_type` SMALLINT COMMENT '类型名称',
`building_name` VARCHAR(100) COMMENT '建造单位',
`sale` BIGINT COMMENT '销售额'
)
STORED AS ORC
DISTRIBUTED BY (号码);
添加表级注释：
COMMENT ON TABLE company IS '公司';
插入数据：
INSERT INTO company
VALUES
(1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云',1113),
(2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云',14113),
(3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机',2012),
(4,4,4,'dtstack_04',4,'dtstack_04','杭州',4,'杭州袋鼠',9000);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——帮我查询表test_oushu_biao1的所有数据 | 返回相关查询sql：SELECT * from test_oushu_biao1; |
| 3 |  | 返回结果：返回表内所有数据 |
| 4 |  | 返回思考过程 |
| 5 |  | 返回结果与表查询结果一致 |

##### 验证多次询问后结果返回均一致 「P2」

> 前置条件
```
存在三张表：
CREATE TABLE employee_basic (
emp_id INT COMMENT '员工ID',
name VARCHAR(100),
department VARCHAR(100)
);
CREATE TABLE salary_info (
employee_code INT COMMENT '员工ID',
salary DECIMAL(10,2),
bonus DECIMAL(10,2)
);
CREATE TABLE project_assignment (
emp_id INT COMMENT '分配的员工编号',
project_name VARCHAR(100),
assign_date DATE
);
表插入：
INSERT INTO employee_basic (emp_id, name, department) VALUES
(101, 'Alice', 'HR'),
(102, 'Bob', 'Engineering'),
(103, 'Charlie', 'Marketing');

INSERT INTO salary_info (staff_no, base_salary, bonus) VALUES
(1, 6000.00, 500.00),
(202, 7500.00, 800.00),
(203, 5000.00, 300.00);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——哪些表的员工id是1 | 返回相关查询sql：WITH annotated_columns AS ( |
| 3 | 多次询问上述问题 | SELECT |
| 4 |  | n.nspname AS schema_name, |
| 5 |  | c.relname AS table_name, |
| 6 |  | a.attname AS column_name |
| 7 |  | FROM |
| 8 |  | pg_class c |
| 9 |  | JOIN |
| 10 |  | pg_namespace n ON n.oid = c.relnamespace |
| 11 |  | JOIN |
| 12 |  | pg_attribute a ON a.attrelid = c.oid |
| 13 |  | JOIN |
| 14 |  | pg_description d ON d.objoid = c.oid AND d.objsubid = a.attnum |
| 15 |  | WHERE |
| 16 |  | d.description ILIKE '%员工id%' |
| 17 |  | AND c.relkind = 'r' |
| 18 |  | ), |
| 19 |  | sqls AS ( |
| 20 |  | SELECT |
| 21 |  | 'SELECT ''' \|\| schema_name \|\| '.' \|\| table_name \|\| ''' AS table_name FROM ' |
| 22 |  | \|\| schema_name \|\| '.' \|\| table_name \|\| ' WHERE ' \|\| column_name \|\| ' = 1 LIMIT 1' |
| 23 |  | AS sql_text |
| 24 |  | FROM annotated_columns |
| 25 |  | ), |
| 26 |  | results AS ( |
| 27 |  | SELECT * FROM ( |
| 28 |  | SELECT |
| 29 |  | (xpath('//text()', query_to_xml(sql_text, false, true, '')))[1]::text AS table_name |
| 30 |  | FROM sqls |
| 31 |  | ) AS sub |
| 32 |  | WHERE table_name IS NOT NULL |
| 33 |  | ) |
| 34 |  | SELECT * FROM results; |
| 35 |  | 返回结果：返回当前相关字段及表已进入知识库的表 |
| 36 |  | 返回思考过程 |
| 37 |  | 返回结果均与上文查询结果一致 |

##### 验证查询所有schema 「P1」

> 前置条件
```
存在schema public
public下存在表test_oushu_biao1、test_oushu_biao2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——当前数据库中有哪些 schema？ | 返回相关查询sql：SELECT schema_name FROM information_schema.schemata; |
| 3 |  | 返回结果：当前oushu连接源下的所有已进入知识库的schema |
| 4 |  | 返回思考过程 |

##### 验证查询指定schema下的所有表 「P1」

> 前置条件
```
存在schema public
public下存在表test_oushu_biao1、test_oushu_biao2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——public schema 下有哪些表 | 返回相关查询sql：SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'; |
| 3 |  | 返回结果：当前public下所有已进入知识库的表 |
| 4 |  | 返回思考过程 |
| 5 |  | 返回结果为表查询下表与知识库下表取交集 |

##### 验证查询表结构信息 「P1」

> 前置条件
```
存在schema public
public下存在表test_oushu_biao1、test_oushu_biao2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——查询表test_oushu_biao1的所有字段及类型、是否可为空、默认值？ | 返回相关查询sql：SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'test_oushu_biao1'; |
| 3 |  | 返回结果：返回表test_oushu_biao1已传入知识库的字段名称、字段类型、是否可为空、默认值的结果 |
| 4 |  | 返回思考过程 |

##### 验证查询当前所使用schema 「P1」

> 前置条件
```
存在schema public
public下存在表test_oushu_biao1、test_oushu_biao2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——当前我用的是哪个schema | 返回相关查询sql：SELECT current_schema(); |
| 3 |  | 返回结果：返回当前所使用且已进入知识库的schema |
| 4 |  | 返回思考过程 |

##### 验证查询表使用约束类型（PRIMARY KEY）的字段有哪些 「P1」

> 前置条件
```
存在schema public
public下存在表test_oushu_biao1、test_oushu_biao2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——表test_oushu_biao1的主键字段有哪些 | 返回相关查询sql：SELECT kcu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name WHERE tc.table_schema = 'public' AND tc.table_name = 'test_oushu_biao1' AND tc.constraint_type = 'PRIMARY KEY'; |
| 3 |  | 返回结果：返回表test_oushu_biao1的已进入知识库的主键字段 |
| 4 |  | 返回思考过程 |

##### 验证查询指定表的权限 「P1」

> 前置条件
```
存在schema public
public下存在表test_oushu_biao1、test_oushu_biao2
存在用户test_user_ai_001，此用户无表test_oushu_biao1的权限
存在用户test_user_ai_002（只赋予dql权限），此用户有表test_oushu_biao1的权限（只dql权限）
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——哪些用户或角色对表test_oushu_biao1有权限？他们拥有哪些权限？ | 返回相关查询sql：SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name = 'test_oushu_biao1'; |
| 3 |  | 返回结果：返回对表test_oushu_biao1有权限的已进入知识库的所有用户及拥有的权限 |
| 4 |  | 返回思考过程 |

##### 验证查询系统函数返回结果正常 「P1」

> 前置条件
```
存在schema public
public下存在表test_oushu_biao1、test_oushu_biao2
存在用户test_user_ai_001，此用户无表test_oushu_biao1的权限
存在用户test_user_ai_002（只赋予dql权限），此用户有表test_oushu_biao1的权限（只dql权限）
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——当前连接使用的是哪个数据库？当前用户是谁？客户端 IP 是多少？ | 返回相关查询sql：SELECT current_database(), current_user, inet_client_addr(); |
| 3 |  | 返回结果：返回当前使用已进入知识库的数据库、用户、客户端ip |
| 4 |  | 返回思考过程 |

##### 验证查询public库下的test_oushu_biao1后接着查询public_1库下的表test_oushu_biao3数据内容正常 「P1」

> 前置条件
```
存在schema public、public_1
public下存在表test_oushu_biao1、test_oushu_biao2
public_1下存在表test_oushu_biao3
public不存在biao3，同时public1也不存在biao1、biao2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——帮我查询public库下的表test_oushu_biao1的所有数据 | 返回相关查询sql：SELECT * from test_oushu_biao1; |
| 3 | 询问——帮我查询public_1库下的表test_oushu_biao3的所有数据 | 返回结果：该表的所有数据 |
| 4 |  | 返回思考过程 |
| 5 |  | 返回相关查询sql：SELECT * from test_oushu_biao3; |
| 6 |  | 返回结果：该表的所有数据 |
| 7 |  | 返回思考过程 |

##### 验证存在上下文的情况下切换左侧任务框为其他数据源后询问返回当前任务框所属数据源类型结果 「P1」

> 前置条件
```
存在schema public、public_1
public下存在表test_oushu_biao1、test_oushu_biao2
public_1下存在表test_oushu_biao3
public不存在biao3，同时public1也不存在biao1、biao2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——帮我查询oushudb数据源public库下的所有表 | 返回相关查询sql：SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'; |
| 3 | 左侧切换为DM FOR ORACLE的任务框（当前项目对接schema或创建schema为test_dm_001） | 返回结果：当前public下所有已进入知识库的表 |
| 4 | 询问——帮我查询当前库下的所有表 | 返回思考过程 |
| 5 |  | 返回结果为表查询下表与知识库下表取交集 |
| 6 |  | 任务框切换成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 7 |  | 返回相关查询sql：SELECT table_name FROM information_schema.tables WHERE table_schema = 'test_dm_001'; |
| 8 |  | 返回结果：当前test_dm_001库下所有已进入知识库的表 |
| 9 |  | 返回思考过程 |
| 10 |  | 返回结果为表查询下表与知识库下表取交集 |

##### 验证存在上下文的情况下切换左侧任务框为其他同类型数据源不同schema后询问返回当前任务框所指定schema结果（不创建和不对接项目专属用例） 「P2」

> 前置条件
```
存在schema public、public_1
public下存在表test_oushu_biao1、test_oushu_biao2
public_1下存在表test_oushu_biao3
public不存在biao3，同时public1也不存在biao1、biao2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——帮我查询oushudb数据源public库下的所有表 | 返回相关查询sql：SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'; |
| 3 | 创建一个oushudb任务框并打开，左上角选择schema public_1 | 返回结果：当前public下所有已进入知识库的表 |
| 4 | 询问——帮我查询当前库下的所有表 | 返回思考过程 |
| 5 | 创建一个oushudb任务框并打开，左上角选择schema public_2 | 返回结果为表查询下表与知识库下表取交集 |
| 6 | 询问——帮我查询当前库下的所有表 | 任务创建、打开成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 7 |  | 返回相关查询sql：SELECT table_name FROM information_schema.tables WHERE table_schema = 'public_1'; |
| 8 |  | 返回结果：当前public_1库下所有已进入知识库的表 |
| 9 |  | 返回思考过程 |
| 10 |  | 返回结果为表查询下表与知识库下表取交集 |
| 11 |  | 任务创建、打开成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 12 |  | 返回相关查询sql：SELECT table_name FROM information_schema.tables WHERE table_schema = 'public_2'; |
| 13 |  | 返回结果：当前public_2库下所有已进入知识库的表 |
| 14 |  | 返回思考过程 |
| 15 |  | 返回结果为表查询下表与知识库下表取交集 |

##### 验证查询oushu数据源下的test_oushu_biao1后接着查询mysql下的表test_mysql_biao1数据内容是否正常 「P2」

> 前置条件
```
存在oushu数据源，源内存在schema public，库内存在表test_oushu_biao1
存在mysql数据源，源内存在schema mysql_public，库内存在表test_mysql_biao1
两个数据源不存在同名库
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——帮我查询public库下的表test_oushu_biao1的所有数据 | 返回相关查询sql：SELECT * from test_oushu_biao1; |
| 3 | 询问——帮我查询mysql_public库下的表test_mysql_biao1的所有数据 | 返回结果：该表的所有数据 |
| 4 |  | 返回思考过程 |
| 5 |  | 返回相关查询sql：SELECT * from test_mysql_biao1; |
| 6 |  | 返回结果：该表的所有数据 |
| 7 |  | 返回思考过程 |

##### 验证存在上下文的情况下切换项目后询问是否返回所切换项目的数据结果 「P1」

> 前置条件
```
存在schema public、public_1
public下存在表test_oushu_biao1、test_oushu_biao2
public_1下存在表test_oushu_biao3
public不存在biao3，同时public1也不存在biao1、biao2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——帮我查询oushudb数据源public库（当前项目对接schema）下的所有表 | 返回相关查询sql：SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'; |
| 3 | 切换项目test_other_001（项目创建schema test_other_001） | 返回结果：当前public下所有已进入知识库的表 |
| 4 | 询问——帮我查询当前库下的所有表 | 返回思考过程 |
| 5 |  | 返回结果为表查询下表与知识库下表取交集 |
| 6 |  | 项目切换成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 7 |  | 返回相关查询sql：SELECT table_name FROM information_schema.tables WHERE table_schema = 'test_other_001'; |
| 8 |  | 返回结果：当前test_other_001库下所有已进入知识库的表 |
| 9 |  | 返回思考过程 |
| 10 |  | 返回结果为表查询下表与知识库下表取交集 |

##### 验证询问表的中文注释正常返回表数据 「P1」

> 前置条件
```
存在表：
CREATE TABLE IF NOT EXISTS `test_oushu_biao1`(
`号码` BIGINT COMMENT '编号',
`qy_type` SMALLINT COMMENT '类型',
`company_code` BIGINT COMMENT '公司编号',
`company_name` VARCHAR(100) COMMENT '公司名称',
`project_no` BIGINT COMMENT '项目编号',
`project_name` VARCHAR(100) COMMENT '项目名称',
`project_address` VARCHAR(100) COMMENT '项目地址',
`jz_type` SMALLINT COMMENT '类型名称',
`building_name` VARCHAR(100) COMMENT '建造单位',
`sale` BIGINT COMMENT '销售额'
)
STORED AS ORC
DISTRIBUTED BY (号码);
添加表级注释：
COMMENT ON TABLE company IS '公司';
插入数据：
INSERT INTO company
VALUES
(1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云',1113),
(2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云',14113),
(3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机',2012),
(4,4,4,'dtstack_04',4,'dtstack_04','杭州',4,'杭州袋鼠',9000);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——公司是哪张表，表名是什么 | 返回相关查询sql：SELECT |
| 3 |  | c.relname AS table_name |
| 4 |  | FROM |
| 5 |  | pg_class c |
| 6 |  | JOIN |
| 7 |  | pg_namespace n ON n.oid = c.relnamespace |
| 8 |  | JOIN |
| 9 |  | pg_description d ON d.objoid = c.oid AND d.objsubid = 0 |
| 10 |  | WHERE |
| 11 |  | d.description ILIKE '%公司%' |
| 12 |  | AND c.relkind = 'r';  -- 只查普通表 |
| 13 |  | 返回结果：返回表注释为公司的所有表名 |
| 14 |  | 返回思考过程 |

##### 验证查询表的字段注释正常返回指定字段数据 「P1」

> 前置条件
```
存在表：
CREATE TABLE IF NOT EXISTS `test_oushu_biao1`(
`号码` BIGINT COMMENT '编号',
`qy_type` SMALLINT COMMENT '类型',
`company_code` BIGINT COMMENT '公司编号',
`company_name` VARCHAR(100) COMMENT '公司名称',
`project_no` BIGINT COMMENT '项目编号',
`project_name` VARCHAR(100) COMMENT '项目名称',
`project_address` VARCHAR(100) COMMENT '项目地址',
`jz_type` SMALLINT COMMENT '类型名称',
`building_name` VARCHAR(100) COMMENT '建造单位',
`sale` BIGINT COMMENT '销售额'
)
STORED AS ORC
DISTRIBUTED BY (号码);
添加表级注释：
COMMENT ON TABLE company IS '公司';
插入数据：
INSERT INTO company
VALUES
(1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云',1113),
(2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云',14113),
(3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机',2012),
(4,4,4,'dtstack_04',4,'dtstack_04','杭州',4,'杭州袋鼠',9000);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——表test_oushu_biao1里面公司编号是哪个字段 | 返回相关查询sql：SELECT |
| 3 |  | a.attname AS column_name, |
| 4 |  | d.description AS column_comment |
| 5 |  | FROM |
| 6 |  | pg_class c |
| 7 |  | JOIN |
| 8 |  | pg_namespace n ON n.oid = c.relnamespace |
| 9 |  | JOIN |
| 10 |  | pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped |
| 11 |  | LEFT JOIN |
| 12 |  | pg_description d ON d.objoid = a.attrelid AND d.objsubid = a.attnum |
| 13 |  | WHERE |
| 14 |  | c.relname = 'test_oushu_biao1' |
| 15 |  | AND d.description ILIKE '%公司编号%'; |
| 16 |  | 返回结果：返回表test_oushu_biao1字段注释为公司编号的字段 |
| 17 |  | 返回思考过程 |

##### 验证直接在灵瞳sql框内输入sql执行结果返回正常 「P1」

> 前置条件
```
存在表：
CREATE TABLE IF NOT EXISTS `test_oushu_biao1`(
`号码` BIGINT COMMENT '编号',
`qy_type` SMALLINT COMMENT '类型',
`company_code` BIGINT COMMENT '公司编号',
`company_name` VARCHAR(100) COMMENT '公司名称',
`project_no` BIGINT COMMENT '项目编号',
`project_name` VARCHAR(100) COMMENT '项目名称',
`project_address` VARCHAR(100) COMMENT '项目地址',
`jz_type` SMALLINT COMMENT '类型名称',
`building_name` VARCHAR(100) COMMENT '建造单位',
`sale` BIGINT COMMENT '销售额'
)
STORED AS ORC
DISTRIBUTED BY (号码);
添加表级注释：
COMMENT ON TABLE company IS '公司';
插入数据：
INSERT INTO company
VALUES
(1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云',1113),
(2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云',14113),
(3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机',2012),
(4,4,4,'dtstack_04',4,'dtstack_04','杭州',4,'杭州袋鼠',9000);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——帮我查询表test_oushu_biao1的所有数据 | 返回相关查询sql：SELECT * from test_oushu_biao1; |
| 3 | 直接在返回的sql框内修改查询sql：SELECT * from test_oushu_biao1 where sale >=9000; | 返回结果：返回表test_oushu_biao1的所有数据 |
| 4 | 直接在返回的sql框内修改查询sql：select str_length('hello word'); | 返回思考过程 |
| 5 | 直接在返回的sql框内修改查询sql：select CONCAT('hello','word'); | 返回结果：返回表test_oushu_biao1的所有符合结果的数据 |
| 6 | 直接在返回的sql框内修改查询sql：WITH recent_sales AS ( | 返回结果：返回自定义函数结果 |
| 7 | SELECT | 返回结果：返回系统函数结果 |
| 8 | “号码“, | 返回结果：返回筛选出销售额大于 5000 的公司记录，并给每条记录打上“高销售”“中销售”标签 |
| 9 | company_name, | 返回结果：返回统计每个项目地址（如“杭州”、“湖州”）下的项目数量 |
| 10 | sale, | 返回结果：返回结果筛选公司名以 dtstack 开头的记录，按销售额排序，跳过最高销售额那一条，取第2~4名，展示信息丰富：项目数、销售等级、名字长度、全大写、当前日期、JSON 格式摘要等 |
| 11 | project_address, |  |
| 12 | CASE |  |
| 13 | WHEN sale > 10000 THEN '高销售' |  |
| 14 | WHEN sale > 5000 THEN '中销售' |  |
| 15 | ELSE '低销售' |  |
| 16 | END AS sale_level |  |
| 17 | FROM company |  |
| 18 | WHERE sale > 5000 |  |
| 19 | ) |  |
| 20 | 直接在返回的sql框内修改查询sql：project_stats AS ( |  |
| 21 | SELECT |  |
| 22 | project_address, |  |
| 23 | COUNT(DISTINCT project_no) AS total_projects |  |
| 24 | FROM company |  |
| 25 | GROUP BY project_address |  |
| 26 | ) |  |
| 27 | 直接在返回的sql框内修改查询sql：SELECT |  |
| 28 | r.“号码“ AS id, |  |
| 29 | r.company_name, |  |
| 30 | r.sale, |  |
| 31 | r.sale_level, |  |
| 32 | p.total_projects, |  |
| 33 | r.project_address, |  |
| 34 | LENGTH(r.company_name) AS name_length, |  |
| 35 | UPPER(r.company_name) AS upper_name, |  |
| 36 | NOW()::DATE AS current_date, |  |
| 37 | json_build_object(...) AS json_data |  |
| 38 | FROM recent_sales r |  |
| 39 | LEFT JOIN project_stats p ON r.project_address = p.project_address |  |
| 40 | WHERE r.company_name ~ '^dtstack.*' |  |
| 41 | ORDER BY r.sale DESC |  |
| 42 | LIMIT 3 OFFSET 1; |  |

##### 验证询问指定表内有哪些字段包含注释 「P1」

> 前置条件
```
存在三张表：
CREATE TABLE employee_basic (
emp_id INT COMMENT '员工ID',
name VARCHAR(100),
department VARCHAR(100)
);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——表employee_basic内有哪些字段注释 | 返回相关查询sql：SELECT |
| 3 |  | column_name, |
| 4 |  | col_description(format('%s.%s', table_schema, table_name)::regclass::oid, ordinal_position) AS column_comment |
| 5 |  | FROM |
| 6 |  | information_schema.columns |
| 7 |  | WHERE |
| 8 |  | table_name = 'employee_basic' |
| 9 |  | AND table_schema = 'public'; |
| 10 |  | 返回结果：返回该表所有的字段注释 |
| 11 |  | 返回思考过程 |

##### 验证询问非返回sql问答结果正常 「P1」

> 前置条件
```
存在三张表：
CREATE TABLE employee_basic (
emp_id INT COMMENT '员工ID',
name VARCHAR(100),
department VARCHAR(100)
);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——oushudb有哪些数据类型，给出十种 | 不返回sql语句及sql查询框 |
| 3 | 询问——oushudb的left join和right join有哪些区别 | 使用自然语言返回相关问题结果 |
| 4 | 询问——报错SQL execute exception：Error while compiling statement: FAILED: ParseException line 11:1 missing EOF at 'PARTED' near的原因 | 返回思考过程 |
| 5 |  | 不返回sql语句及sql查询框 |
| 6 |  | 使用自然语言返回相关问题结果 |
| 7 |  | 返回思考过程 |
| 8 |  | 不返回sql语句及sql查询框 |
| 9 |  | 使用自然语言返回相关问题结果 |
| 10 |  | 返回思考过程 |

##### 验证通过表字段注释查询表名 「P2」

> 前置条件
```
存在三张表：
CREATE TABLE employee_basic (
emp_id INT COMMENT '员工ID',
name VARCHAR(100),
department VARCHAR(100)
);
CREATE TABLE salary_info (
employee_code INT COMMENT '员工ID',
salary DECIMAL(10,2),
bonus DECIMAL(10,2)
);
CREATE TABLE project_assignment (
emp_id INT COMMENT '分配的员工编号',
project_name VARCHAR(100),
assign_date DATE
);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——有哪些表有员工id字段 | 返回相关查询sql：SELECT |
| 3 |  | n.nspname AS schema_name, |
| 4 |  | c.relname AS table_name, |
| 5 |  | a.attname AS column_name, |
| 6 |  | d.description AS column_comment |
| 7 |  | FROM |
| 8 |  | pg_class c |
| 9 |  | JOIN pg_namespace n ON n.oid = c.relnamespace |
| 10 |  | JOIN pg_attribute a ON a.attrelid = c.oid |
| 11 |  | JOIN pg_description d ON d.objoid = c.oid AND d.objsubid = a.attnum |
| 12 |  | WHERE |
| 13 |  | d.description ILIKE '%员工id%' |
| 14 |  | AND c.relkind = 'r';  -- 只查普通表 |
| 15 |  | 返回结果：返回当前相关字段及表已进入知识库的表 |
| 16 |  | 返回思考过程 |

##### 验证通过表字段注释及结果查询表名 「P2」

> 前置条件
```
存在三张表：
CREATE TABLE employee_basic (
emp_id INT COMMENT '员工ID',
name VARCHAR(100),
department VARCHAR(100)
);
CREATE TABLE salary_info (
employee_code INT COMMENT '员工ID',
salary DECIMAL(10,2),
bonus DECIMAL(10,2)
);
CREATE TABLE project_assignment (
emp_id INT COMMENT '分配的员工编号',
project_name VARCHAR(100),
assign_date DATE
);
表插入：
INSERT INTO employee_basic (emp_id, name, department) VALUES
(101, 'Alice', 'HR'),
(102, 'Bob', 'Engineering'),
(103, 'Charlie', 'Marketing');

INSERT INTO salary_info (staff_no, base_salary, bonus) VALUES
(1, 6000.00, 500.00),
(202, 7500.00, 800.00),
(203, 5000.00, 300.00);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——哪些表的员工id是1 | 返回相关查询sql：WITH annotated_columns AS ( |
| 3 |  | SELECT |
| 4 |  | n.nspname AS schema_name, |
| 5 |  | c.relname AS table_name, |
| 6 |  | a.attname AS column_name |
| 7 |  | FROM |
| 8 |  | pg_class c |
| 9 |  | JOIN |
| 10 |  | pg_namespace n ON n.oid = c.relnamespace |
| 11 |  | JOIN |
| 12 |  | pg_attribute a ON a.attrelid = c.oid |
| 13 |  | JOIN |
| 14 |  | pg_description d ON d.objoid = c.oid AND d.objsubid = a.attnum |
| 15 |  | WHERE |
| 16 |  | d.description ILIKE '%员工id%' |
| 17 |  | AND c.relkind = 'r' |
| 18 |  | ), |
| 19 |  | sqls AS ( |
| 20 |  | SELECT |
| 21 |  | 'SELECT ''' \|\| schema_name \|\| '.' \|\| table_name \|\| ''' AS table_name FROM ' |
| 22 |  | \|\| schema_name \|\| '.' \|\| table_name \|\| ' WHERE ' \|\| column_name \|\| ' = 1 LIMIT 1' |
| 23 |  | AS sql_text |
| 24 |  | FROM annotated_columns |
| 25 |  | ), |
| 26 |  | results AS ( |
| 27 |  | SELECT * FROM ( |
| 28 |  | SELECT |
| 29 |  | (xpath('//text()', query_to_xml(sql_text, false, true, '')))[1]::text AS table_name |
| 30 |  | FROM sqls |
| 31 |  | ) AS sub |
| 32 |  | WHERE table_name IS NOT NULL |
| 33 |  | ) |
| 34 |  | SELECT * FROM results; |
| 35 |  | 返回结果：返回当前相关字段及表已进入知识库的表 |
| 36 |  | 返回思考过程 |

##### 验证询问表数据返回结果与表查询内表数据结果一致 「P2」

> 前置条件
```
存在表：
CREATE TABLE IF NOT EXISTS `test_oushu_biao1`(
`号码` BIGINT COMMENT '编号',
`qy_type` SMALLINT COMMENT '类型',
`company_code` BIGINT COMMENT '公司编号',
`company_name` VARCHAR(100) COMMENT '公司名称',
`project_no` BIGINT COMMENT '项目编号',
`project_name` VARCHAR(100) COMMENT '项目名称',
`project_address` VARCHAR(100) COMMENT '项目地址',
`jz_type` SMALLINT COMMENT '类型名称',
`building_name` VARCHAR(100) COMMENT '建造单位',
`sale` BIGINT COMMENT '销售额'
)
STORED AS ORC
DISTRIBUTED BY (号码);
添加表级注释：
COMMENT ON TABLE company IS '公司';
插入数据：
INSERT INTO company
VALUES
(1,1,1,'dtstack_01',1,'dtstack_01','杭州',1,'杭州袋鼠云',1113),
(2,2,2,'dtstack_02',2,'dtstack_02','杭州',2,'杭州云',14113),
(3,3,3,'dtstack_03',3,'dtstack_03','湖州',3,'杭州云机',2012),
(4,4,4,'dtstack_04',4,'dtstack_04','杭州',4,'杭州袋鼠',9000);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——帮我查询表test_oushu_biao1的所有数据 | 返回相关查询sql：SELECT * from test_oushu_biao1; |
| 3 |  | 返回结果：返回表内所有数据 |
| 4 |  | 返回思考过程 |
| 5 |  | 返回结果与表查询结果一致 |

##### 验证多次询问后结果返回均一致 「P2」

> 前置条件
```
存在三张表：
CREATE TABLE employee_basic (
emp_id INT COMMENT '员工ID',
name VARCHAR(100),
department VARCHAR(100)
);
CREATE TABLE salary_info (
employee_code INT COMMENT '员工ID',
salary DECIMAL(10,2),
bonus DECIMAL(10,2)
);
CREATE TABLE project_assignment (
emp_id INT COMMENT '分配的员工编号',
project_name VARCHAR(100),
assign_date DATE
);
表插入：
INSERT INTO employee_basic (emp_id, name, department) VALUES
(101, 'Alice', 'HR'),
(102, 'Bob', 'Engineering'),
(103, 'Charlie', 'Marketing');

INSERT INTO salary_info (staff_no, base_salary, bonus) VALUES
(1, 6000.00, 500.00),
(202, 7500.00, 800.00),
(203, 5000.00, 300.00);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——哪些表的员工id是1 | 返回相关查询sql：WITH annotated_columns AS ( |
| 3 | 多次询问上述问题 | SELECT |
| 4 |  | n.nspname AS schema_name, |
| 5 |  | c.relname AS table_name, |
| 6 |  | a.attname AS column_name |
| 7 |  | FROM |
| 8 |  | pg_class c |
| 9 |  | JOIN |
| 10 |  | pg_namespace n ON n.oid = c.relnamespace |
| 11 |  | JOIN |
| 12 |  | pg_attribute a ON a.attrelid = c.oid |
| 13 |  | JOIN |
| 14 |  | pg_description d ON d.objoid = c.oid AND d.objsubid = a.attnum |
| 15 |  | WHERE |
| 16 |  | d.description ILIKE '%员工id%' |
| 17 |  | AND c.relkind = 'r' |
| 18 |  | ), |
| 19 |  | sqls AS ( |
| 20 |  | SELECT |
| 21 |  | 'SELECT ''' \|\| schema_name \|\| '.' \|\| table_name \|\| ''' AS table_name FROM ' |
| 22 |  | \|\| schema_name \|\| '.' \|\| table_name \|\| ' WHERE ' \|\| column_name \|\| ' = 1 LIMIT 1' |
| 23 |  | AS sql_text |
| 24 |  | FROM annotated_columns |
| 25 |  | ), |
| 26 |  | results AS ( |
| 27 |  | SELECT * FROM ( |
| 28 |  | SELECT |
| 29 |  | (xpath('//text()', query_to_xml(sql_text, false, true, '')))[1]::text AS table_name |
| 30 |  | FROM sqls |
| 31 |  | ) AS sub |
| 32 |  | WHERE table_name IS NOT NULL |
| 33 |  | ) |
| 34 |  | SELECT * FROM results; |
| 35 |  | 返回结果：返回当前相关字段及表已进入知识库的表 |
| 36 |  | 返回思考过程 |
| 37 |  | 返回结果均与上文查询结果一致 |

##### 验证查询表建表信息 「P1」

> 前置条件
```
存在schema public
public下存在表test_oushu_biao1、test_oushu_biao2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——表test_oushu_biao1的建表语句是什么？ | 返回相关查询sql：show create table test_oushu_biao1; |
| 3 |  | 返回结果：指定表的建表语句 |
| 4 |  | 返回思考过程 |

##### 验证查询gp表数据 「P2」

> 前置条件
```
存在schema public
public下存在表test_oushu_biao1、test_oushu_biao2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——帮我查询test_gp_biao1的所有数据 | 返回相关查询sql：select * from test_gp_biao1; |
| 3 |  | 返回结果：指定表的所有数据 |
| 4 |  | 返回思考过程 |

##### 验证查询dm for oracle表数据 「P2」

> 前置条件
```
存在schema public
public下存在表test_oushu_biao1、test_oushu_biao2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——帮我查询test_dm_biao1的所有数据 | 返回相关查询sql：select * from test_dm_biao1; |
| 3 |  | 返回结果：指定表的所有数据 |
| 4 |  | 返回思考过程 |

##### 验证不创建不对接schema的数据源建表后正常通过ai询问 「P2」

> 前置条件
```
存在schema public
public下存在表test_oushu_biao1、test_oushu_biao2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 可正常打开灵瞳对话框 |
| 2 | 询问——帮我查询test_sr_002的所有数据 | 返回相关查询sql：select * from test_sr_002; |
| 3 |  | 返回结果：指定表的所有数据 |
| 4 |  | 返回思考过程 |

##### 验证修改表结构后知识库同步更新 「P2」

> 前置条件
```
存在schema public
public下存在表test_oushu_biao1、test_oushu_biao2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源选择不创建且不对接schema的项目 | 成功进入数据源选择不创建且不对接schema的项目页面，页面内容正常加载显示，无报错 |
| 2 | 询问——表test_oushu_biao1有哪些字段，给出字段名称 | 返回相关查询sql |
| 3 | 修改表test_oushu_biao1的表结构： | 返回结果：指定表的所有字段 |
| 4 | ALTER TABLE test_oushu_biao1 | 返回思考过程 |
| 5 | ADD COLUMN bir INT DEFAULT 0; | 表结构修改成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 6 | ALTER TABLE test_oushu_biao1 | 返回相关查询sql |
| 7 | DROP COLUMN name; | 返回结果：指定表的所有字段 |
| 8 | COMMENT ON COLUMN test_oushu_biao1.id IS '员工编号'; | 返回思考过程 |
| 9 | 再次询问——表test_oushu_biao1有哪些字段，给出字段名称 |  |

