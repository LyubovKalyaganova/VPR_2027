/**
 * Контент-банки для генераторов R01–R25 (4 класс, ВПР-2027).
 */

export type OrthoPair = { correct: string; distractors: [string, string, string]; rule: string; hint: string };

export const R01_PAIRS: OrthoPair[] = [
  { correct: 'лесной', distractors: ['лисной', 'лясной', 'лесный'], rule: 'безударная гласная в корне', hint: 'проверочное слово «лес»' },
  { correct: 'корова', distractors: ['карова', 'курова', 'карава'], rule: 'безударная гласная в корне', hint: 'проверочное «кóровы»' },
  { correct: 'сделал', distractors: ['зделал', 'сдетал', 'зделл'], rule: 'приставка с- (не з-)', hint: 'приставки «з-» нет: сделал, списал' },
  { correct: 'снежок', distractors: ['снешок', 'снижок', 'снежёк'], rule: 'парный согласный в корне', hint: 'проверь: снежка' },
  { correct: 'молоко', distractors: ['малако', 'мулако', 'малака'], rule: 'безударные гласные в корне', hint: 'не пиши «как слышится»: проверь ударением' },
  { correct: 'ветреный', distractors: ['ветренный', 'ветрянный', 'ветреной'], rule: 'н / нн в суффиксе', hint: 'ветреный день — исключение, одно н' },
  { correct: 'приехал', distractors: ['преехал', 'приихал', 'приехол'], rule: 'приставка ПРИ-', hint: 'приближение: при- (не пре-)' },
  { correct: 'обезьяна', distractors: ['обезяна', 'абезьяна', 'обезьянна'], rule: 'разделительный ь', hint: 'после согласной перед я — ь' },
  { correct: 'подъезд', distractors: ['подьезд', 'падъезд', 'подъесд'], rule: 'разделительный ъ', hint: 'после приставки перед е, ё, ю, я — ъ' },
  { correct: 'Москва', distractors: ['москва', 'Масква', 'москова'], rule: 'заглавная буква', hint: 'имена собственные — с большой буквы' },
  { correct: 'осень', distractors: ['осен', 'осенн', 'асень'], rule: 'мягкий знак на конце', hint: 'ж.р. 3 скл.: ночь, осень' },
  { correct: 'сапоги', distractors: ['сапаги', 'сопоги', 'сапогы'], rule: 'безударная гласная в корне', hint: 'проверочное «сапóг»' },
  { correct: 'сердце', distractors: ['серце', 'сердцэ', 'сирдце'], rule: 'непроизносимый согласный', hint: 'проверочное «сердечный»' },
  { correct: 'местный', distractors: ['месный', 'местсный', 'мястный'], rule: 'непроизносимый согласный', hint: 'проверочное «место»' },
  { correct: 'вода', distractors: ['вада', 'вуда', 'вады'], rule: 'безударная гласная в корне', hint: 'проверочное «вóды»' },
  { correct: 'классный', distractors: ['класный', 'кластный', 'класннй'], rule: 'удвоенная согласная', hint: 'в корне класс — две с' },
];

export const R02_NOUN_ENDINGS = [
  { stem: 'книг', endings: ['а', 'е', 'у', 'ой'], correct: 'е', context: 'о (чём?) книг___', rule: 'предложный падеж' },
  { stem: 'друг', endings: ['а', 'у', 'ом', 'е'], correct: 'ом', context: 'с (кем?) друг___', rule: 'творительный падеж' },
  { stem: 'школ', endings: ['а', 'е', 'ы', 'у'], correct: 'е', context: 'в (чём?) школ___', rule: 'предложный падеж' },
  { stem: 'лес', endings: ['а', 'у', 'ом', 'е'], correct: 'у', context: 'к (чему?) лес___', rule: 'дательный падеж' },
  { stem: 'собак', endings: ['а', 'е', 'и', 'у'], correct: 'и', context: 'нет (чего?) собак___', rule: 'родительный падеж' },
];

