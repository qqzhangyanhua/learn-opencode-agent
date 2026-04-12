# 附录 P｜Resume、Branch、Compression 的 Session Lineage 专章：Hermes 怎么把一段对话长成一棵会话树

## 先把会话谱系看成一棵树

很多人第一次看 Hermes 的会话系统时，脑子里默认的模型还是“聊天记录 = 一条线”。但 Hermes 真实做的事情已经不是单纯的一条线，因为系统里同时存在：

- `/resume` 回到旧 session
- `/branch` 从当前 session 分叉一条新路
- `context compression` 把当前过长会话压缩后续到一个新的 `session_id`

一旦这些动作都存在，session 就不再只是“一个 ID 对应一段历史”，而更像一棵带 lineage 的会话树。

这一篇附录就专门回答一个关键问题：

Hermes 怎么通过 `parent_session_id`、`resume`、`branch`、`compression` 这些机制，把一段对话从“线性日志”变成一棵可回溯、可分叉、可续写的会话树？

这一篇主要结合这些源码和测试文件来看：

- `hermes_state.py`
- `cli.py`
- `run_agent.py`
- `gateway/run.py`
- `tests/cli/test_branch_command.py`
- `tests/test_hermes_state.py`
- `tests/gateway/test_session_hygiene.py`

---

## 1. Hermes 最重要的判断：真正可用的 Agent 会话，不会永远是一条直线

先把问题想透。

如果一个 Agent 只能维护单条线性会话，那么一旦你遇到下面这些真实需求，系统就会开始别扭：

- 我想回到上周那段对话继续做，不是从头讲一遍
- 我想从当前上下文试一个新方向，但不想污染原会话
- 当前上下文太长了，我想压缩后继续，但又不想失去旧历史

如果你还坚持“永远只有一个 session，不准分叉”，这些需求最后通常只会退化成粗暴覆盖旧历史、把不同思路揉进同一个 transcript，或者在压缩后直接抹掉原上下文。Hermes 不接受这种退化，它承认会话至少有三种不同演化：

- 回到旧节点继续
- 从当前节点分叉
- 从当前节点压缩后续写

这就是为什么 `SessionDB` schema 里从一开始就有：

- `parent_session_id`

这个字段。

它不是附带信息，而是在告诉你：Hermes 从数据库层就已经把 session lineage 当成正式概念。

---

## 2. `parent_session_id` 的意义，不是“记录上一个 ID”，而是表达会话之间的演化关系

看 `hermes_state.py` 的 schema：

- `sessions` 表里有 `parent_session_id`
- 还有 `idx_sessions_parent` 索引

这说明 Hermes 不是偶尔给某些 session 挂个来源注释，  
而是明确支持：

- session 之间存在 parent-child 关系

这层关系表达的不是“哪个 session 比哪个早”，而是“当前 session 是从哪个 session 演化出来的”，两者差别很大。

### 2.1 时间顺序不能替代 lineage

两个 session 就算时间上先后相邻，也未必是同一条会话链。

比如：

- 一个是 `/branch` 分叉出来的实验路线
- 一个是完全新的 `/new` 会话

时间上都可能挨得很近，但语义完全不同。

所以 Hermes 不用“最近创建的那个”去猜 lineage，  
而是显式存：

- `parent_session_id`

### 2.2 lineage 让很多后续行为变得可计算

一旦 parent-child 关系是正式数据，Hermes 后面就能做很多成熟动作：

- `session_search` 排除当前会话 lineage
- 标题自动编号成同一谱系
- 压缩后保留原 session 可搜索性
- 删除或 prune 老 session 时，把新孩子 orphan 而不是一起炸掉

也就是说，`parent_session_id` 不是为了好看，而是整套 session tree 语义的支点。

---

## 3. `/resume` 不是“复制旧历史出来再聊”，而是把当前入口重新指回旧节点

先看 `cli.py` 和 `gateway/run.py` 里的 `/resume`。

这两个入口实现虽然不完全一样，但核心语义是一样的：

- 找到目标 session
- 结束当前 session
- 把当前入口切回目标 session
- 恢复那条 session 的历史

这一步的关键在于，Hermes 对 `/resume` 的理解不是从旧 session clone 一份新副本，而是重新回到旧 session 那个节点本身。

### 3.1 CLI 里的 `/resume`

在 `cli.py` 里，`_handle_resume_command(...)` 会做这些事：

- 通过 `_resolve_session_by_name_or_id(...)` 找到目标
- `end_session(self.session_id, "resumed_other")`
- 把 `self.session_id` 直接切成 `target_id`
- 用 `get_messages_as_conversation(target_id)` 恢复历史
- `reopen_session(target_id)`，让旧 session 重新变成活动状态

