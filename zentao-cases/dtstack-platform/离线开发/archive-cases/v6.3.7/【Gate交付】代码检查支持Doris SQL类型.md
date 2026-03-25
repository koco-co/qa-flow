# 【Gate交付】代码检查支持Doris SQL类型 v6.3.7
> 来源：zentao-cases/dtstack-platform/离线开发/archive-cases/v6.3.7/【Gate交付】代码检查支持Doris SQL类型.csv
> 用例数：21

---

## 验证临时运行时SQL规范性检查功能正常_阻断_Doris
**优先级**: P1
**前置条件**: 【项目管理-项目设置-操作设置-SQL规范性检查】页面，
1）已选择SQL校验代码规则（选择的规则的影响方式均为阻断）：
a）禁止使用 SELECT *
b）代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
c）分区表查询必须带分区
2）生效范围：临时查询
3）SQL类型：Doris、OceanBase for Oracle

**步骤**:
1. 进入【数据开发-临时查询】页面，新建Doris任务，输入sql，点击“运行”，sql如下：
2. CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 2 PROPERTIES (     “replication_num“ = “1“ );
3. 点击二次弹窗中的“确定”
4. 点击二次弹窗中的“仍要运行”
5. 修改sql，点击“运行”，sql如下：
6. select * from wytest;
7. 点击二次弹窗中的“确定”
8. 点击二次弹窗中的“仍要运行”
9. 修改sql，点击“运行”，sql如下：
10. --select * from wytest;
11. select id from wytest;

**预期**:
1. 弹出二次确认弹窗
2. 1）title：任务“${任务名称}”SQL检查
3. 2）提示文案：SQL规范性检查结果存在阻断项，无法运行
4. 3）“仍要运行、确定”按钮
5. 页面底部展示【SQL规范性检查】tab，列表展示一条数据，具体如下：
6. 1）行号：${SQL所对应的行号}
7. 2）SQL：CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 10 PROPERTIES (     “replication_num“ = “1“ );
8. 3）触发校验规则：代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
9. 4）校验结果：代码中包含了DDL关键字：create
10. 5）影响：阻断
11. 关闭弹窗，任务不运行
12. 关闭弹窗，任务正常运行
13. 弹出二次确认弹窗；页面底部展示【SQL规范性检查】tab，列表展示一条数据，具体如下：
14. 1）行号：${SQL所对应的行号}
15. 2）SQL：select * from wytest
16. 3）触发校验规则：禁止使用 SELECT *
17. 4）校验结果：代码中含有SELECT * 查询
18. 5）影响：阻断
19. 关闭弹窗，任务不运行
20. 关闭弹窗，任务正常运行
21. 任务正常运行，页面底部展示【SQL规范性检查】tab，提示：SQL规范性检查通过！

---

## 验证临时运行时SQL规范性检查功能正常_提示_Doris
**优先级**: P2
**前置条件**: 【项目管理-项目设置-操作设置-SQL规范性检查】页面，
1）已选择SQL校验代码规则（选择的规则的影响方式均为提示）：
a）禁止使用 SELECT *
b）代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
c）分区表查询必须带分区
2）生效范围：临时查询
3）SQL类型：Doris、OceanBase for Oracle

**步骤**:
1. 进入【数据开发-临时查询】页面，新建Doris任务，输入sql，点击“运行”，sql如下：
2. CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 2 PROPERTIES (     “replication_num“ = “1“ );
3. 修改sql，点击“运行”，sql如下：
4. select * from wytest;
5. 修改sql，点击“运行”，sql如下：
6. --select * from wytest;
7. select id from wytest;