export const R03_ADJ_ENDINGS = [
  { stem: 'красив', endings: ['ый', 'ая', 'ое', 'ые'], correct: 'ое', context: 'красив___ платье', noun: 'платье', gender: 'ср' },
  { stem: 'син', endings: ['ий', 'яя', 'ее', 'ие'], correct: 'яя', context: 'син___ река', noun: 'река', gender: 'ж' },
  { stem: 'нов', endings: ['ый', 'ая', 'ое', 'ые'], correct: 'ый', context: 'нов___ дом', noun: 'дом', gender: 'м' },
  { stem: 'весенн', endings: ['ий', 'яя', 'ее', 'ие'], correct: 'ие', context: 'весенн___ дни', noun: 'дни', gender: 'мн' },
];

export const R04_VERB_SPELLING = [
  {
    correct: 'учится',
    distractors: ['учиться', 'учитца', 'учица'],
    type: 'tся',
    sentence: 'Маша учит___ правила. (что делает?)',
    explanation: 'Нет вопроса «что делать?» — пишем -тся без ь.',
  },
  {
    correct: 'учиться',
    distractors: ['учится', 'учитца', 'учица'],
    type: 'ться',
    sentence: 'Маша хочет учит___ . (что делать?)',
    explanation: 'Есть вопрос «что делать?» — пишем -ться с ь.',
  },
  {
    correct: 'пишет',
    distractors: ['пишетсь', 'пишот', 'пишит'],
    type: 'ending',
    sentence: 'Он пиш___ письмо.',
    explanation: 'I спряжение, 3 лицо ед. ч.: -ет.',
  },
  {
    correct: 'пишут',
    distractors: ['пишет', 'пишют', 'писают'],
    type: 'ending',
    sentence: 'Дети пиш___ диктант.',
    explanation: 'I спряжение, 3 лицо мн. ч.: -ут.',
  },
  {
    correct: 'летит',
    distractors: ['летет', 'летитсь', 'летитт'],
    type: 'ending',
    sentence: 'Птица лет___ к гнезду.',
    explanation: 'II спряжение, 3 лицо ед. ч.: -ит.',
  },
];

export const R05_PUNCTUATION = [
  { sentence: 'В лесу росли берёзы и сосны', correct: '.', rule: 'конец повествовательного' },
  { sentence: 'Купи хлеб молоко сыр', correct: ',', rule: 'запятая между однородными' },
  { sentence: 'На столе лежали яблоки груши сливы', correct: ',', rule: 'однородные члены без союза' },
  { sentence: 'Было тепло но ветрено', correct: ',', rule: 'запятая перед «но»' },
];

export const R06_PROOFREADING = [
  { text: 'Мы хadили в лес.', error: 'хadили', fix: 'ходили', rule: 'безударная гласная' },
  { text: 'Птица летела высоко.', error: 'летела', fix: 'летела', rule: 'нет ошибки' },
  { text: 'Дети играли во двore.', error: 'двore', fix: 'дворе', rule: 'безударная гласная' },
  { text: 'Он принёс цветы.', error: 'принёс', fix: 'принёс', rule: 'нет ошибки' },
  { text: 'Мы писали диктант.', error: 'писали', fix: 'писали', rule: 'нет ошибки' },
  { text: 'Ветер дул с моря.', error: 'дул', fix: 'дул', rule: 'нет ошибки' },
  { text: 'Кошка спала на дивonе.', error: 'дивonе', fix: 'диване', rule: 'безударная гласная' },
];

export const R07_DICTATION = [
  { word: 'осень', distractors: ['осен', 'осенн', 'асень'], transcript: 'о-се́нь' },
  { word: 'природа', distractors: ['прерода', 'природаа', 'периода'], transcript: 'при-ро-да́' },
  { word: 'листья', distractors: ['листя', 'листье', 'листяя'], transcript: 'лист-ья́' },
  { word: 'собирать', distractors: ['сабирать', 'соберать', 'сабератъ'], transcript: 'со-би-ра́ть' },
  { word: 'красивый', distractors: ['красивий', 'красевый', 'красивыый'], transcript: 'кра-си́-вый' },
  { word: 'дорога', distractors: ['дарога', 'дарогаа', 'дурога'], transcript: 'до-ро-га́' },
  { word: 'учитель', distractors: ['учител', 'учитил', 'учитиль'], transcript: 'у-чи-тель' },
  { word: 'письмо', distractors: ['писмо', 'письмао', 'песьмо'], transcript: 'пись-мо́' },
];

