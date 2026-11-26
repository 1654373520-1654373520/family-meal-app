/* ============================================================
 * 家庭每周点菜助手 - 菜品数据库
 * 说明：
 *   - 每道菜可有多个标签 (tags)，即支持跨分类。
 *   - roles 表示该菜可充当的角色：main=主菜 / side=配菜 / staple=主食。
 *   - ingredients 用于自动生成采购清单；qty 为单次烹饪的基础用量，
 *     null 表示“适量”。
 * ============================================================ */

// 分类（页面一横向滑动栏）
const CATEGORIES = [
  { key: 'all',        label: '全部' },
  { key: 'chicken',    label: '鸡肉类' },
  { key: 'pork',       label: '猪肉类' },
  { key: 'beef',       label: '牛肉类' },
  { key: 'seafood',    label: '虾类及海鲜' },
  { key: 'egg',        label: '鸡蛋类' },
  { key: 'vegetable',  label: '蔬菜类' },
  { key: 'braised',    label: '煲仔及焖菜' },
  { key: 'staple',     label: '主食及粉面' },
  { key: 'takeout',    label: '外卖及其他' },
];

const CATEGORY_LABEL = {};
CATEGORIES.forEach(c => { CATEGORY_LABEL[c.key] = c.label; });

// 采购清单里的食材分类
const ING_CAT = {
  meat:    '肉禽蛋',
  seafood: '海鲜水产',
  veg:     '蔬菜菌菇',
  tofu:    '豆制品',
  staple:  '主食杂粮',
  season:  '调味料',
  other:   '其他',
};

// 一周七天
const DAYS = [
  { id: 'mon', label: '星期一' },
  { id: 'tue', label: '星期二' },
  { id: 'wed', label: '星期三' },
  { id: 'thu', label: '星期四' },
  { id: 'fri', label: '星期五' },
  { id: 'sat', label: '星期六' },
  { id: 'sun', label: '星期日' },
];

/* ---------- 可替换的图片配置（不要把图片地址写死在业务逻辑里） ----------
 * 将菜品 id 映射到真实图片地址（本地相对路径或远程 URL 均可），留空则使用
 * 统一风格的 emoji 占位图。
 * 例：'d1': 'images/heijiao-jipa.jpg'
 */
const IMAGE_CONFIG = {};

// 根据菜品取图片 URL；没有配置则返回 null（渲染时用 emoji 占位）
function dishImage(dish) {
  return IMAGE_CONFIG[dish.id] || null;
}

/* ============================================================
 * 菜品列表（完整录入，共 58 道不同菜品）
 * 已去除重复名称，同时保留其分类属性（多标签）。
 * ============================================================ */