**预期**:
1. 任务正常运行，页面底部展示【SQL规范性检查】tab，列表展示一条数据，具体如下：
2. 1）行号：${SQL所对应的行号}
3. 2）SQL：CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 10 PROPERTIES (     “replication_num“ = “1“ );
4. 3）触发校验规则：代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
5. 4）校验结果：代码中包含了DDL关键字：create
6. 5）影响：提示
7. 任务正常运行；页面底部展示【SQL规范性检查】tab，列表展示一条数据，具体如下：
8. 1）行号：${SQL所对应的行号}
9. 2）SQL：select * from wytest
10. 3）触发校验规则：禁止使用 SELECT *
11. 4）校验结果：代码中含有SELECT * 查询
12. 5）影响：提示
13. 任务正常运行，页面底部展示【SQL规范性检查】tab，提示：SQL规范性检查通过！

---

## 验证「SQL检查-规范性检查」功能正常_阻断_Doris
**优先级**: P2
**前置条件**: 【项目管理-项目设置-操作设置-SQL规范性检查】页面，
1）已选择SQL校验代码规则（选择的规则的影响方式均为阻断）：
a）禁止使用 SELECT *
b）代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
c）分区表查询必须带分区
2）生效范围：临时查询
3）SQL类型：Doris、OceanBase for Oracle

**步骤**:
1. 进入【数据开发-临时查询】页面，新建Doris任务，输入sql，点击“SQL检查-规范性检查”，sql如下：
2. CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 2 PROPERTIES (     “replication_num“ = “1“ );
3. 修改sql，点击“SQL检查-规范性检查”，sql如下：
4. select * from wytest;
5. 修改sql，点击“SQL检查-规范性检查”，sql如下：
6. --select * from wytest;
7. select id from wytest;

**预期**:
1. 页面底部展示【SQL规范性检查】tab，列表展示一条数据，具体如下：
2. 1）行号：${SQL所对应的行号}
3. 2）SQL：CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 10 PROPERTIES (     “replication_num“ = “1“ );
4. 3）触发校验规则：代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
5. 4）校验结果：代码中包含了DDL关键字：create
6. 5）影响：阻断
7. 页面底部展示【SQL规范性检查】tab，列表展示一条数据，具体如下：
8. 1）行号：${SQL所对应的行号}
9. 2）SQL：select * from wytest
10. 3）触发校验规则：禁止使用 SELECT *
11. 4）校验结果：代码中含有SELECT * 查询
12. 5）影响：阻断
13. 页面底部展示【SQL规范性检查】tab，提示：SQL规范性检查通过！

---

## 验证「SQL检查-规范性检查」功能正常_提示_Doris
**优先级**: P1
**前置条件**: 【项目管理-项目设置-操作设置-SQL规范性检查】页面，
1）已选择SQL校验代码规则（选择的规则的影响方式均为提示）：
a）禁止使用 SELECT *
b）代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
c）分区表查询必须带分区
2）生效范围：临时查询
3）SQL类型：Doris、OceanBase for Oracle

**步骤**:
1. 进入【数据开发-临时查询】页面，新建Doris任务，输入sql，点击“SQL检查-规范性检查”，sql如下：
2. CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 2 PROPERTIES (     “replication_num“ = “1“ );
3. 修改sql，点击“SQL检查-规范性检查”，sql如下：
4. select * from wytest;
5. 修改sql，点击“SQL检查-规范性检查”，sql如下：
6. --select * from wytest;
7. select id from wytest;

**预期**:
1. 页面底部展示【SQL规范性检查】tab，列表展示一条数据，具体如下：
2. 1）行号：${SQL所对应的行号}
3. 2）SQL：CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 10 PROPERTIES (     “replication_num“ = “1“ );
4. 3）触发校验规则：代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
5. 4）校验结果：代码中包含了DDL关键字：create
6. 5）影响：提示
7. 页面底部展示【SQL规范性检查】tab，列表展示一条数据，具体如下：
8. 1）行号：${SQL所对应的行号}
9. 2）SQL：select * from wytest
10. 3）触发校验规则：禁止使用 SELECT *
11. 4）校验结果：代码中含有SELECT * 查询
12. 5）影响：提示
13. 页面底部展示【SQL规范性检查】tab，提示：SQL规范性检查通过！

---