export const R08_STRESS = [
  { word: 'звонит', stress: 2, options: ['звОнит', 'звонИт', 'звОнИт', 'звонит'] },
  { word: 'торты', stress: 2, options: ['тОрты', 'тортЫ', 'тОртЫ', 'торты'] },
  { word: 'средства', stress: 1, options: ['срЕдства', 'средствА', 'средствА́', 'средства'] },
  { word: 'каталог', stress: 3, options: ['кАталог', 'катАлог', 'каталОг', 'каталог'] },
  { word: 'было', stress: 2, options: ['бЫло', 'былО', 'бЫлО', 'было'] },
  { word: 'звонят', stress: 2, options: ['звОнят', 'звонЯт', 'звОнЯт', 'звонят'] },
];

export const R09_PHONETICS = [
  { word: 'яма', sounds: 4, letters: 3, syllables: 2 },
  { word: 'соль', sounds: 3, letters: 4, syllables: 1 },
  { word: 'конь', sounds: 3, letters: 4, syllables: 1 },
  { word: 'юла', sounds: 4, letters: 3, syllables: 2 },
  { word: 'день', sounds: 3, letters: 4, syllables: 1 },
  { word: 'солнце', sounds: 5, letters: 6, syllables: 2 },
  { word: 'яблоко', sounds: 7, letters: 6, syllables: 3 },
  { word: 'ель', sounds: 3, letters: 3, syllables: 1 },
];

export const R10_SYNTAX_BASE = [
  { sentence: 'Дети играли во дворе.', subject: 'Дети', predicate: 'играли' },
  { sentence: 'Птица поёт на ветке.', subject: 'Птица', predicate: 'поёт' },
  { sentence: 'Мама готовит обед.', subject: 'Мама', predicate: 'готовит' },
  { sentence: 'Собака бежит по дороге.', subject: 'Собака', predicate: 'бежит' },
];

export const R11_HOMOGENEOUS = [
  { sentence: 'На столе лежали яблоки, груши и сливы.', members: ['яблоки', 'груши', 'сливы'] },
  { sentence: 'Дети пели, танцевали и смеялись.', members: ['пели', 'танцевали', 'смеялись'] },
  { sentence: 'Было тепло, но ветрено.', members: ['тепло', 'ветрено'] },
];

export const R12_PARTS_OF_SPEECH = [
  { word: 'быстро', pos: 'наречие', extension: true },
  { word: 'красивый', pos: 'прилагательное', extension: false },
  { word: 'бежать', pos: 'глагол', extension: false },
  { word: 'он', pos: 'местоимение', extension: true },
  { word: 'дом', pos: 'существительное', extension: false },
  { word: 'и', pos: 'союз', extension: false },
  { word: 'в', pos: 'предлог', extension: false },
];

export const R13_NOUN = [
  { word: 'книга', gender: 'ж.р.', number: 'ед.ч.', case: 'им.', declension: '1 скл.' },
  { word: 'стол', gender: 'м.р.', number: 'ед.ч.', case: 'им.', declension: '2 скл.' },
  { word: 'окно', gender: 'ср.р.', number: 'ед.ч.', case: 'им.', declension: '2 скл.' },
  { word: 'дети', gender: 'м.р.', number: 'мн.ч.', case: 'им.', declension: '2 скл.' },
];

export const R14_ADJECTIVE = [
  { word: 'красивый', gender: 'м.р.', number: 'ед.ч.', case: 'им.', agrees: 'дом' },
  { word: 'синяя', gender: 'ж.р.', number: 'ед.ч.', case: 'им.', agrees: 'река' },
  { word: 'весеннее', gender: 'ср.р.', number: 'ед.ч.', case: 'им.', agrees: 'утро' },
];

