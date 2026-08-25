(function () {
  const data = window.MathCourseData;
  if (!data || !Array.isArray(data.practice)) return;

  const chapter = "第15·16章 复习练习";
  const questions = [
    {
      id: "review-15-01", chapter, sourceChapter: "第15章 轴对称", section: "15.1 轴对称", point: "轴对称概念", required: true, difficulty: "基础",
      prompt: "关于“轴对称图形”和“两个图形成轴对称”，下列说法正确的是？",
      options: ["二者都只研究一个图形", "前者研究一个图形自身，后者研究两个图形的位置关系", "前者一定有两条对称轴", "两个全等图形一定成轴对称"], answer: 1,
      explain: "轴对称图形关注一个图形沿某直线折叠后自身两部分重合；两个图形成轴对称关注一个图形折叠后与另一个图形重合。全等只是必要关系，不能单独保证轴对称位置。", diagram: "axis-symmetry"
    },
    {
      id: "review-15-02", chapter, sourceChapter: "第15章 轴对称", section: "15.2 轴对称作图", point: "坐标轴对称", required: true, difficulty: "基础",
      prompt: "点P(−4,3)关于x轴的对称点坐标是？",
      options: ["(4,3)", "(−4,−3)", "(4,−3)", "(−3,4)"], answer: 1,
      explain: "关于x轴对称时横坐标不变，纵坐标变为相反数，因此(−4,3)→(−4,−3)。", diagram: "review15-coordinate-x"
    },
    {
      id: "review-15-03", chapter, sourceChapter: "第15章 轴对称", section: "15.2 轴对称作图", point: "连续坐标变换", required: true, difficulty: "中等",
      prompt: "点P(2,−5)先关于x轴对称，再关于y轴对称，最终坐标是？",
      options: ["(−2,5)", "(2,5)", "(−2,−5)", "(5,−2)"], answer: 0,
      explain: "先关于x轴得到(2,5)，再关于y轴得到(−2,5)。连续变换要保留中间结果，避免一次性猜符号。", diagram: "review15-coordinate-two"
    },
    {
      id: "review-15-04", chapter, sourceChapter: "第15章 轴对称", section: "15.1.2 线段垂直平分线", point: "垂直平分线性质", required: true, difficulty: "基础",
      prompt: "点P在线段AB的垂直平分线上，可以直接推出？",
      options: ["PA=PB", "PA⊥PB", "P是AB中点", "∠APB=90°"], answer: 0,
      explain: "线段垂直平分线上的点到线段两端距离相等，所以PA=PB。该定理不说明P一定是中点，也不说明PA与PB垂直。", diagram: "perpendicular-bisector"
    },
    {
      id: "review-15-05", chapter, sourceChapter: "第15章 轴对称", section: "15.1.2 线段垂直平分线", point: "垂直平分线判定", required: true, difficulty: "中等",
      prompt: "M、N是两个不同的点，且MA=MB、NA=NB，则直线MN是？",
      options: ["AB所在直线", "AB的垂直平分线", "∠MAN的平分线", "过A的垂线"], answer: 1,
      explain: "MA=MB说明M在线段AB的垂直平分线上，NA=NB说明N也在这条线上。两个不同的点确定一条直线，因此MN就是AB的垂直平分线。", diagram: "review15-two-points-bisector"
    },
    {
      id: "review-15-06", chapter, sourceChapter: "第15章 轴对称", section: "15.3.1 等腰三角形", point: "等腰三角形角度", required: true, difficulty: "中等",
      prompt: "等腰三角形有一个内角为100°，另外两个角分别为？",
      options: ["40°、40°", "100°、−20°", "50°、30°", "80°、0°"], answer: 0,
      explain: "若100°是底角，两个底角都为100°，内角和会超过180°，不可能。因此100°只能是顶角，两个相等底角各为(180°−100°)÷2=40°。", diagram: "review15-isosceles-100"
    },
    {
      id: "review-15-07", chapter, sourceChapter: "第15章 轴对称", section: "15.3.1 等腰三角形", point: "等腰分类讨论", required: true, difficulty: "中等",
      prompt: "等腰三角形有一个内角为70°，它的顶角可能是？",
      options: ["只可能70°", "只可能40°", "70°或40°", "70°或110°"], answer: 2,
      explain: "若70°是顶角，顶角为70°；若70°是底角，另一个底角也为70°，顶角为180°−140°=40°。", diagram: "review15-isosceles-70"
    },
    {
      id: "review-15-08", chapter, sourceChapter: "第15章 轴对称", section: "15.3.1 等腰三角形", point: "边与三边关系", required: true, difficulty: "中等",
      prompt: "一个等腰三角形有两边长为4和9，则它的周长为？",
      options: ["17", "18", "22", "17或22"], answer: 2,
      explain: "若腰为4，则三边4、4、9不满足4+4＞9；所以腰只能是9，三边为9、9、4，周长22。分类后必须用三边关系排除无效情况。", diagram: "review15-sides-4-9"
    },
    {
      id: "review-15-09", chapter, sourceChapter: "第15章 轴对称", section: "15.3.2 等边三角形", point: "等边三角形判定", required: true, difficulty: "基础",
      prompt: "一个等腰三角形有一个内角为60°，这个三角形一定是？",
      options: ["直角三角形", "等边三角形", "钝角三角形", "只能确定为等腰三角形"], answer: 1,
      explain: "若60°是顶角，两个底角各为60°；若60°是底角，另一底角也为60°，顶角仍为60°。三种角都为60°，所以一定是等边三角形。", diagram: "equilateral"
    },
    {
      id: "review-15-10", chapter, sourceChapter: "第15章 轴对称", section: "15.3.2 含30°角的直角三角形", point: "30°角所对直角边", required: true, difficulty: "基础",
      prompt: "直角三角形的斜边长为14，其中一个锐角为30°，则30°角所对直角边长为？",
      options: ["4", "7", "14", "28"], answer: 1,
      explain: "在含30°角的直角三角形中，30°角所对直角边等于斜边的一半，所以14÷2=7。", diagram: "review15-right30-14"
    },
    {
      id: "review-15-11", chapter, sourceChapter: "第15章 轴对称", section: "第15章综合", point: "轴对称最短路径", required: true, difficulty: "中等",
      prompt: "A、B位于直线l同侧，要在l上取点P使PA+PB最小，正确作法是？",
      options: ["作B关于l的对称点B′，连接AB′交l于P", "取AB中点为P", "作AB的垂直平分线交l于P", "在l上任取一点"], answer: 0,
      explain: "作B关于l的对称点B′后，PB=PB′，所以PA+PB=PA+PB′。当A、P、B′共线时，由两点之间线段最短得到最小值。", diagram: "shortest-reflection"
    },
    {
      id: "review-15-12", chapter, sourceChapter: "第15章 轴对称", section: "第15章综合", point: "三线合一与垂直平分线", required: true, difficulty: "提高",
      prompt: "在△ABC中AB=AC，D为BC中点，点P在线段AD上，则PB与PC的关系是？",
      options: ["PB=PC", "PB＞PC", "PB＜PC", "无法确定"], answer: 0,
      explain: "等腰三角形中，底边中线AD也是底边BC的垂直平分线。P在AD上，因此由垂直平分线性质得PB=PC。", diagram: "review15-point-on-median"
    },
    {
      id: "review-15-c1", chapter, sourceChapter: "第15章 轴对称", section: "第15章培优", point: "等腰三角形多解", required: false, difficulty: "提高",
      prompt: "等腰三角形周长为20，其中一边长为8，则另外两边可能是？",
      options: ["8、4或6、6", "8、4或8、8", "6、6或4、4", "只有8、4"], answer: 0,
      explain: "若8为腰，另两边为8、4；若8为底，另外两腰各为(20−8)÷2=6。两组三边都满足三角形两短边之和大于最长边。", diagram: "review15-perimeter-20"
    },
    {
      id: "review-15-c2", chapter, sourceChapter: "第15章 轴对称", section: "第15章培优", point: "坐标最短路径", required: false, difficulty: "提高",
      prompt: "A(2,3)、B(8,1)位于x轴同侧，P在x轴上。PA+PB的最小值是？",
      options: ["2√10", "2√13", "4√5", "10"], answer: 1,
      explain: "把B关于x轴对称为B′(8,−1)，则PB=PB′。最小值为AB′=√[(8−2)²+(−1−3)²]=√52=2√13。", diagram: "review15-coordinate-shortest"
    },
    {
      id: "review-16-01", chapter, sourceChapter: "第16章 整式的乘法", section: "16.1 幂的运算", point: "同底数幂乘法", required: true, difficulty: "基础",
      prompt: "a³·a⁵等于？", options: ["a⁸", "a¹⁵", "2a⁸", "a²"], answer: 0,
      explain: "同底数幂相乘，底数不变，指数相加：a³·a⁵=a³⁺⁵=a⁸。", diagram: "power-product"
    },
    {
      id: "review-16-02", chapter, sourceChapter: "第16章 整式的乘法", section: "16.1 幂的运算", point: "幂的乘方", required: true, difficulty: "基础",
      prompt: "(a³)⁴等于？", options: ["a⁷", "a¹²", "a⁶⁴", "4a³"], answer: 1,
      explain: "幂的乘方，底数不变，指数相乘：3×4=12，所以(a³)⁴=a¹²。", diagram: "power-rules"
    },
    {
      id: "review-16-03", chapter, sourceChapter: "第16章 整式的乘法", section: "16.1 幂的运算", point: "积的乘方", required: true, difficulty: "中等",
      prompt: "(−2xy²)³等于？", options: ["−8x³y⁶", "8x³y⁵", "−6x³y⁶", "−8xy⁶"], answer: 0,
      explain: "−2、x和y²都要分别三次方：(−2)³=−8，x³，(y²)³=y⁶，结果为−8x³y⁶。", diagram: "power-rules"
    },
    {
      id: "review-16-04", chapter, sourceChapter: "第16章 整式的乘法", section: "16.1 幂的运算", point: "幂的混合运算", required: true, difficulty: "中等",
      prompt: "x²(x³)²等于？", options: ["x⁷", "x⁸", "x¹⁰", "2x⁸"], answer: 1,
      explain: "先算幂的乘方：(x³)²=x⁶；再同底数幂相乘x²·x⁶=x⁸。", diagram: "power-rules"
    },
    {
      id: "review-16-05", chapter, sourceChapter: "第16章 整式的乘法", section: "16.2 整式乘除", point: "单项式乘单项式", required: true, difficulty: "基础",
      prompt: "3a²b·(−2ab³)等于？", options: ["−6a³b⁴", "6a³b⁴", "−5a²b³", "−6a²b⁴"], answer: 0,
      explain: "系数3×(−2)=−6，a²·a=a³，b·b³=b⁴，所以结果为−6a³b⁴。", diagram: "monomial-product"
    },
    {
      id: "review-16-06", chapter, sourceChapter: "第16章 整式的乘法", section: "16.2 整式乘除", point: "单项式乘多项式", required: true, difficulty: "基础",
      prompt: "−2x(x²−3x+4)展开后是？", options: ["−2x³+6x²−8x", "−2x³−6x²−8x", "−2x³+6x²+4", "−2x³−3x+4"], answer: 0,
      explain: "−2x必须逐项相乘：−2x·x²=−2x³，−2x·(−3x)=+6x²，−2x·4=−8x。", diagram: "mono-poly"
    },
    {
      id: "review-16-07", chapter, sourceChapter: "第16章 整式的乘法", section: "16.2 整式乘除", point: "多项式乘多项式", required: true, difficulty: "中等",
      prompt: "(x+2)(x−5)展开并合并后是？", options: ["x²−3x−10", "x²+3x−10", "x²−7x+10", "x²−10"], answer: 0,
      explain: "四项展开：x²−5x+2x−10；合并同类项−5x+2x=−3x，得到x²−3x−10。", diagram: "poly-poly"
    },
    {
      id: "review-16-08", chapter, sourceChapter: "第16章 整式的乘法", section: "16.2 整式乘除", point: "多项式除以单项式", required: true, difficulty: "中等",
      prompt: "(6x³−9x²+3x)÷3x（x≠0）的结果是？", options: ["2x²−3x+1", "2x²−3x", "2x³−3x²+1", "2x²−6x+1"], answer: 0,
      explain: "每一项分别除以3x：6x³÷3x=2x²，−9x²÷3x=−3x，3x÷3x=1。", diagram: "polynomial-division"
    },
    {
      id: "review-16-09", chapter, sourceChapter: "第16章 整式的乘法", section: "16.2 整式乘除", point: "零指数与括号", required: true, difficulty: "中等",
      prompt: "(−3)⁰+[−(3⁰)]的值是？", options: ["−2", "−1", "0", "2"], answer: 2,
      explain: "(−3)⁰=1；方括号内−(3⁰)=−1。因此1+(−1)=0。括号决定负号是否属于底数。", diagram: "zero-exponent"
    },
    {
      id: "review-16-10", chapter, sourceChapter: "第16章 整式的乘法", section: "16.3 乘法公式", point: "平方差公式", required: true, difficulty: "基础",
      prompt: "(2a+b)(2a−b)等于？", options: ["4a²−b²", "4a²+b²", "2a²−b²", "4a²−4ab+b²"], answer: 0,
      explain: "两个因式是一项相同、一项互为相反数，使用平方差公式：(2a)²−b²=4a²−b²。", diagram: "difference-squares"
    },
    {
      id: "review-16-11", chapter, sourceChapter: "第16章 整式的乘法", section: "16.3 乘法公式", point: "完全平方公式", required: true, difficulty: "中等",
      prompt: "(2a−3b)²展开后是？", options: ["4a²−12ab+9b²", "4a²−9b²", "4a²+12ab+9b²", "2a²−6ab+3b²"], answer: 0,
      explain: "首平方(2a)²=4a²，中间项−2·2a·3b=−12ab，尾平方(3b)²=9b²。", diagram: "perfect-square"
    },
    {
      id: "review-16-12", chapter, sourceChapter: "第16章 整式的乘法", section: "第16章综合", point: "公式混合运算", required: true, difficulty: "提高",
      prompt: "(x+4)(x−4)−(x−1)²化简后是？", options: ["2x−17", "−2x−17", "2x−15", "x²−17"], answer: 0,
      explain: "第一部分用平方差得x²−16；第二部分用完全平方得x²−2x+1。相减：x²−16−(x²−2x+1)=2x−17。", diagram: "formula-mixed"
    },
    {
      id: "review-16-c1", chapter, sourceChapter: "第16章 整式的乘法", section: "第16章培优", point: "完全平方公式变形", required: false, difficulty: "提高",
      prompt: "已知a+b=7、ab=10，则a²+b²等于？", options: ["19", "29", "39", "49"], answer: 1,
      explain: "由(a+b)²=a²+2ab+b²，得a²+b²=(a+b)²−2ab=49−20=29。", diagram: "perfect-square"
    },
    {
      id: "review-16-c2", chapter, sourceChapter: "第16章 整式的乘法", section: "第16章培优", point: "与字母无关", required: false, difficulty: "提高",
      prompt: "(x+a)(x−2)−x²的值与x无关，则a等于？", options: ["−2", "0", "2", "4"], answer: 2,
      explain: "展开化简得(x+a)(x−2)−x²=(a−2)x−2a。要使结果与x无关，x的系数必须为0，即a−2=0，所以a=2。", diagram: "coefficient-independent"
    }
  ];

  data.practice.push(...questions);
  data.sources.push("所附第15章轴对称与第16章整式乘法复习讲义、知识清单");
})();