## 验证sql任务编辑器中「SQL检查」显示正确_Doris
**优先级**: P2
**前置条件**: 【项目管理-项目设置-操作设置-SQL规范性检查】页面，
1）已选择SQL校验代码规则：
a）禁止使用 SELECT *
b）代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
c）分区表查询必须带分区
2）生效范围：临时查询
3）SQL类型：Doris、OceanBase for Oracle

**步骤**:
1. 进入【数据开发-临时查询】页面，新建Doris任务，点击“SQL检查”

**预期**:
1. 【SQL检查】下拉列表展示：
2. 1）执行计划
3. 2）规范性检查

---

## 验证提交任务时SQL规范性检查功能正常_阻断_Doris
**优先级**: P2
**前置条件**: 【项目管理-项目设置-操作设置-SQL规范性检查】页面，
1）已选择SQL校验代码规则（选择的规则的影响方式均为阻断）：
a）禁止使用 SELECT *
b）代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
c）分区表查询必须带分区
2）生效范围：周期任务/手动任务
3）SQL类型：Doris、OceanBase for Oracle

**步骤**:
1. 进入【数据开发-手动任务】页面，新建Doris任务，输入sql，保存并点击“提交”，sql如下：
2. CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 2 PROPERTIES (     “replication_num“ = “1“ );
3. 修改sql，保存并点击“提交”，sql如下：
4. select * from wytest;
5. 修改sql，保存并点击“提交”，sql如下：
6. --select * from wytest;
7. select id from wytest;

**预期**:
1. 弹出二次确认弹窗
2. 1）title：任务“${任务名称}”SQL检查
3. 2）提示文案：SQL规范性检查结果存在阻断项，无法提交
4. 3）“仍要提交、确定”按钮
5. 4）点击二次弹窗中的“确定”：关闭弹窗，任务不提交
6. 5）点击二次弹窗中的“仍要运行”：正常进入提交任务弹窗，点击“确定”后提交成功
7. 弹出二次确认弹窗
8. 1）点击二次弹窗中的“确定”：关闭弹窗，任务不提交
9. 2）点击二次弹窗中的“仍要提交”：正常进入提交任务弹窗，点击“确定”后提交成功
10. 正常进入提交任务弹窗，点击“确定”后提交成功，系统给出提交成功提示，状态更新为下一处理阶段

---

## 验证提交任务时SQL规范性检查功能正常_提示_Doris
**优先级**: P1
**前置条件**: 【项目管理-项目设置-操作设置-SQL规范性检查】页面，
1）已选择SQL校验代码规则（选择的规则的影响方式均为提示）：
a）禁止使用 SELECT *
b）代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
c）分区表查询必须带分区
2）生效范围：周期任务/手动任务
3）SQL类型：Doris、OceanBase for Oracle

**步骤**:
1. 进入【数据开发-手动任务】页面，新建Doris任务，输入sql，保存并点击“提交”，sql如下：
2. CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 2 PROPERTIES (     “replication_num“ = “1“ );
3. 修改sql，保存并点击“提交”，sql如下：
4. select * from wytest;
5. 修改sql，保存并点击“提交”，sql如下：
6. --select * from wytest;
7. select id from wytest;

**预期**:
1. 正常进入提交任务弹窗，点击“确定”后提交成功，系统给出提交成功提示，状态更新为下一处理阶段
2. 正常进入提交任务弹窗，点击“确定”后提交成功，系统给出提交成功提示，状态更新为下一处理阶段
3. 正常进入提交任务弹窗，点击“确定”后提交成功，系统给出提交成功提示，状态更新为下一处理阶段

---

## 验证临时运行时SQL规范性检查功能正常_阻断_Doris
**优先级**: P2
**前置条件**: 【项目管理-项目设置-操作设置-SQL规范性检查】页面，
1）已选择SQL校验代码规则（选择的规则的影响方式均为阻断）：
a）禁止使用 SELECT *
b）代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
c）分区表查询必须带分区
2）生效范围：周期任务/手动任务
3）SQL类型：Doris、OceanBase for Oracle