这里最关键的不是“恢复了历史”，而是当前 CLI 入口直接回到了旧 session 的同一个 ID。所以 `/resume` 的本质不是新建 continuation，而是回到旧节点继续工作。

### 3.2 Gateway 里的 `/resume`

`gateway/run.py` 里的 `/resume` 也一样。

它不是新造一个 child session，而是：

- `session_store.switch_session(session_key, target_id)`

这一步的意义在于，当前消息来源对应的入口映射重新指向旧 session。所以 `/resume` 真正改变的是入口当前绑定到哪条 session 线上，而不是 session tree 本身新增了一个节点。

这就是 `/resume` 和 `/branch`、`compression` 最根本的区别。

---

## 4. `/branch` 才是真正的“从当前节点分叉出一条新路线”

再看 `cli.py` 和 `gateway/run.py` 里的 `/branch`。

这两个实现都明确做了一件事：

- 新建一个 `new_session_id`
- `create_session(..., parent_session_id=parent_session_id)`
- 把当前历史复制到新 session
- 当前入口切换到新 session

这就很清楚了。

Hermes 对 `/branch` 的理解不是：

- 给当前 session 起个别名

而是：

- 从当前节点 fork 出一个新的 child session

### 4.1 CLI 的 `/branch`

`cli.py` 里 `parent_session_id = self.session_id`，然后：

- `end_session(self.session_id, "branched")`
- `create_session(..., parent_session_id=parent_session_id)`
- 把 `conversation_history` 全量复制进新 session
- `self.session_id = new_session_id`

`tests/cli/test_branch_command.py` 也把这些行为钉死了：

- 新 session 必须被创建
- 所有消息都要复制
- 新 session 必须带 `parent_session_id`
- 原 session 要以 `"branched"` 结束

这组测试很重要，因为它证明 Hermes 真正想要的不是“切到一个新 ID”，而是保留原节点、复制当前上下文，再从这个点沿另一条路线继续；这才是典型的会话分叉语义。

### 4.2 Gateway 的 `/branch`

Gateway 里也一样。

`gateway/run.py` 会：

- 先 load 当前 transcript
- `create_session(..., parent_session_id=current_entry.session_id)`
- 把历史复制进新 session
- `session_store.switch_session(session_key, new_session_id)`

也就是说，哪怕入口不同，Hermes 对 `/branch` 的语义都保持一致：

- 它不是 resume
- 它不是 overwrite
- 它就是 fork

很多系统嘴上叫 branch，实际上只是新开一个空会话，或者覆盖当前指针。Hermes 没偷懒，它真的把 branch 做成了 lineage 上的新 child。

---

## 5. `compression` 不是“删旧历史”，而是“从当前节点切出一个压缩后的 continuation child”

再看 `run_agent.py` 里的 `_compress_context(...)`。

这段实现几乎把 Hermes 对 session lineage 的理解写成了白纸黑字。

在压缩完成后，它会做：

- `end_session(self.session_id, "compression")`
- 保存 `old_session_id`
- 生成新的 `self.session_id`
- `create_session(..., parent_session_id=old_session_id)`

这说明 compression 在 Hermes 里根本不是原地改写当前 session，而是结束旧 session，再新建一个 child session 作为压缩后的 continuation。

### 5.1 为什么 compression 必须长出新节点

因为 Hermes 想同时保住两件事：

- 当前运行能继续
- 原始历史仍然完整可搜索

如果压缩是原地覆盖，就很难同时保住当前运行可继续和原始历史仍可搜索这两件事。旧历史一旦被重写，`session_search` 会失去原始素材，用户也难以追溯压缩前的完整上下文。所以 Hermes 选择压缩后另起一个 child session，让旧 session 仍然是完整历史节点，而新 session 则是压缩后的工作 continuation。

### 5.2 Gateway 侧也明确承认 compression 会切换 session_id

`gateway/run.py` 在手动压缩路径里专门写了注释：

- `_compress_context` 已经结束旧 session
- 并创建新的 `session_id`
- 原历史继续保留在 SQLite 里可搜索
- 压缩后的消息写进 new session

`tests/gateway/test_session_hygiene.py` 也在模拟这一点：

- fake compress agent 压缩后会生成新的 `session_id`

这说明“压缩 = lineage continuation”不是某个入口偶然行为，而是 Hermes 整体一致的会话语义。

---

## 6. `/resume`、`/branch`、`compression` 这三种动作，本质上对应三种完全不同的会话树操作

如果把前面几段揉到一起，你会发现 Hermes 其实已经把会话树操作分得很清楚了。

### 6.1 `/resume`：切换当前入口指针，回到旧节点

特点是：

- 不新建 child
- 不复制历史
- 当前入口重新绑定到已存在节点