const DISHES = [
  // ---------- 鸡肉类 ----------
  { id: 'd1',  name: '黑椒鸡扒',       emoji: '🍗', tags: ['chicken'], roles: ['main'],
    desc: '香煎鸡扒，黑椒汁浓郁，外焦里嫩。',
    ingredients: [
      { name: '鸡腿肉', qty: 2, unit: '块', cat: 'meat' },
      { name: '洋葱',   qty: 0.5, unit: '个', cat: 'veg' },
      { name: '西兰花', qty: 1, unit: '棵', cat: 'veg' },
      { name: '黑胡椒', qty: null, unit: '', cat: 'season' },
    ] },
  { id: 'd2',  name: '奥尔良鸡排',     emoji: '🍗', tags: ['chicken'], roles: ['main'],
    desc: '甜辣风味烤鸡排，奥尔良腌料入味。',
    ingredients: [
      { name: '鸡腿排', qty: 2, unit: '块', cat: 'meat' },
      { name: '奥尔良腌料', qty: null, unit: '', cat: 'season' },
      { name: '生菜',   qty: null, unit: '', cat: 'veg' },
    ] },
  { id: 'd3',  name: '奇味鸡翅',       emoji: '🍗', tags: ['chicken'], roles: ['main'],
    desc: '蜜汁鸡翅，咸甜适中，大人小孩都爱。',
    ingredients: [
      { name: '鸡中翅', qty: 8, unit: '只', cat: 'meat' },
      { name: '蜂蜜',   qty: null, unit: '', cat: 'season' },
      { name: '生抽',   qty: null, unit: '', cat: 'season' },
    ] },
  { id: 'd4',  name: '啫啫鸡',         emoji: '🍲', tags: ['chicken', 'braised'], roles: ['main'],
    desc: '砂锅啫啫鸡，镬气十足，酱香浓郁。',
    ingredients: [
      { name: '鸡块', qty: 0.5, unit: '只', cat: 'meat' },
      { name: '洋葱', qty: 0.5, unit: '个', cat: 'veg' },
      { name: '青椒', qty: 1, unit: '个', cat: 'veg' },
      { name: '姜葱蒜', qty: null, unit: '', cat: 'season' },
    ] },
  { id: 'd5',  name: '黄焖鸡',         emoji: '🍲', tags: ['chicken', 'braised'], roles: ['main'],
    desc: '黄焖鸡配香菇土豆，汤汁拌饭一绝。',
    ingredients: [
      { name: '鸡腿', qty: 2, unit: '只', cat: 'meat' },
      { name: '香菇', qty: 6, unit: '朵', cat: 'veg' },
      { name: '土豆', qty: 2, unit: '个', cat: 'veg' },
      { name: '青椒', qty: 1, unit: '个', cat: 'veg' },
    ] },
  { id: 'd6',  name: '番茄土豆油焖鸡', emoji: '🥘', tags: ['chicken', 'braised'], roles: ['main'],
    desc: '番茄土豆焖鸡，酸甜开胃。',
    ingredients: [
      { name: '鸡腿', qty: 2, unit: '只', cat: 'meat' },
      { name: '番茄', qty: 2, unit: '个', cat: 'veg' },
      { name: '土豆', qty: 2, unit: '个', cat: 'veg' },
    ] },
  { id: 'd7',  name: '盐焗鸡',         emoji: '🍗', tags: ['chicken'], roles: ['main'],
    desc: '盐焗鸡，皮爽肉滑，咸香入味。',
    ingredients: [
      { name: '三黄鸡', qty: 0.5, unit: '只', cat: 'meat' },
      { name: '盐焗粉', qty: null, unit: '', cat: 'season' },
      { name: '姜葱',   qty: null, unit: '', cat: 'season' },
    ] },
  { id: 'd8',  name: '豉油鸡',         emoji: '🍗', tags: ['chicken'], roles: ['main'],
    desc: '豉油鸡，色泽红亮，酱香回甜。',
    ingredients: [
      { name: '鸡',   qty: 0.5, unit: '只', cat: 'meat' },
      { name: '生抽', qty: null, unit: '', cat: 'season' },
      { name: '冰糖', qty: null, unit: '', cat: 'season' },
    ] },
  { id: 'd9',  name: '豉油皇鸡腿',     emoji: '🍗', tags: ['chicken'], roles: ['main'],
    desc: '豉油皇鸡腿，酱香浓郁，肉质嫩滑。',
    ingredients: [
      { name: '鸡腿', qty: 4, unit: '只', cat: 'meat' },
      { name: '豉油', qty: null, unit: '', cat: 'season' },
      { name: '姜葱', qty: null, unit: '', cat: 'season' },
    ] },
  { id: 'd10', name: '酸辣柠檬鸡腿',   emoji: '🍗', tags: ['chicken'], roles: ['main'],
    desc: '酸辣柠檬鸡腿，清爽开胃不腻口。',
    ingredients: [
      { name: '鸡腿',   qty: 2, unit: '只', cat: 'meat' },
      { name: '柠檬',   qty: 1, unit: '个', cat: 'other' },
      { name: '小米椒', qty: 2, unit: '个', cat: 'veg' },
      { name: '蒜',     qty: null, unit: '', cat: 'season' },
    ] },
  { id: 'd11', name: '豆豉蒸鸡',       emoji: '🍗', tags: ['chicken'], roles: ['main'],
    desc: '豆豉蒸鸡，豉香浓郁，蒸制少油。',
    ingredients: [
      { name: '鸡块', qty: 0.5, unit: '只', cat: 'meat' },
      { name: '豆豉', qty: null, unit: '', cat: 'season' },
      { name: '姜',   qty: null, unit: '', cat: 'season' },
    ] },
  { id: 'd12', name: '葱姜鸡',         emoji: '🍗', tags: ['chicken'], roles: ['main'],
    desc: '白切葱姜鸡，原汁原味，葱香扑鼻。',
    ingredients: [
      { name: '鸡', qty: 0.5, unit: '只', cat: 'meat' },
      { name: '葱', qty: null, unit: '', cat: 'veg' },
      { name: '姜', qty: null, unit: '', cat: 'season' },
    ] },
  { id: 'd13', name: '年例炸鸡翅',     emoji: '🍗', tags: ['chicken'], roles: ['main'],
    desc: '年例炸鸡翅，香脆金黄，节日气氛拉满。',
    ingredients: [
      { name: '鸡翅', qty: 8, unit: '只', cat: 'meat' },
      { name: '鸡蛋', qty: 1, unit: '个', cat: 'meat' },
      { name: '炸粉', qty: null, unit: '', cat: 'staple' },
    ] },

  // ---------- 猪肉类 ----------
  { id: 'd14', name: '黑椒猪扒',       emoji: '🥩', tags: ['pork'], roles: ['main'],
    desc: '黑椒猪扒，黑椒汁配嫩猪扒，经典下饭。',
    ingredients: [
      { name: '猪扒', qty: 2, unit: '块', cat: 'meat' },
      { name: '洋葱', qty: 0.5, unit: '个', cat: 'veg' },
      { name: '黑胡椒', qty: null, unit: '', cat: 'season' },
    ] },
  { id: 'd15', name: '干锅菜花炒肉',   emoji: '🥘', tags: ['pork', 'braised'], roles: ['main'],
    desc: '干锅花菜炒肉，香辣下饭，锅气十足。',
    ingredients: [
      { name: '五花肉', qty: 200, unit: 'g', cat: 'meat' },
      { name: '菜花',   qty: 1, unit: '个', cat: 'veg' },
      { name: '青红椒', qty: null, unit: '', cat: 'veg' },
    ] },
  { id: 'd16', name: '豆豉豆角炒肉',   emoji: '🥬', tags: ['pork', 'vegetable'], roles: ['main'],
    desc: '豆豉豆角炒肉，家常下饭。',
    ingredients: [
      { name: '豆角', qty: 300, unit: 'g', cat: 'veg' },
      { name: '瘦肉', qty: 150, unit: 'g', cat: 'meat' },
      { name: '豆豉', qty: null, unit: '', cat: 'season' },
    ] },
  { id: 'd17', name: '土豆丝红萝卜丝炒肉', emoji: '🥔', tags: ['pork', 'vegetable'], roles: ['main'],
    desc: '土豆丝萝卜丝炒肉丝，清爽家常。',
    ingredients: [
      { name: '土豆',   qty: 2, unit: '个', cat: 'veg' },
      { name: '胡萝卜', qty: 1, unit: '根', cat: 'veg' },
      { name: '瘦肉',   qty: 150, unit: 'g', cat: 'meat' },
    ] },
  { id: 'd18', name: '叉烧',           emoji: '🍖', tags: ['pork'], roles: ['main'],
    desc: '蜜汁叉烧，色泽红亮，甜咸适口。',
    ingredients: [
      { name: '梅花肉', qty: 500, unit: 'g', cat: 'meat' },
      { name: '叉烧酱', qty: null, unit: '', cat: 'season' },
      { name: '蜂蜜',   qty: null, unit: '', cat: 'season' },
    ] },
  { id: 'd19', name: '咕噜肉',         emoji: '🍖', tags: ['pork'], roles: ['main'],
    desc: '酸甜咕噜肉，菠萝提香，开胃解腻。',
    ingredients: [
      { name: '里脊肉', qty: 300, unit: 'g', cat: 'meat' },
      { name: '菠萝',   qty: 0.5, unit: '个', cat: 'other' },
      { name: '青红椒', qty: null, unit: '', cat: 'veg' },
      { name: '番茄酱', qty: null, unit: '', cat: 'season' },
    ] },
  { id: 'd20', name: '鱼香肉丝',       emoji: '🥢', tags: ['pork'], roles: ['main'],
    desc: '鱼香肉丝，酸甜微辣，经典川味。',
    ingredients: [
      { name: '里脊肉', qty: 200, unit: 'g', cat: 'meat' },
      { name: '木耳',   qty: null, unit: '', cat: 'veg' },
      { name: '胡萝卜', qty: 1, unit: '根', cat: 'veg' },
      { name: '青椒',   qty: 1, unit: '个', cat: 'veg' },
    ] },
  { id: 'd21', name: '小瓜炒肉',       emoji: '🥒', tags: ['pork', 'vegetable'], roles: ['main'],
    desc: '西葫芦炒肉片，清淡爽口。',
    ingredients: [
      { name: '西葫芦', qty: 2, unit: '个', cat: 'veg' },
      { name: '瘦肉',   qty: 150, unit: 'g', cat: 'meat' },
      { name: '蒜',     qty: null, unit: '', cat: 'season' },
    ] },
  { id: 'd22', name: '胡萝卜蒸肉饼',   emoji: '🥕', tags: ['pork'], roles: ['main'],
    desc: '胡萝卜蒸肉饼，鲜嫩不腻，蒸制健康。',
    ingredients: [
      { name: '肉末',   qty: 250, unit: 'g', cat: 'meat' },
      { name: '胡萝卜', qty: 1, unit: '根', cat: 'veg' },
      { name: '鸡蛋',   qty: 1, unit: '个', cat: 'meat' },
    ] },

  { id: 'd24', name: '肉丝炒菜心',     emoji: '🥬', tags: ['pork', 'vegetable'], roles: ['main', 'side'],
    desc: '菜心炒肉丝，清甜脆嫩。',
    ingredients: [
      { name: '菜心', qty: 400, unit: 'g', cat: 'veg' },
      { name: '瘦肉', qty: 150, unit: 'g', cat: 'meat' },
    ] },
  { id: 'd25', name: '芥兰炒腊肉',     emoji: '🥬', tags: ['pork', 'vegetable'], roles: ['main'],
    desc: '芥兰炒腊肉，腊香浓郁，脆嫩爽口。',
    ingredients: [
      { name: '芥兰', qty: 400, unit: 'g', cat: 'veg' },
      { name: '腊肉', qty: 150, unit: 'g', cat: 'meat' },
    ] },
  { id: 'd26', name: '莴笋炒猪肉',     emoji: '🥬', tags: ['pork', 'vegetable'], roles: ['main'],
    desc: '莴笋炒肉片，清脆爽口。',
    ingredients: [
      { name: '莴笋', qty: 2, unit: '根', cat: 'veg' },
      { name: '瘦肉', qty: 150, unit: 'g', cat: 'meat' },
    ] },
  { id: 'd27', name: '青瓜玉米炒腊肉', emoji: '🥒', tags: ['pork', 'vegetable'], roles: ['main'],
    desc: '青瓜玉米炒腊肉，清甜腊香。',
    ingredients: [
      { name: '青瓜', qty: 1, unit: '根', cat: 'veg' },
      { name: '玉米', qty: 1, unit: '根', cat: 'veg' },
      { name: '腊肉', qty: 150, unit: 'g', cat: 'meat' },
    ] },
  { id: 'd28', name: '肉片焖腐竹',     emoji: '🥘', tags: ['pork', 'braised'], roles: ['main'],
    desc: '肉片焖腐竹，腐竹吸汁，软糯入味。',
    ingredients: [
      { name: '腐竹', qty: 100, unit: 'g', cat: 'tofu' },
      { name: '瘦肉', qty: 150, unit: 'g', cat: 'meat' },
      { name: '冬菇', qty: null, unit: '', cat: 'veg' },
    ] },
  { id: 'd29', name: '莲藕荷兰豆炒胡萝卜（荷塘小炒）', emoji: '🥬', tags: ['vegetable'], roles: ['side'],
    desc: '荷塘小炒，莲藕荷兰豆清脆爽口。',
    ingredients: [
      { name: '莲藕',   qty: 1, unit: '节', cat: 'veg' },
      { name: '荷兰豆', qty: 150, unit: 'g', cat: 'veg' },
      { name: '胡萝卜', qty: 0.5, unit: '根', cat: 'veg' },
      { name: '木耳',   qty: null, unit: '', cat: 'veg' },
    ] },

  // ---------- 牛肉类 ----------
  { id: 'd30', name: '黑椒土豆牛肉粒', emoji: '🥔', tags: ['beef'], roles: ['main'],
    desc: '黑椒土豆牛肉粒，嫩滑香浓。',
    ingredients: [
      { name: '牛肉', qty: 300, unit: 'g', cat: 'meat' },
      { name: '土豆', qty: 2, unit: '个', cat: 'veg' },
      { name: '洋葱', qty: 0.5, unit: '个', cat: 'veg' },
      { name: '黑胡椒', qty: null, unit: '', cat: 'season' },
    ] },
  { id: 'd31', name: '双葱炒牛肉',     emoji: '🧅', tags: ['beef'], roles: ['main'],
    desc: '大葱洋葱双葱炒牛肉，葱香浓郁。',
    ingredients: [
      { name: '牛肉', qty: 250, unit: 'g', cat: 'meat' },
      { name: '大葱', qty: 1, unit: '根', cat: 'veg' },
      { name: '洋葱', qty: 0.5, unit: '个', cat: 'veg' },
    ] },
  { id: 'd32', name: '莴笋炒牛肉',     emoji: '🥬', tags: ['beef'], roles: ['main'],
    desc: '莴笋炒牛肉，清脆嫩滑。',
    ingredients: [
      { name: '牛肉', qty: 250, unit: 'g', cat: 'meat' },
      { name: '莴笋', qty: 2, unit: '根', cat: 'veg' },
    ] },

  // ---------- 虾类及海鲜 ----------
  { id: 'd33', name: '蒜蓉粉丝虾',     emoji: '🦐', tags: ['seafood'], roles: ['main'],
    desc: '蒜蓉粉丝蒸虾，鲜香浓郁。',
    ingredients: [
      { name: '虾',   qty: 400, unit: 'g', cat: 'seafood' },
      { name: '粉丝', qty: 1, unit: '把', cat: 'staple' },
      { name: '蒜',   qty: 1, unit: '头', cat: 'season' },
      { name: '葱',   qty: null, unit: '', cat: 'veg' },
    ] },
  { id: 'd34', name: '椒盐虾',         emoji: '🦐', tags: ['seafood'], roles: ['main'],
    desc: '椒盐虾，香脆咸鲜，外酥里嫩。',
    ingredients: [
      { name: '虾',   qty: 400, unit: 'g', cat: 'seafood' },
      { name: '椒盐', qty: null, unit: '', cat: 'season' },
      { name: '蒜',   qty: null, unit: '', cat: 'season' },
    ] },
  { id: 'd35', name: '西兰花炒虾仁',   emoji: '🥦', tags: ['seafood'], roles: ['main'],
    desc: '西兰花炒虾仁，清爽低脂。',
    ingredients: [
      { name: '虾仁',   qty: 250, unit: 'g', cat: 'seafood' },
      { name: '西兰花', qty: 1, unit: '个', cat: 'veg' },
    ] },
  { id: 'd51', name: '豆豉鲮鱼',       emoji: '🐟', tags: ['seafood'], roles: ['main'],
    desc: '豆豉鲮鱼，豉香浓郁，配饭配粥皆宜。',
    ingredients: [
      { name: '豆豉鲮鱼罐头', qty: 1, unit: '罐', cat: 'seafood' },
    ] },

  // ---------- 鸡蛋类 ----------
  { id: 'd36', name: '番茄炒蛋',       emoji: '🍅', tags: ['egg'], roles: ['main', 'side'],
    desc: '番茄炒蛋，酸甜开胃，国民家常菜。',
    ingredients: [
      { name: '番茄', qty: 3, unit: '个', cat: 'veg' },
      { name: '鸡蛋', qty: 3, unit: '个', cat: 'meat' },
      { name: '葱',   qty: null, unit: '', cat: 'veg' },
    ] },
  { id: 'd37', name: '豆豉凉瓜煎蛋',   emoji: '🥚', tags: ['egg'], roles: ['main', 'side'],
    desc: '豆豉凉瓜煎蛋，清热去火。',
    ingredients: [
      { name: '苦瓜', qty: 1, unit: '根', cat: 'veg' },
      { name: '鸡蛋', qty: 3, unit: '个', cat: 'meat' },
      { name: '豆豉', qty: null, unit: '', cat: 'season' },
    ] },
  { id: 'd38', name: '蒸水蛋',         emoji: '🥚', tags: ['egg'], roles: ['side'],
    desc: '蒸水蛋，嫩滑如布丁，老少皆宜。',
    ingredients: [
      { name: '鸡蛋', qty: 3, unit: '个', cat: 'meat' },
      { name: '葱',   qty: null, unit: '', cat: 'veg' },
    ] },
  { id: 'd39', name: '韭黄炒蛋',       emoji: '🥚', tags: ['egg'], roles: ['main', 'side'],
    desc: '韭黄炒蛋，鲜香嫩滑。',
    ingredients: [
      { name: '韭黄', qty: 200, unit: 'g', cat: 'veg' },
      { name: '鸡蛋', qty: 3, unit: '个', cat: 'meat' },
    ] },
  { id: 'd40', name: '虾仁煎蛋',       emoji: '🦐', tags: ['egg', 'seafood'], roles: ['main', 'side'],
    desc: '虾仁煎蛋，鲜嫩弹牙。',
    ingredients: [
      { name: '虾仁', qty: 150, unit: 'g', cat: 'seafood' },
      { name: '鸡蛋', qty: 3, unit: '个', cat: 'meat' },
    ] },
  { id: 'd41', name: '五柳炸蛋',       emoji: '🥚', tags: ['egg'], roles: ['main'],
    desc: '五柳炸蛋，酸甜开胃，蛋香四溢。',
    ingredients: [
      { name: '鸡蛋',   qty: 4, unit: '个', cat: 'meat' },
      { name: '五柳菜', qty: null, unit: '', cat: 'veg' },
      { name: '番茄酱', qty: null, unit: '', cat: 'season' },
    ] },
  { id: 'd42', name: '青椒炒鸡蛋',     emoji: '🥚', tags: ['egg'], roles: ['main', 'side'],
    desc: '青椒炒鸡蛋，简单快手。',
    ingredients: [
      { name: '青椒', qty: 2, unit: '个', cat: 'veg' },
      { name: '鸡蛋', qty: 3, unit: '个', cat: 'meat' },
    ] },

  // ---------- 蔬菜类（含豆制品） ----------
  { id: 'd43', name: '红烧茄子',       emoji: '🍆', tags: ['vegetable'], roles: ['side'],
    desc: '红烧茄子，软糯咸香，下饭神器。',
    ingredients: [
      { name: '茄子', qty: 2, unit: '个', cat: 'veg' },
      { name: '蒜',   qty: null, unit: '', cat: 'season' },
      { name: '生抽', qty: null, unit: '', cat: 'season' },
    ] },
  { id: 'd44', name: '蒜蓉菜心',       emoji: '🥬', tags: ['vegetable'], roles: ['side'],
    desc: '蒜蓉菜心，清甜爽口。',
    ingredients: [
      { name: '菜心', qty: 400, unit: 'g', cat: 'veg' },
      { name: '蒜',   qty: null, unit: '', cat: 'season' },
    ] },
  { id: 'd45', name: '节瓜粉丝煲',     emoji: '🍲', tags: ['vegetable', 'braised', 'staple'], roles: ['side'],
    desc: '节瓜粉丝煲，清甜鲜香，粉丝吸汁。',
    ingredients: [
      { name: '节瓜', qty: 1, unit: '个', cat: 'veg' },
      { name: '粉丝', qty: 1, unit: '把', cat: 'staple' },
      { name: '虾米', qty: null, unit: '', cat: 'seafood' },
    ] },
  { id: 'd46', name: 'XO酱茄子',       emoji: '🍆', tags: ['vegetable'], roles: ['side'],
    desc: 'XO酱茄子，酱香浓郁，鲜味十足。',
    ingredients: [
      { name: '茄子',  qty: 2, unit: '个', cat: 'veg' },
      { name: 'XO酱',  qty: null, unit: '', cat: 'season' },
      { name: '蒜',    qty: null, unit: '', cat: 'season' },
    ] },
  { id: 'd47', name: '肉末蒸南瓜',     emoji: '🎃', tags: ['vegetable', 'pork'], roles: ['side', 'main'],
    desc: '肉末蒸南瓜，香甜软糯。',
    ingredients: [
      { name: '南瓜', qty: 0.5, unit: '个', cat: 'veg' },
      { name: '肉末', qty: 150, unit: 'g', cat: 'meat' },
    ] },
  { id: 'd48', name: '腐乳通菜',       emoji: '🥬', tags: ['vegetable'], roles: ['side'],
    desc: '腐乳通菜，腐乳香浓，空心菜爽脆。',
    ingredients: [
      { name: '通菜', qty: 400, unit: 'g', cat: 'veg' },
      { name: '腐乳', qty: 2, unit: '块', cat: 'tofu' },
      { name: '蒜',   qty: null, unit: '', cat: 'season' },
    ] },
  { id: 'd49', name: '芽菜炒龙口粉丝', emoji: '🥢', tags: ['vegetable', 'staple'], roles: ['side'],
    desc: '豆芽炒粉丝，爽脆弹牙。',
    ingredients: [
      { name: '绿豆芽', qty: 200, unit: 'g', cat: 'veg' },
      { name: '粉丝',   qty: 1, unit: '把', cat: 'staple' },
      { name: '葱',     qty: null, unit: '', cat: 'veg' },
    ] },
  { id: 'd50', name: '白菜腐竹煲',     emoji: '🥬', tags: ['vegetable', 'braised'], roles: ['side'],
    desc: '白菜腐竹煲，清淡鲜甜。',
    ingredients: [
      { name: '白菜', qty: 0.5, unit: '棵', cat: 'veg' },
      { name: '腐竹', qty: 100, unit: 'g', cat: 'tofu' },
      { name: '冬菇', qty: null, unit: '', cat: 'veg' },
    ] },

  // ---------- 其他主食及外卖 ----------
  { id: 'd54', name: '泰式打抛饭',     emoji: '🍛', tags: ['staple', 'takeout'], roles: ['staple', 'main'],
    desc: '泰式打抛饭，罗勒香浓，微辣开胃。',
    ingredients: [
      { name: '肉末',   qty: 200, unit: 'g', cat: 'meat' },
      { name: '九层塔', qty: null, unit: '', cat: 'veg' },
      { name: '鸡蛋',   qty: 1, unit: '个', cat: 'meat' },
      { name: '大米',   qty: 2, unit: '碗', cat: 'staple' },
    ] },
  { id: 'd55', name: '咖喱鱼蛋',       emoji: '🍢', tags: ['takeout'], roles: ['side', 'main'],
    desc: '咖喱鱼蛋，港式街头风味。',
    ingredients: [
      { name: '鱼蛋', qty: 300, unit: 'g', cat: 'seafood' },
      { name: '咖喱', qty: null, unit: '', cat: 'season' },
      { name: '土豆', qty: 1, unit: '个', cat: 'veg' },
    ] },
  { id: 'd56', name: '烤乳鸽',         emoji: '🐦', tags: ['takeout'], roles: ['main'],
    desc: '烤乳鸽，皮脆肉嫩，广式烧味。',
    ingredients: [
      { name: '乳鸽', qty: 1, unit: '只', cat: 'meat' },
      { name: '腌料', qty: null, unit: '', cat: 'season' },
    ] },
  { id: 'd57', name: '螺蛳粉',         emoji: '🍜', tags: ['staple'], roles: ['staple'],
    desc: '螺蛳粉，酸辣鲜香，嗦粉快乐。',
    ingredients: [
      { name: '螺蛳粉', qty: 1, unit: '包', cat: 'staple' },
      { name: '青菜',   qty: null, unit: '', cat: 'veg' },
      { name: '花生',   qty: null, unit: '', cat: 'other' },
    ] },
  { id: 'd58', name: '麦当劳',         emoji: '🍟', tags: ['takeout'], roles: ['staple'],
    desc: '麦当劳外卖，薯条汉堡快乐餐。',
    ingredients: [
      { name: '汉堡', qty: 1, unit: '个', cat: 'staple' },
      { name: '薯条', qty: 1, unit: '份', cat: 'staple' },
      { name: '可乐', qty: 1, unit: '杯', cat: 'other' },
    ] },
  { id: 'd59', name: 'KFC',            emoji: '🍗', tags: ['takeout'], roles: ['staple'],
    desc: '肯德基外卖，炸鸡快乐餐。',
    ingredients: [
      { name: '炸鸡', qty: 1, unit: '份', cat: 'meat' },
      { name: '薯条', qty: 1, unit: '份', cat: 'staple' },
      { name: '可乐', qty: 1, unit: '杯', cat: 'other' },
    ] },
  { id: 'd60', name: '腊味腊肠煲仔饭', emoji: '🍚', tags: ['staple', 'braised'], roles: ['staple'],
    desc: '腊味煲仔饭，腊肠油香，锅巴香脆。',
    ingredients: [
      { name: '腊肠', qty: 2, unit: '条', cat: 'meat' },
      { name: '腊肉', qty: null, unit: '', cat: 'meat' },
      { name: '大米', qty: 1, unit: '杯', cat: 'staple' },
      { name: '青菜', qty: null, unit: '', cat: 'veg' },
    ] },
  { id: 'd61', name: '辣鸡沙煲粉',     emoji: '🍜', tags: ['staple', 'braised'], roles: ['staple'],
    desc: '辣鸡沙煲粉，砂锅煮粉，香辣过瘾。',
    ingredients: [
      { name: '米粉', qty: 1, unit: '把', cat: 'staple' },
      { name: '鸡肉', qty: 150, unit: 'g', cat: 'meat' },
      { name: '青菜', qty: null, unit: '', cat: 'veg' },
      { name: '辣椒', qty: null, unit: '', cat: 'veg' },
    ] },
];

// 便于按 id 快速查找
const DISH_MAP = {};
DISHES.forEach(d => { DISH_MAP[d.id] = d; });

function findDish(id) { return DISH_MAP[id] || null; }

// 获取菜品所属主要肉类/荤素类型（用于随机点菜的多样性约束）
const MEAT_ORDER = ['chicken', 'pork', 'beef', 'seafood', 'egg', 'vegetable', 'staple', 'takeout'];
function meatOf(dish) {
  if (!dish) return 'other';
  for (const t of MEAT_ORDER) {
    if (dish.tags.includes(t)) return t;
  }
  return 'other';
}