**步骤**:
1. 进入【数据开发-手动任务】页面，新建Doris任务，输入sql，点击“运行”，sql如下：
2. CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 2 PROPERTIES (     “replication_num“ = “1“ );
3. 点击二次弹窗中的“确定”
4. 点击二次弹窗中的“仍要运行”
5. 修改sql，点击“运行”，sql如下：
6. select * from wytest;
7. 点击二次弹窗中的“确定”
8. 点击二次弹窗中的“仍要运行”
9. 修改sql，点击“运行”，sql如下：
10. --select * from wytest;
11. select id from wytest;

**预期**:
1. 弹出二次确认弹窗
2. 1）title：任务“${任务名称}”SQL检查
3. 2）提示文案：SQL规范性检查结果存在阻断项，无法运行
4. 3）“仍要运行、确定”按钮
5. 页面底部展示【SQL规范性检查】tab，列表展示一条数据，具体如下：
6. 1）行号：${SQL所对应的行号}
7. 2）SQL：CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 10 PROPERTIES (     “replication_num“ = “1“ );
8. 3）触发校验规则：代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
9. 4）校验结果：代码中包含了DDL关键字：create
10. 5）影响：阻断
11. 关闭弹窗，任务不运行
12. 关闭弹窗，任务正常运行
13. 弹出二次确认弹窗；页面底部展示【SQL规范性检查】tab，列表展示一条数据，具体如下：
14. 1）行号：${SQL所对应的行号}
15. 2）SQL：select * from wytest
16. 3）触发校验规则：禁止使用 SELECT *
17. 4）校验结果：代码中含有SELECT * 查询
18. 5）影响：阻断
19. 关闭弹窗，任务不运行
20. 关闭弹窗，任务正常运行
21. 任务正常运行，页面底部展示【SQL规范性检查】tab，提示：SQL规范性检查通过！

---

## 验证临时运行时SQL规范性检查功能正常_提示_Doris
**优先级**: P1
**前置条件**: 【项目管理-项目设置-操作设置-SQL规范性检查】页面，
1）已选择SQL校验代码规则（选择的规则的影响方式均为提示）：
a）禁止使用 SELECT *
b）代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
c）分区表查询必须带分区
2）生效范围：周期任务/手动任务
3）SQL类型：Doris、OceanBase for Oracle

**步骤**:
1. 进入【数据开发-手动任务】页面，新建Doris任务，输入sql，点击“运行”，sql如下：
2. CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 2 PROPERTIES (     “replication_num“ = “1“ );
3. 修改sql，点击“运行”，sql如下：
4. select * from wytest;
5. 修改sql，点击“运行”，sql如下：
6. --select * from wytest;
7. select id from wytest;

**预期**:
1. 任务正常运行，页面底部展示【SQL规范性检查】tab，列表展示一条数据，具体如下：
2. 1）行号：${SQL所对应的行号}
3. 2）SQL：CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 10 PROPERTIES (     “replication_num“ = “1“ );
4. 3）触发校验规则：代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
5. 4）校验结果：代码中包含了DDL关键字：create
6. 5）影响：提示
7. 任务正常运行；页面底部展示【SQL规范性检查】tab，列表展示一条数据，具体如下：
8. 1）行号：${SQL所对应的行号}
9. 2）SQL：select * from wytest
10. 3）触发校验规则：禁止使用 SELECT *
11. 4）校验结果：代码中含有SELECT * 查询
12. 5）影响：提示
13. 任务正常运行，页面底部展示【SQL规范性检查】tab，提示：SQL规范性检查通过！

---

## 验证「SQL检查-规范性检查」功能正常_阻断_Doris
**优先级**: P1
**前置条件**: 【项目管理-项目设置-操作设置-SQL规范性检查】页面，
1）已选择SQL校验代码规则（选择的规则的影响方式均为阻断）：
a）禁止使用 SELECT *
b）代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
c）分区表查询必须带分区
2）生效范围：周期任务/手动任务
3）SQL类型：Doris、OceanBase for Oracle