### 6.2 `/branch`：复制当前状态，生成一个 child 分叉

特点是：

- 新建 child session
- 复制当前历史
- 原节点保留，当前入口切到新分支

### 6.3 `compression`：不复制原文全量，而是基于当前节点生成压缩 continuation child

特点是：

- 新建 child session
- 原节点结束但保留
- 新节点拿的是压缩后的工作状态，不是原始全量 transcript

这三者如果混着做，系统很快就会乱。

Hermes 最值得学的一点，就是它把这三种操作在语义上分得非常干净。

---

## 7. Hermes 连标题和列表展示，都在顺着 session lineage 来设计

lineage 在 Hermes 里不是只活在数据库字段里。

它连标题和会话列表都受影响。

### 7.1 标题会按 lineage 自动编号

看 `hermes_state.py` 的 `get_next_title_in_lineage(...)`：

- `my project` → `my project #2`
- 再下一次会变成 `my project #3`

`tests/test_hermes_state.py` 也专门守了这些行为：

- 没有同名时直接用 base title
- 有原标题时第一次 continuation 是 `#2`
- 传入已经编号的 title 时，也会剥掉旧编号再继续增长

这说明 Hermes 对 branch / continuation 的理解不是“随机新会话”，  
而是：

- 同一谱系上的后续节点

所以标题编号本质上也是 lineage 的 UI 外显。

### 7.2 列表默认隐藏 child sessions

再看 `list_sessions_rich(...)`：

- 默认 `include_children=False`
- 也就是默认只列 root sessions

这一步很成熟。因为如果把 compression child、delegation child、各种 continuation 全摊给用户，会话列表很快就会变成技术细节噪音。Hermes 所以默认把 child 隐起来，只让主线 session 先可见。这说明 lineage 是系统内部的正式结构，但用户默认看到的仍应是较稳定的主会话视图。

---

## 8. 删除和 prune 时不会把整条树粗暴炸掉，进一步说明 Hermes 真把 lineage 当结构，而不是注释

如果 `parent_session_id` 只是一个装饰字段，那删除或清理 session 时很容易直接把整串孩子都搞坏。

但 `tests/test_hermes_state.py` 恰恰在守另一个更成熟的行为：

- 删除 parent 时，child 会被 orphan，而不是跟着炸掉
- prune 老 session 时，仍然保留较新的 child
- 多层链里，如果老祖先被删了，后面的新节点会把 `parent_session_id` 置空继续存活

这说明 Hermes 对 lineage 的理解非常现实：它想保留结构，但不把结构完整性绑在“孩子必须跟着父亲一起死”这种僵硬规则上。更重要的是，仍然有价值的新 session 不要因为上游旧节点清理了就一起消失。

---

## 9. 读完这一篇记住 5 点

看到这里，我认为最值得记住的是下面五条。

### 9.1 会话不是只能“继续追加”，真实 Agent 需要支持回到旧节点、分叉、压缩续写

如果你的会话模型永远只有 append，一旦系统复杂起来，很快就会失去可维护性。

### 9.2 `resume`、`branch`、`compression` 一定要区分语义

它们看起来都像“从某段历史继续”，但本质完全不同：

- `resume` 是回到旧节点
- `branch` 是复制并分叉
- `compression` 是压缩后续写

### 9.3 `parent_session_id` 值钱的地方，不是能回头看，而是能让系统正确做很多后续动作

比如：

- 搜索排除当前 lineage
- 标题自动编号
- 列表默认隐藏 child
- prune 时正确 orphan

这说明 lineage 结构一旦建好，后面很多行为都会跟着变稳。

### 9.4 压缩如果会破坏原文，就应该长出新节点而不是覆盖旧节点

这是 Hermes 非常值得抄的一点。

压缩不是“清理旧垃圾”，而是“生成一个更短但还能继续工作的 continuation”。

### 9.5 复杂结构可以存在于内部，但默认用户视图应该保持克制

内部是树，外部默认看到主线 session。

这比把所有技术节点都摊给用户更可用。

---

## 最后把 lineage 收住

Hermes 的 session system 真正高级的地方，不是它有 `SessionDB`，而是它已经开始用 `parent_session_id` 把会话理解成一棵可以演化的树。

在这棵树里：

- `/resume` 是回到旧节点
- `/branch` 是从当前节点分叉 child
- `compression` 是从当前节点生成压缩后的 continuation child

而标题编号、列表展示、搜索排除、删除与 prune 策略，都会顺着这棵树的结构一起工作。

对想做自己智能体系统的人来说，这一章可以浓缩成一句话：只要你的 Agent 真的要长期工作，会话就迟早不再是一条线。越早把它当成一棵有 lineage 的树来设计，后面的搜索、恢复、分叉和压缩就越不会互相打架。