export const R15_MORPHEMES = [
  { word: 'подлёд', parts: ['под', 'лёд'], schema: 'п|о|д|—|л|ё|д' },
  { word: 'лесник', parts: ['лес', 'ник'], schema: 'л|е|с|—|н|и|к' },
  { word: 'перелёт', parts: ['пере', 'лёт'], schema: 'п|е|р|е|—|л|ё|т' },
  { word: 'садовник', parts: ['сад', 'ов', 'ник'], schema: 'с|а|д|—|о|в|—|н|и|к' },
];

export const R16_CONTEXT = [
  {
    sentence: 'Девочка заплела длинную косу.',
    word: 'косу',
    meaning: 'причёска из заплетённых волос',
    distractors: ['сельскохозяйственное орудие', 'песчаная отмель у моря', 'музыкальный инструмент'],
  },
  {
    sentence: 'От двери не подошёл ключ.',
    word: 'ключ',
    meaning: 'предмет, которым открывают замок',
    distractors: ['родник, источник воды', 'подсказка к загадке', 'нота в музыке'],
  },
  {
    sentence: 'На грядке вырос горький лук.',
    word: 'лук',
    meaning: 'овощ',
    distractors: ['оружие со стрелами', 'изгиб реки', 'название цветка'],
  },
  {
    sentence: 'Птица сидит на тонкой ветке.',
    word: 'ветке',
    meaning: 'часть дерева',
    distractors: ['вид транспорта', 'школьный предмет', 'время суток'],
  },
];

export const R17_SYNONYMS = [
  { word: 'быстрый', synonym: 'скорый', antonym: 'медленный' },
  { word: 'радость', synonym: 'веселье', antonym: 'грусть' },
  { word: 'храбрый', synonym: 'смелый', antonym: 'трусливый' },
  { word: 'большой', synonym: 'крупный', antonym: 'маленький' },
];

export const R18_TEXTS = [
  {
    title: 'Осенний лес',
    passage:
      'Наступила осень. Листья на деревьях пожелтели и опали. В лесу стало тихо. Птицы улетели на юг. Только вороны каркают на голых ветках.',
    theme: 'осень в лесу',
    mainIdea: 'осенью лес меняется',
    headings: ['Осенний лес', 'Лето в лесу', 'Зимние забавы', 'Школьный двор'],
  },
  {
    title: 'Первый снег',
    passage:
      'Утром выпал первый снег. Дети радостно выбежали во двор. Они лепили снеговика и играли в снежки. Все были счастливы.',
    theme: 'первый снег',
    mainIdea: 'дети радуются первому снегу',
    headings: ['Первый снег', 'Летний дождь', 'Осенний листопад', 'Урок математики'],
  },
];

export const R19_PLANS = [
  {
    parts: ['Как наступила осень', 'Что случилось с листьями', 'Куда улетели птицы'],
    extra: 'Как дети играли в снег',
    badPlan: ['Осенний лес', 'Зимние забавы', 'Летний дождь'],
    goodPlanLabel: 'Осень в лесу: листья, тишина, птицы',
  },
  {
    parts: ['Утро после снегопада', 'Игры во дворе', 'Радость детей'],
    extra: 'Урок в школе',
    badPlan: ['Школьный день', 'Каникулы', 'Экскурсия'],
    goodPlanLabel: 'Первый снег и игры детей',
  },
];

export const R20_QUESTIONS = [
  {
    passage: 'Кошка спала на подоконнике и мурлыкала.',
    question: 'Где спала кошка?',
    answer: 'на подоконнике',
    distractors: ['на диване', 'в корзине', 'у двери'],
    type: 'fact' as const,
  },
  {
    passage: 'Мальчик помог бабушке перейти дорогу.',
    question: 'Кому помог мальчик?',
    answer: 'бабушке',
    distractors: ['маме', 'учителю', 'другу'],
    type: 'fact' as const,
  },
  {
    passage: 'Мальчик помог бабушке перейти дорогу.',
    question: 'Что сделал мальчик?',
    answer: 'помог перейти дорогу',
    distractors: ['купил хлеб', 'пошёл в школу', 'нарисовал рисунок'],
    type: 'fact' as const,
  },
];

