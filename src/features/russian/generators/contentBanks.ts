/**
 * Контент-банки для генераторов R01–R25 (4 класс, ВПР-2027).
 */

export type OrthoPair = { wrong: string; correct: string; rule: string; hint: string };

export const R01_PAIRS: OrthoPair[] = [
  { wrong: 'леснОй', correct: 'лесной', rule: 'безударная гласная в корне', hint: 'проверочное слово «лес»' },
  { wrong: 'карова', correct: 'корова', rule: 'безударная гласная в корне', hint: '«кóровы»' },
  { wrong: 'зделал', correct: 'сделал', rule: 'непроизносимый согласный', hint: '«сделанный»' },
  { wrong: 'снежок', correct: 'снежок', rule: 'парный согласный', hint: '«снежок — снежка»' },
  { wrong: 'молоко', correct: 'молоко', rule: 'безударная гласная', hint: '«мóлоко»' },
  { wrong: 'ветреный', correct: 'ветреный', rule: 'парный согласный', hint: '«ветер»' },
  { wrong: 'приехал', correct: 'приехал', rule: 'приставка ПРИ-', hint: 'приставка «при-»' },
  { wrong: 'обезьяна', correct: 'обезьяна', rule: 'мягкий знак', hint: 'разделительный ь' },
  { wrong: 'подьезд', correct: 'подъезд', rule: 'разделительный ъ', hint: '«подъезд»' },
  { wrong: 'Москва', correct: 'Москва', rule: 'заглавная буква', hint: 'имя собственное' },
  { wrong: 'осень', correct: 'осень', rule: 'мягкий знак', hint: 'на конце прилагательного' },
  { wrong: 'сапоги', correct: 'сапоги', rule: 'безударная гласная', hint: '«сапог»' },
];

export const R02_NOUN_ENDINGS = [
  { stem: 'книг', endings: ['а', 'е', 'у', 'ой'], correct: 'е', context: 'о (чём?) книг___', rule: 'предложный падеж' },
  { stem: 'друг', endings: ['а', 'у', 'ом', 'е'], correct: 'ом', context: 'с (кем?) друг___', rule: 'творительный падеж' },
  { stem: 'школ', endings: ['а', 'е', 'ы', 'у'], correct: 'е', context: 'в (чём?) школ___', rule: 'предложный падеж' },
  { stem: 'лес', endings: ['а', 'у', 'ом', 'е'], correct: 'у', context: 'к (чему?) лес___', rule: 'дательный падеж' },
  { stem: 'собак', endings: ['а', 'е', 'и', 'у'], correct: 'и', context: 'нет (чего?) собак___', rule: 'родительный падеж' },
];

export const R03_ADJ_ENDINGS = [
  { stem: 'красив', endings: ['ый', 'ая', 'ое', 'ые'], correct: 'ая', context: 'красив___ платье → красивое платье', noun: 'платье', gender: 'ср' },
  { stem: 'син', endings: ['ий', 'яя', 'ее', 'ие'], correct: 'яя', context: 'син___ река', noun: 'река', gender: 'ж' },
  { stem: 'нов', endings: ['ый', 'ая', 'ое', 'ые'], correct: 'ый', context: 'нов___ дом', noun: 'дом', gender: 'м' },
  { stem: 'весенн', endings: ['ий', 'яя', 'ее', 'ие'], correct: 'ие', context: 'весенн___ дни', noun: 'дни', gender: 'мн' },
];

export const R04_VERB_SPELLING = [
  { wrong: 'учится', correct: 'учится', type: 'tся', sentence: 'Маша учит___ правила.', explanation: '-тся без ь — нет «я»' },
  { wrong: 'учиться', correct: 'учиться', type: 'ться', sentence: 'Маша хочет учит___ .', explanation: '-ться с ь — можно «я»' },
  { wrong: 'пишет', correct: 'пишет', type: 'ending', sentence: 'Он пиш___ письмо.', explanation: '3 л., е.ч., наст. вр.' },
  { wrong: 'пишут', correct: 'пишут', type: 'ending', sentence: 'Дети пиш___ диктант.', explanation: '3 л., мн.ч.' },
  { wrong: 'летит', correct: 'летит', type: 'ending', sentence: 'Птица лет___ .', explanation: 'II спряжение, -ит' },
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
  { word: 'осень', distractors: ['осен', 'осенн', 'осеннь'], transcript: 'о-се́нь' },
  { word: 'природа', distractors: ['прерода', 'природа́', 'прерода́'], transcript: 'при-ро-да́' },
  { word: 'листья', distractors: ['листя', 'листье', 'листя́'], transcript: 'лист-ья́' },
  { word: 'собирать', distractors: ['сабирать', 'соберать', 'сабира́ть'], transcript: 'со-би-ра́ть' },
  { word: 'красивый', distractors: ['красивий', 'красивы', 'красивыйй'], transcript: 'кра-си́-вый' },
  { word: 'дорога', distractors: ['дарога', 'дорога́', 'дарога́'], transcript: 'до-ро-га́' },
  { word: 'учитель', distractors: ['учител', 'учителль', 'учител'], transcript: 'у-чи-тель' },
  { word: 'письмо', distractors: ['писмо', 'письмmo', 'письмоо'], transcript: 'пись-мо́' },
];

export const R08_STRESS = [
  { word: 'звонит', stress: 2, options: ['звОнит', 'звонИт', 'звонит'] },
  { word: 'торты', stress: 2, options: ['тОрты', 'тортЫ', 'торты'] },
  { word: 'средства', stress: 1, options: ['срЕдства', 'средствА', 'средства'] },
  { word: 'каталог', stress: 3, options: ['кАталог', 'каталОг', 'каталог'] },
  { word: 'было', stress: 2, options: ['бЫло', 'былО', 'было'] },
];

export const R09_PHONETICS = [
  { word: 'лес', sounds: 4, letters: 3, syllables: 1 },
  { word: 'книга', sounds: 5, letters: 5, syllables: 2 },
  { word: 'школа', sounds: 5, letters: 5, syllables: 2 },
  { word: 'яма', sounds: 4, letters: 3, syllables: 2 },
  { word: 'мост', sounds: 5, letters: 4, syllables: 1 },
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
  { sentence: 'Птица построила гнездо на высокой ветке.', word: 'ветке', meaning: 'часть дерева' },
  { sentence: 'Мальчик получил отличную оценку.', word: 'оценку', meaning: 'результат проверки знаний' },
  { sentence: 'Река вышла из берегов после дождя.', word: 'берегов', meaning: 'края реки' },
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
    headings: ['Осенний лес', 'Лето в лесу', 'Зимние забавы'],
  },
  {
    title: 'Первый снег',
    passage:
      'Утром выпал первый снег. Дети радостно выбежали во двор. Они лепили снеговика и играли в снежки. Все были счастливы.',
    theme: 'первый снег',
    mainIdea: 'дети радуются первому снегу',
    headings: ['Первый снег', 'Летний дождь', 'Осенний листопад'],
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
  { passage: 'Кошка спала на подоконнике и мурлыкала.', question: 'Где спала кошка?', answer: 'на подоконнике', type: 'fact' },
  { passage: 'Мальчик помог бабушке перейти дорогу.', question: 'Какой мальчик?', answer: 'добрый / внимательный', type: 'inference' },
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