**步骤**:
1. 进入【数据开发-手动任务】页面，新建Doris任务，输入sql，点击“SQL检查-规范性检查”，sql如下：
2. CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 2 PROPERTIES (     “replication_num“ = “1“ );
3. 修改sql，点击“SQL检查-规范性检查”，sql如下：
4. select * from wytest;
5. 修改sql，点击“SQL检查-规范性检查”，sql如下：
6. --select * from wytest;
7. select id from wytest;

**预期**:
1. 页面底部展示【SQL规范性检查】tab，列表展示一条数据，具体如下：
2. 1）行号：${SQL所对应的行号}
3. 2）SQL：CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 10 PROPERTIES (     “replication_num“ = “1“ );
4. 3）触发校验规则：代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
5. 4）校验结果：代码中包含了DDL关键字：create
6. 5）影响：阻断
7. 页面底部展示【SQL规范性检查】tab，列表展示一条数据，具体如下：
8. 1）行号：${SQL所对应的行号}
9. 2）SQL：select * from wytest
10. 3）触发校验规则：禁止使用 SELECT *
11. 4）校验结果：代码中含有SELECT * 查询
12. 5）影响：阻断
13. 页面底部展示【SQL规范性检查】tab，提示：SQL规范性检查通过！

---

## 验证「SQL检查-规范性检查」功能正常_提示_Doris
**优先级**: P2
**前置条件**: 【项目管理-项目设置-操作设置-SQL规范性检查】页面，
1）已选择SQL校验代码规则（选择的规则的影响方式均为提示）：
a）禁止使用 SELECT *
b）代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
c）分区表查询必须带分区
2）生效范围：周期任务/手动任务
3）SQL类型：Doris、OceanBase for Oracle

**步骤**:
1. 进入【数据开发-手动任务】页面，新建Doris任务，输入sql，点击“SQL检查-规范性检查”，sql如下：
2. CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 2 PROPERTIES (     “replication_num“ = “1“ );
3. 修改sql，点击“SQL检查-规范性检查”，sql如下：
4. select * from wytest;
5. 修改sql，点击“SQL检查-规范性检查”，sql如下：
6. --select * from wytest;
7. select id from wytest;

**预期**:
1. 页面底部展示【SQL规范性检查】tab，列表展示一条数据，具体如下：
2. 1）行号：${SQL所对应的行号}
3. 2）SQL：CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 10 PROPERTIES (     “replication_num“ = “1“ );
4. 3）触发校验规则：代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
5. 4）校验结果：代码中包含了DDL关键字：create
6. 5）影响：提示
7. 页面底部展示【SQL规范性检查】tab，列表展示一条数据，具体如下：
8. 1）行号：${SQL所对应的行号}
9. 2）SQL：select * from wytest
10. 3）触发校验规则：禁止使用 SELECT *
11. 4）校验结果：代码中含有SELECT * 查询
12. 5）影响：提示
13. 页面底部展示【SQL规范性检查】tab，提示：SQL规范性检查通过！

---

## 验证sql任务编辑器中「SQL检查」显示正确_Doris
**优先级**: P2
**前置条件**: 【项目管理-项目设置-操作设置-SQL规范性检查】页面，
1）已选择SQL校验代码规则：
a）禁止使用 SELECT *
b）代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
c）分区表查询必须带分区
2）生效范围：周期任务/手动任务
3）SQL类型：Doris、OceanBase for Oracle

**步骤**:
1. 进入【数据开发-手动任务】页面，新建Doris任务，点击“SQL检查”

**预期**:
1. 【SQL检查】下拉列表展示：
2. 1）执行计划
3. 2）规范性检查

---

## 验证提交任务时SQL规范性检查功能正常_阻断_Doris
**优先级**: P1
**前置条件**: 【项目管理-项目设置-操作设置-SQL规范性检查】页面，
1）已选择SQL校验代码规则（选择的规则的影响方式均为阻断）：
a）禁止使用 SELECT *
b）代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
c）分区表查询必须带分区
2）生效范围：周期任务/手动任务
3）SQL类型：Doris、OceanBase for Oracle