export const R21_SPEECH = [
  { situation: 'Ты хочешь попросить одноклассника одолжить карандаш.', goal: 'просьба', options: ['Дай карандаш!', 'Не мог бы ты одолжить карандаш?', 'У меня нет карандаша.', 'Карандаш мой.'] },
  { situation: 'Ты благодаришь учителя за помощь.', goal: 'благодарность', options: ['Спасибо за помощь!', 'Пока!', 'Дай мне тетрадь.', 'Мне всё равно.'] },
  { situation: 'Ты извиняешься перед другом.', goal: 'извинение', options: ['Прости, пожалуйста.', 'Это твоя вина.', 'Уходи.', 'Не знаю.'] },
];

export const R22_IDIOMS = [
  { idiom: 'бить баклуши', meaning: 'бездельничать', literal: 'стучать палкой по воде' },
  { idiom: 'водить за нос', meaning: 'обманывать', literal: 'вести кого-то за нос' },
  { idiom: 'сидеть сложа руки', meaning: 'ничего не делать', literal: 'сидеть, сложив руки' },
];

export const R23_REASONING = [
  { skill: 'R13', error: 'Род — ж.р. у слова «стол»', correct: 'м.р.' },
  { skill: 'R10', error: 'Подлежащее — «играли»', correct: 'Дети' },
  { skill: 'R15', error: 'Корень — «лес» в слове «лесник»', correct: 'лес' },
];

export const R24_SENTENCE_TYPE = [
  { sentence: 'Солнце светит.', type: 'простое', explanation: 'одна грамматическая основа' },
  { sentence: 'Солнце светит, и птицы поют.', type: 'сложное', explanation: 'две основы, союз «и»' },
  { sentence: 'Дети играли во дворе.', type: 'простое', explanation: 'одна основа' },
];

export const R25_VERB = [
  { word: 'читает', tense: 'наст.вр.', person: '3 л.', number: 'ед.ч.', conjugation: 'I' },
  { word: 'писали', tense: 'прош.вр.', person: '—', number: 'мн.ч.', conjugation: 'I' },
  { word: 'летит', tense: 'наст.вр.', person: '3 л.', number: 'ед.ч.', conjugation: 'II' },
];

/** Покрытие 15 заданий КИМ ВПР-2027 → навыки */
export const VPR_2027_RUSSIAN_TASKS = [
  { n: 1, focus: 'диктант', skills: ['R07', 'R01', 'R02', 'R03', 'R04'] },
  { n: 2, focus: 'однородные члены (пунктуация)', skills: ['R05', 'R11'] },
  { n: '3.1', focus: 'грамматическая основа', skills: ['R10'] },
  { n: '3.2', focus: 'части речи', skills: ['R12'] },
  { n: 4, focus: 'ударение', skills: ['R08'] },
  { n: 5, focus: 'звуко-буквенный анализ', skills: ['R09'] },
  { n: 6, focus: 'найти и исправить', skills: ['R06'] },
  { n: 7, focus: 'тема / основная мысль', skills: ['R18'] },
  { n: 8, focus: 'план текста', skills: ['R19'] },
  { n: 9, focus: 'вопрос по содержанию', skills: ['R20'] },
  { n: 10, focus: 'значение слова', skills: ['R16'] },
  { n: 11, focus: 'синоним / антоним', skills: ['R17'] },
  { n: 12, focus: 'состав слова + схема', skills: ['R15'] },
  { n: 13, focus: 'существительное', skills: ['R13'] },
  { n: 14, focus: 'прилагательное', skills: ['R14'] },
  { n: 15, focus: 'мини-текст + фразеологизм', skills: ['R21', 'R22'] },
] as const;

export const REASONING_SUBTYPES = ['first_step', 'next_step', 'find_error', 'choose_sequence'] as const;
