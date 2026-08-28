(function () {
  const data = window.MathCourseData;
  if (!data || !Array.isArray(data.practice)) return;

  const chapter = "第17·18章 复习练习";
  const questions = [
    {
      id: "review-17-01", chapter, sourceChapter: "第17章 因式分解", section: "17.1 概念与公因式", point: "因式分解的定义", required: true, difficulty: "基础",
      prompt: "下列从左到右的变形，属于正确因式分解的是？",
      options: ["(x+3)(x−3)=x²−9", "6x²−15x=3x(2x−5)", "x²+4=x(x+4/x)", "4a²−12a=4a(a−12)"], answer: 1,
      explain: "因式分解要把一个多项式恒等地写成几个整式的乘积。6x²−15x提出公因式3x后得到3x(2x−5)，方向、结果形式和等式都正确。", diagram: "factorization-direction"
    },
    {
      id: "review-17-02", chapter, sourceChapter: "第17章 因式分解", section: "17.1 概念与公因式", point: "由分解结果求参数", required: true, difficulty: "中等",
      prompt: "若x²+ax+10=(x+2)(x+5)，则a等于？",
      options: ["5", "6", "7", "10"], answer: 2,
      explain: "展开右边得到x²+7x+10。比较一次项系数可知a=7；再比较常数项2×5=10，可作交叉检验。", diagram: "factor-parameter"
    },
    {
      id: "review-17-03", chapter, sourceChapter: "第17章 因式分解", section: "17.1 概念与公因式", point: "确定最大公因式", required: true, difficulty: "基础",
      prompt: "15x³y²与25x²y⁴的最大公因式是？",
      options: ["5x²y²", "5xy²", "10x²y⁴", "5x³y⁴"], answer: 0,
      explain: "系数15和25的最大公因数是5；共同字母x、y分别取较小指数x²、y²，所以最大公因式是5x²y²。", diagram: "common-factor"
    },
    {
      id: "review-17-04", chapter, sourceChapter: "第17章 因式分解", section: "17.1 概念与公因式", point: "提公因式法", required: true, difficulty: "基础",
      prompt: "8m²n−12mn²分解因式的正确结果是？",
      options: ["2mn(4m−6n)", "4mn(2m−3)", "4m²n²(2−3)", "4mn(2m−3n)"], answer: 3,
      explain: "两项的最大公因式是4mn。逐项相除得到2m和−3n，因此原式=4mn(2m−3n)。", diagram: "common-factor"
    },
    {
      id: "review-17-05", chapter, sourceChapter: "第17章 因式分解", section: "17.2 公式法与综合", point: "平方差结构识别", required: true, difficulty: "基础",
      prompt: "下列多项式可以直接使用平方差公式分解的是？",
      options: ["a²+b²", "16a²−81b²", "4x²−12x+9", "9m²−6mn+n²"], answer: 1,
      explain: "16a²−81b²只有两项、符号相反，并且分别是(4a)²和(9b)²，所以可直接写成(4a+9b)(4a−9b)。", diagram: "factor-difference"
    },
    {
      id: "review-17-06", chapter, sourceChapter: "第17章 因式分解", section: "17.2 公式法与综合", point: "完全平方公式", required: true, difficulty: "中等",
      prompt: "9x²−24xy+16y²分解因式的结果是？",
      options: ["(3x+4y)²", "(9x−4y)²", "(3x−4y)²", "(3x−8y)²"], answer: 2,
      explain: "首尾两项分别是(3x)²和(4y)²，中间项−24xy正好是−2·3x·4y，因此原式=(3x−4y)²。", diagram: "factor-perfect"
    },
    {
      id: "review-17-07", chapter, sourceChapter: "第17章 因式分解", section: "17.2 公式法与综合", point: "先提后套", required: true, difficulty: "中等",
      prompt: "5a³−45a彻底分解因式的结果是？",
      options: ["5a(a+3)(a−3)", "5a(a²−9)", "5(a³−9a)", "5a(a−3)²"], answer: 0,
      explain: "先提出公因式5a，得到5a(a²−9)；括号内仍是平方差，继续分成(a+3)(a−3)。只写到a²−9还没有分解彻底。", diagram: "factor-strategy"
    },
    {
      id: "review-17-08", chapter, sourceChapter: "第17章 因式分解", section: "17.2 公式法与综合", point: "分解的彻底性", required: true, difficulty: "中等",
      prompt: "12x³−3x彻底分解因式的结果是？",
      options: ["3x(4x²−1)", "3x(2x−1)²", "x(12x²−3)", "3x(2x+1)(2x−1)"], answer: 3,
      explain: "先提出3x得3x(4x²−1)，再把4x²−1看成(2x)²−1²，得到3x(2x+1)(2x−1)。", diagram: "factor-strategy"
    },
    {
      id: "review-17-09", chapter, sourceChapter: "第17章 因式分解", section: "拓展方法与应用", point: "十字相乘法", required: true, difficulty: "中等",
      prompt: "x²+x−12分解因式的结果是？",
      options: ["(x+6)(x−2)", "(x+4)(x−3)", "(x−4)(x+3)", "(x−6)(x+2)"], answer: 1,
      explain: "寻找乘积为−12、和为1的两个数，得到4和−3。因此x²+x−12=(x+4)(x−3)。", diagram: "factor-parameter"
    },
    {
      id: "review-17-10", chapter, sourceChapter: "第17章 因式分解", section: "拓展方法与应用", point: "分组分解法", required: true, difficulty: "中等",
      prompt: "ax−ay+bx−by分解因式的结果是？",
      options: ["(a−b)(x+y)", "(a+b)(x+y)", "(a+b)(x−y)", "(a−b)(x−y)"], answer: 2,
      explain: "前两项为a(x−y)，后两项为b(x−y)，两组出现共同整体(x−y)，再次提取后得到(a+b)(x−y)。", diagram: "factor-grouping"
    },
    {
      id: "review-17-11", chapter, sourceChapter: "第17章 因式分解", section: "拓展方法与应用", point: "简便计算", required: true, difficulty: "中等",
      prompt: "利用因式分解计算1003²−997²，结果是？",
      options: ["6", "2000", "11964", "12000"], answer: 3,
      explain: "使用平方差：1003²−997²=(1003+997)(1003−997)=2000×6=12000。", diagram: "factor-application"
    },
    {
      id: "review-17-12", chapter, sourceChapter: "第17章 因式分解", section: "拓展方法与应用", point: "易错辨析", required: true, difficulty: "中等",
      prompt: "小明把x²−9写成(x−3)²。对这一过程的判断正确的是？",
      options: ["错误；(x−3)²=x²−6x+9，正确分解是(x−3)(x+3)", "正确；平方差等于差的平方", "错误；正确结果是(x−9)(x+1)", "正确；只要首尾能开平方即可"], answer: 0,
      explain: "平方差公式得到的是两个共轭因式的乘积，不是差的平方。把(x−3)²展开会出现−6x这一中间项，不能还原x²−9。", diagram: "factor-difference"
    },
    {
      id: "review-17-c1", chapter, sourceChapter: "第17章 因式分解", section: "第17章培优", point: "因式与参数", required: false, difficulty: "提高",
      prompt: "若x+2是多项式x²+kx−6的一个因式，则k等于？",
      options: ["−3", "−1", "1", "3"], answer: 1,
      explain: "x+2为因式时，令x=−2，多项式的值应为0：4−2k−6=0，解得k=−1。也可设另一个因式后展开比较系数。", diagram: "factor-parameter"
    },
    {
      id: "review-17-c2", chapter, sourceChapter: "第17章 因式分解", section: "第17章培优", point: "非负式综合", required: false, difficulty: "提高",
      prompt: "若(a−2b)²+(b−3)²=0，则a+b等于？",
      options: ["6", "8", "9", "12"], answer: 2,
      explain: "两个平方都不小于0，和为0时只能分别等于0。因此b=3，a−2b=0，得到a=6，所以a+b=9。", diagram: "factor-application"
    },
    {
      id: "review-18-01", chapter, sourceChapter: "第18章 分式", section: "18.1 概念与基本性质", point: "分式的判断", required: true, difficulty: "基础",
      prompt: "在a/5、3/(a−1)、(a+b)/π、2a/(b²+1)中，分式共有几个？",
      options: ["1个", "2个", "3个", "4个"], answer: 1,
      explain: "按初始形式判断，分母中含有字母的式子才是分式。3/(a−1)和2a/(b²+1)是分式；5与π都是常数。", diagram: "rational-definition"
    },
    {
      id: "review-18-02", chapter, sourceChapter: "第18章 分式", section: "18.1 概念与基本性质", point: "分式有意义", required: true, difficulty: "基础",
      prompt: "分式1/(x²−9)有意义时，x应满足？",
      options: ["x≠3", "x≠−3", "x≠3且x≠−3", "x＞3"], answer: 2,
      explain: "分母不能为0。x²−9=(x−3)(x+3)，所以要同时排除x=3和x=−3。", diagram: "rational-definition"
    },
    {
      id: "review-18-03", chapter, sourceChapter: "第18章 分式", section: "18.1 概念与基本性质", point: "分式值为零", required: true, difficulty: "中等",
      prompt: "分式(x−4)/(x²−16)的值为0时，x的取值是？",
      options: ["x=−4", "x=0", "x=4", "不存在符合条件的x"], answer: 3,
      explain: "分子等于0得到x=4，但此时分母x²−16也等于0，原分式无意义。因此不存在使该分式值为0的x。", diagram: "rational-definition"
    },
    {
      id: "review-18-04", chapter, sourceChapter: "第18章 分式", section: "18.1 概念与基本性质", point: "因式分解与约分", required: true, difficulty: "中等",
      prompt: "化简(x²−25)/(x²−10x+25)，结果是？",
      options: ["(x+5)/(x−5)，且x≠5", "(x−5)/(x+5)，且x≠−5", "1，且x≠5", "(x+5)/(x−5)，且x≠−5"], answer: 0,
      explain: "分子=(x−5)(x+5)，分母=(x−5)²。约去一个公因式x−5后得到(x+5)/(x−5)，并保留原分母限制x≠5。", diagram: "rational-reduction"
    },
    {
      id: "review-18-05", chapter, sourceChapter: "第18章 分式", section: "18.1 概念与基本性质", point: "最简公分母", required: true, difficulty: "中等",
      prompt: "分式2/(3x²y)与5/(6xy³)的最简公分母是？",
      options: ["3x²y³", "6x²y³", "6x³y⁴", "18x²y³"], answer: 1,
      explain: "系数3和6取最小公倍数6；字母x、y分别取分母中出现的最高次数x²和y³，所以最简公分母是6x²y³。", diagram: "rational-reduction"
    },
    {
      id: "review-18-06", chapter, sourceChapter: "第18章 分式", section: "18.2—18.3 分式运算", point: "异分母加减", required: true, difficulty: "中等",
      prompt: "2/(x−1)−1/(x+1)化简后的结果是？",
      options: ["1/(x²−1)", "(x+1)/(x²−1)", "(x+3)/(x²−1)", "(3x+1)/(x²−1)"], answer: 2,
      explain: "通分后分子为2(x+1)−(x−1)=x+3，分母为(x−1)(x+1)=x²−1；原式还要求x≠1且x≠−1。", diagram: "rational-addition"
    },
    {
      id: "review-18-07", chapter, sourceChapter: "第18章 分式", section: "18.2—18.3 分式运算", point: "分式乘法", required: true, difficulty: "中等",
      prompt: "(4a²b)/(3c)·(9c²)/(8ab²)化简后的结果是？",
      options: ["3ab/(2c)", "2ac/(3b)", "3a²c/(2b²)", "3ac/(2b)"], answer: 3,
      explain: "系数36/24约为3/2；a²/a=a，b/b²=1/b，c²/c=c，所以结果为3ac/(2b)。", diagram: "rational-product"
    },
    {
      id: "review-18-08", chapter, sourceChapter: "第18章 分式", section: "18.2—18.3 分式运算", point: "分式除法", required: true, difficulty: "中等",
      prompt: "(6x²y)/(5ab)÷(9xy²)/(10a²b)化简后的结果是？",
      options: ["4ax/(3y)", "3ax/(4y)", "4xy/(3a)", "4a²x/(3by)"], answer: 0,
      explain: "除以分式要乘其倒数。化为(6x²y)/(5ab)·(10a²b)/(9xy²)后约分，系数为4/3，字母部分为ax/y，得到4ax/(3y)。", diagram: "rational-division"
    },
    {
      id: "review-18-09", chapter, sourceChapter: "第18章 分式", section: "18.4 整数指数幂", point: "负整数指数幂", required: true, difficulty: "基础",
      prompt: "a³·a⁻⁵（a≠0）化成只含正整数指数的形式是？",
      options: ["1/a", "1/a²", "a²", "−1/a²"], answer: 1,
      explain: "同底数幂相乘，指数相加得到a⁻²；负指数表示倒数，所以a⁻²=1/a²。", diagram: "negative-exponent"
    },
    {
      id: "review-18-10", chapter, sourceChapter: "第18章 分式", section: "18.4 整数指数幂", point: "小数的科学记数法", required: true, difficulty: "基础",
      prompt: "0.00000084用科学记数法表示为？",
      options: ["8.4×10⁻⁶", "0.84×10⁻⁷", "8.4×10⁻⁷", "84×10⁻⁸"], answer: 2,
      explain: "把小数点向右移动7位得到8.4，所以原数=8.4×10⁻⁷；标准形式中的系数应大于等于1且小于10。", diagram: "scientific-notation-small"
    },
    {
      id: "review-18-11", chapter, sourceChapter: "第18章 分式", section: "18.5 分式方程与应用", point: "解分式方程", required: true, difficulty: "中等",
      prompt: "方程2/(x+1)=1/(x−2)的解是？",
      options: ["x=−1", "x=2", "x=3", "x=5"], answer: 3,
      explain: "两边同乘(x+1)(x−2)，得到2(x−2)=x+1，解得x=5。5不使任何原分母为0，因此是原方程的解。", diagram: "rational-equation"
    },
    {
      id: "review-18-12", chapter, sourceChapter: "第18章 分式", section: "18.5 分式方程与应用", point: "价格应用题", required: true, difficulty: "提高",
      prompt: "用600元购买某商品。单价降低10元后，同样的钱可多买5件。商品原单价是多少元？",
      options: ["40元", "30元", "50元", "60元"], answer: 0,
      explain: "设原单价为x元，则600/(x−10)−600/x=5。整理得x²−10x−1200=0，解得x=40或−30；单价应大于10且为正，所以原单价为40元。", diagram: "rational-word-problem"
    },
    {
      id: "review-18-c1", chapter, sourceChapter: "第18章 分式", section: "第18章培优", point: "增根与参数", required: false, difficulty: "提高",
      prompt: "关于x的方程2/(x−3)=m/(x²−9)有增根x=3，则m等于？",
      options: ["6", "9", "12", "18"], answer: 2,
      explain: "去分母后得到2(x+3)=m。要使整式方程产生候选解x=3，应有m=2×6=12；但x=3使原分母为0，所以它正是增根。", diagram: "rational-equation"
    },
    {
      id: "review-18-c2", chapter, sourceChapter: "第18章 分式", section: "第18章培优", point: "分式规律与裂项", required: false, difficulty: "提高",
      prompt: "化简1/[x(x+1)]+1/[(x+1)(x+2)]+1/[(x+2)(x+3)]，结果是？",
      options: ["1/[x(x+3)]", "3/[x(x+3)]", "3/[(x+1)(x+2)]", "1/x−1/(x+2)"], answer: 1,
      explain: "利用1/[t(t+1)]=1/t−1/(t+1)逐项裂分，中间项依次抵消，剩下1/x−1/(x+3)=3/[x(x+3)]。原式还要排除x=0、−1、−2、−3。", diagram: "rational-mixed"
    }
  ];

  const existing = new Set(data.practice.map((item) => item.id));
  data.practice.push(...questions.filter((item) => !existing.has(item.id)));
  if (Array.isArray(data.sources)) {
    const source = "所附第17章因式分解与第18章分式解析版复习讲义";
    if (!data.sources.includes(source)) data.sources.push(source);
  }
})();