**步骤**:
1. 进入【数据开发-周期任务】页面，新建Doris任务，输入sql，保存并点击“提交”，sql如下：
2. CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 2 PROPERTIES (     “replication_num“ = “1“ );
3. 修改sql，保存并点击“提交”，sql如下：
4. select * from wytest;
5. 修改sql，保存并点击“提交”，sql如下：
6. --select * from wytest;
7. select id from wytest;

**预期**:
1. 弹出二次确认弹窗
2. 1）title：任务“${任务名称}”SQL检查
3. 2）提示文案：SQL规范性检查结果存在阻断项，无法提交
4. 3）“仍要提交、确定”按钮
5. 4）点击二次弹窗中的“确定”：关闭弹窗，任务不提交
6. 5）点击二次弹窗中的“仍要提交”：正常进入提交任务弹窗，点击“确定”后提交成功
7. 弹出二次确认弹窗
8. 1）点击二次弹窗中的“确定”：关闭弹窗，任务不提交
9. 2）点击二次弹窗中的“仍要提交”：正常进入提交任务弹窗，点击“确定”后提交成功
10. 正常进入提交任务弹窗，点击“确定”后提交成功，系统给出提交成功提示，状态更新为下一处理阶段

---

## 验证提交任务时SQL规范性检查功能正常_提示_Doris
**优先级**: P2
**前置条件**: 【项目管理-项目设置-操作设置-SQL规范性检查】页面，
1）已选择SQL校验代码规则（选择的规则的影响方式均为提示）：
a）禁止使用 SELECT *
b）代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
c）分区表查询必须带分区
2）生效范围：周期任务/手动任务
3）SQL类型：Doris、OceanBase for Oracle

**步骤**:
1. 进入【数据开发-周期任务】页面，新建Doris任务，输入sql，保存并点击“提交”，sql如下：
2. CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 2 PROPERTIES (     “replication_num“ = “1“ );
3. 修改sql，保存并点击“提交”，sql如下：
4. select * from wytest;
5. 修改sql，保存并点击“提交”，sql如下：
6. --select * from wytest;
7. select id from wytest;

**预期**:
1. 正常进入提交任务弹窗，点击“确定”后提交成功，系统给出提交成功提示，状态更新为下一处理阶段
2. 正常进入提交任务弹窗，点击“确定”后提交成功，系统给出提交成功提示，状态更新为下一处理阶段
3. 正常进入提交任务弹窗，点击“确定”后提交成功，系统给出提交成功提示，状态更新为下一处理阶段

---

## 验证临时运行时SQL规范性检查功能正常_阻断_Doris
**优先级**: P1
**前置条件**: 【项目管理-项目设置-操作设置-SQL规范性检查】页面，
1）已选择SQL校验代码规则（选择的规则的影响方式均为阻断）：
a）禁止使用 SELECT *
b）代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
c）分区表查询必须带分区
2）生效范围：周期任务/手动任务
3）SQL类型：Doris、OceanBase for Oracle

**步骤**:
1. 进入【数据开发-周期任务】页面，新建Doris任务，输入sql，点击“运行”，sql如下：
2. CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 2 PROPERTIES (     “replication_num“ = “1“ );
3. 点击二次弹窗中的“确定”
4. 点击二次弹窗中的“仍要运行”
5. 修改sql，点击“运行”，sql如下：
6. select * from wytest;
7. 点击二次弹窗中的“确定”
8. 点击二次弹窗中的“仍要运行”
9. 修改sql，点击“运行”，sql如下：
10. --select * from wytest;
11. select id from wytest;

**预期**:
1. 弹出二次确认弹窗
2. 1）title：任务“${任务名称}”SQL检查
3. 2）提示文案：SQL规范性检查结果存在阻断项，无法运行
4. 3）“仍要运行、确定”按钮
5. 页面底部展示【SQL规范性检查】tab，列表展示一条数据，具体如下：
6. 1）行号：${SQL所对应的行号}
7. 2）SQL：CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 10 PROPERTIES (     “replication_num“ = “1“ );
8. 3）触发校验规则：代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
9. 4）校验结果：代码中包含了DDL关键字：create
10. 5）影响：阻断
11. 关闭弹窗，任务不运行
12. 关闭弹窗，任务正常运行
13. 弹出二次确认弹窗；页面底部展示【SQL规范性检查】tab，列表展示一条数据，具体如下：
14. 1）行号：${SQL所对应的行号}
15. 2）SQL：select * from wytest
16. 3）触发校验规则：禁止使用 SELECT *
17. 4）校验结果：代码中含有SELECT * 查询
18. 5）影响：阻断
19. 关闭弹窗，任务不运行
20. 关闭弹窗，任务正常运行
21. 任务正常运行，页面底部展示【SQL规范性检查】tab，提示：SQL规范性检查通过！

---

## 验证临时运行时SQL规范性检查功能正常_提示_Doris
**优先级**: P2
**前置条件**: 【项目管理-项目设置-操作设置-SQL规范性检查】页面，
1）已选择SQL校验代码规则（选择的规则的影响方式均为提示）：
a）禁止使用 SELECT *
b）代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
c）分区表查询必须带分区
2）生效范围：周期任务/手动任务
3）SQL类型：Doris、OceanBase for Oracle

**步骤**:
1. 进入【数据开发-周期任务】页面，新建Doris任务，输入sql，点击“运行”，sql如下：
2. CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 2 PROPERTIES (     “replication_num“ = “1“ );
3. 修改sql，点击“运行”，sql如下：
4. select * from wytest;
5. 修改sql，点击“运行”，sql如下：
6. --select * from wytest;
7. select id from wytest;

**预期**:
1. 任务正常运行，页面底部展示【SQL规范性检查】tab，列表展示一条数据，具体如下：
2. 1）行号：${SQL所对应的行号}
3. 2）SQL：CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 10 PROPERTIES (     “replication_num“ = “1“ );
4. 3）触发校验规则：代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
5. 4）校验结果：代码中包含了DDL关键字：create
6. 5）影响：提示
7. 任务正常运行；页面底部展示【SQL规范性检查】tab，列表展示一条数据，具体如下：
8. 1）行号：${SQL所对应的行号}
9. 2）SQL：select * from wytest
10. 3）触发校验规则：禁止使用 SELECT *
11. 4）校验结果：代码中含有SELECT * 查询
12. 5）影响：提示
13. 任务正常运行，页面底部展示【SQL规范性检查】tab，提示：SQL规范性检查通过！

---

## 验证「SQL检查-规范性检查」功能正常_阻断_Doris
**优先级**: P2
**前置条件**: 【项目管理-项目设置-操作设置-SQL规范性检查】页面，
1）已选择SQL校验代码规则（选择的规则的影响方式均为阻断）：
a）禁止使用 SELECT *
b）代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
c）分区表查询必须带分区
2）生效范围：周期任务/手动任务
3）SQL类型：Doris、OceanBase for Oracle

**步骤**:
1. 进入【数据开发-周期任务】页面，新建Doris任务，输入sql，点击“SQL检查-规范性检查”，sql如下：
2. CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 2 PROPERTIES (     “replication_num“ = “1“ );
3. 修改sql，点击“SQL检查-规范性检查”，sql如下：
4. select * from wytest;
5. 修改sql，点击“SQL检查-规范性检查”，sql如下：
6. --select * from wytest;
7. select id from wytest;

**预期**:
1. 页面底部展示【SQL规范性检查】tab，列表展示一条数据，具体如下：
2. 1）行号：${SQL所对应的行号}
3. 2）SQL：CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 10 PROPERTIES (     “replication_num“ = “1“ );
4. 3）触发校验规则：代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
5. 4）校验结果：代码中包含了DDL关键字：create
6. 5）影响：阻断
7. 页面底部展示【SQL规范性检查】tab，列表展示一条数据，具体如下：
8. 1）行号：${SQL所对应的行号}
9. 2）SQL：select * from wytest
10. 3）触发校验规则：禁止使用 SELECT *
11. 4）校验结果：代码中含有SELECT * 查询
12. 5）影响：阻断
13. 页面底部展示【SQL规范性检查】tab，提示：SQL规范性检查通过！

---

## 验证「SQL检查-规范性检查」功能正常_提示_Doris
**优先级**: P1
**前置条件**: 【项目管理-项目设置-操作设置-SQL规范性检查】页面，
1）已选择SQL校验代码规则（选择的规则的影响方式均为提示）：
a）禁止使用 SELECT *
b）代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
c）分区表查询必须带分区
2）生效范围：周期任务/手动任务
3）SQL类型：Doris、OceanBase for Oracle

**步骤**:
1. 进入【数据开发-周期任务】页面，新建Doris任务，输入sql，点击“SQL检查-规范性检查”，sql如下：
2. CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 2 PROPERTIES (     “replication_num“ = “1“ );
3. 修改sql，点击“SQL检查-规范性检查”，sql如下：
4. select * from wytest;
5. 修改sql，点击“SQL检查-规范性检查”，sql如下：
6. --select * from wytest;
7. select id from wytest;

**预期**:
1. 页面底部展示【SQL规范性检查】tab，列表展示一条数据，具体如下：
2. 1）行号：${SQL所对应的行号}
3. 2）SQL：CREATE TABLE IF NOT EXISTS wytest (     id INT,     name VARCHAR(256),     age INT ) DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 10 PROPERTIES (     “replication_num“ = “1“ );
4. 3）触发校验规则：代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
5. 4）校验结果：代码中包含了DDL关键字：create
6. 5）影响：提示
7. 页面底部展示【SQL规范性检查】tab，列表展示一条数据，具体如下：
8. 1）行号：${SQL所对应的行号}
9. 2）SQL：select * from wytest
10. 3）触发校验规则：禁止使用 SELECT *
11. 4）校验结果：代码中含有SELECT * 查询
12. 5）影响：提示
13. 页面底部展示【SQL规范性检查】tab，提示：SQL规范性检查通过！

---

## 验证sql任务编辑器中「SQL检查」显示正确_Doris
**优先级**: P2
**前置条件**: 【项目管理-项目设置-操作设置-SQL规范性检查】页面，
1）已选择SQL校验代码规则：
a）禁止使用 SELECT *
b）代码里面不允许包含对表、分区、列的DDL 语句，除了新增或删除分区
c）分区表查询必须带分区
2）生效范围：周期任务/手动任务
3）SQL类型：Doris、OceanBase for Oracle

**步骤**:
1. 进入【数据开发-周期任务】页面，新建Doris任务，点击“SQL检查”

**预期**:
1. 【SQL检查】下拉列表展示：
2. 1）执行计划
3. 2）规范性检查

---

## 验证编辑SQL规范性检查功能正常
**优先级**: P1
**前置条件**: 【数据资产-数据治理-代码检查-代码检查规则】页面，规则均已开启

**步骤**:
1. 进入【项目管理-项目设置-操作设置-SQL规范性检查】页面，“SQL类型”选择Doris，其余正常填写，点击“确定”

**预期**:
1. SQL规范性检查保存成功，系统给出保存成功提示，配置/数据已持久化，页面更新为最新状态

---

## 验证「SQL类型」显示&交互正确
**优先级**: P2
**前置条件**: 【数据资产-数据治理-代码检查-代码检查规则】页面，规则均已开启

**步骤**:
1. 进入【项目管理-项目设置-操作设置-SQL规范性检查】页面，查看【SQL类型】
2. 选择Doris
3. 取消选择Doris

**预期**:
1. 新增以下选项，默认均为未选择状态：
2. 1）Doris
3. Doris为勾选状态
4. Doris为未勾选状态

---

