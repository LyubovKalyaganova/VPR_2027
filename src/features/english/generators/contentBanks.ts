/**
 * Content banks for English E01–E18 (VPR-2027, 4 grade).
 */
import type { EnglishSkillCode } from '../../../data/taxonomy/english';

export type ListeningQuestion = {
  label: string;
  prompt: string;
  options: [string, string, string];
  correct: 1 | 2 | 3;
};

export type ListeningDialogue = {
  id: string;
  title: string;
  transcript: string;
  questions: ListeningQuestion[];
};

export type ReadingQuestion = {
  label: string;
  prompt: string;
  options: [string, string, string];
  correct: 1 | 2 | 3;
  kind: 'specific' | 'true_statement' | 'main_idea' | 'vocab_clue';
};

export type ReadingPassage = {
  id: string;
  title: string;
  text: string;
  questions: ReadingQuestion[];
};

export type GrammarGap = {
  label: string;
  options: [string, string, string];
  correct: 1 | 2 | 3;
  grammarPoint: string;
};

export type GrammarCloze = {
  id: string;
  title: string;
  text: string;
  gaps: GrammarGap[];
};

export type FormField = {
  key: string;
  label: string;
  answer: string;
  acceptableAnswers?: string[];
};

export type FormProfile = {
  id: string;
  title: string;
  text: string;
  fields: FormField[];
};

export type LexisItem = {
  word: string;
  translation: string;
  field: string;
  distractors: string[];
};

export const VPR_2027_ENGLISH_TASKS = [
  { n: '1', focus: 'listening', skills: ['E01', 'E02', 'E18'] as const, points: 5, level: 'B' as const },
  { n: '2', focus: 'reading', skills: ['E04', 'E05', 'E06', 'E07', 'E18'] as const, points: 5, level: 'B' as const },
  { n: '3', focus: 'grammar', skills: ['E08', 'E09', 'E10', 'E11', 'E17', 'E18'] as const, points: 5, level: 'B' as const },
  { n: '4', focus: 'writing', skills: ['E14', 'E15', 'E16'] as const, points: 10, level: 'B' as const },
] as const;

export const LISTENING_DIALOGUES: readonly ListeningDialogue[] = [
  {
    id: 'dlg-school-test',
    title: 'School day',
    transcript:
      'Mum: Are you ready for school, Lily? Lily: Yes, Mum. We have an English test today. I studied new words yesterday. Mum: Good. What will you do after school? Lily: I will go to the library and then meet my friend Anna. We want to read a book about animals.',
    questions: [
      { label: 'A', prompt: 'What test does Lily have today?', options: ['Maths', 'English', 'Music'], correct: 2 },
      { label: 'B', prompt: 'What did Lily do yesterday?', options: ['played football', 'studied new words', 'visited a café'], correct: 2 },
      { label: 'C', prompt: 'Where will Lily go after school first?', options: ['the café', 'the library', 'the park'], correct: 2 },
      { label: 'D', prompt: 'Who will Lily meet?', options: ['Anna', 'Dan', 'Tom'], correct: 1 },
      { label: 'E', prompt: 'What kind of book do they want to read?', options: ['about sports', 'about animals', 'about cooking'], correct: 2 },
    ],
  },
  {
    id: 'dlg-cafe-lunch',
    title: 'Lunch at the café',
    transcript:
      'Waiter: Hello! What would you like? Ben: I want a cheese sandwich and orange juice, please. Waiter: Anything else? Ben: No, thank you. How much is it? Waiter: It is five pounds. Ben: Here you are. Waiter: Thank you. Enjoy your lunch!',
    questions: [
      { label: 'A', prompt: 'What does Ben order to drink?', options: ['milk', 'orange juice', 'tea'], correct: 2 },
      { label: 'B', prompt: 'What food does Ben choose?', options: ['pizza', 'cheese sandwich', 'salad'], correct: 2 },
      { label: 'C', prompt: 'How much does Ben pay?', options: ['three pounds', 'five pounds', 'ten pounds'], correct: 2 },
      { label: 'D', prompt: 'Does Ben order anything else?', options: ['yes, cake', 'yes, soup', 'no'], correct: 3 },
      { label: 'E', prompt: 'Where is Ben?', options: ['at school', 'at the café', 'at home'], correct: 2 },
    ],
  },
  {
    id: 'dlg-shopping-clothes',
    title: 'Shopping for clothes',
    transcript:
      'Shop assistant: Can I help you? Emma: Yes, please. I am looking for a warm jacket. Shop assistant: What size do you need? Emma: Small, please. Shop assistant: Try this blue one. Emma: It is nice, but I prefer the red jacket. How much is the red one? Shop assistant: It is twenty pounds.',
    questions: [
      { label: 'A', prompt: 'What is Emma looking for?', options: ['a dress', 'a warm jacket', 'shoes'], correct: 2 },
      { label: 'B', prompt: 'What size does Emma need?', options: ['medium', 'large', 'small'], correct: 3 },
      { label: 'C', prompt: 'Which jacket does Emma prefer?', options: ['blue', 'red', 'green'], correct: 2 },
      { label: 'D', prompt: 'How much is the red jacket?', options: ['ten pounds', 'twenty pounds', 'thirty pounds'], correct: 2 },
      { label: 'E', prompt: 'Who helps Emma?', options: ['her mum', 'a shop assistant', 'her teacher'], correct: 2 },
    ],
  },
  {
    id: 'dlg-family-weekend',
    title: 'Weekend plans',
    transcript:
      'Dad: What are we doing on Saturday, Kate? Kate: In the morning I am going to help Grandma in the garden. Dad: That is kind. And in the afternoon? Kate: We are going to visit the zoo with my brother Max. Dad: Great! Take your camera.',
    questions: [
      { label: 'A', prompt: 'When are they talking about?', options: ['Friday', 'Saturday', 'Sunday'], correct: 2 },
      { label: 'B', prompt: 'Who will Kate help in the morning?', options: ['Grandma', 'Max', 'Dad'], correct: 1 },
      { label: 'C', prompt: 'Where will they go in the afternoon?', options: ['the cinema', 'the zoo', 'the library'], correct: 2 },
      { label: 'D', prompt: 'Who will go to the zoo with Kate?', options: ['only Dad', 'her brother Max', 'Grandma'], correct: 2 },
      { label: 'E', prompt: 'What does Dad tell Kate to take?', options: ['a book', 'a camera', 'an umbrella'], correct: 2 },
    ],
  },
  {
    id: 'dlg-hobby-music',
    title: 'Music hobby',
    transcript:
      'Teacher: Do you play a musical instrument, Sam? Sam: Yes, I play the guitar. I practice every evening. Teacher: Wonderful! Do you sing too? Sam: Sometimes I sing with my sister. We like pop songs.',
    questions: [
      { label: 'A', prompt: 'What instrument does Sam play?', options: ['piano', 'guitar', 'drums'], correct: 2 },
      { label: 'B', prompt: 'How often does Sam practice?', options: ['every evening', 'once a month', 'never'], correct: 1 },
      { label: 'C', prompt: 'Does Sam always sing?', options: ['yes, every day', 'sometimes', 'never'], correct: 2 },
      { label: 'D', prompt: 'Who sings with Sam?', options: ['his sister', 'his dad', 'his friend'], correct: 1 },
      { label: 'E', prompt: 'What kind of songs do they like?', options: ['pop songs', 'folk songs', 'classical music'], correct: 1 },
    ],
  },
  {
    id: 'dlg-weather-trip',
    title: 'Weather and trip',
    transcript:
      'Ann: Look at the sky, Tom. It is very cloudy today. Tom: Yes, but the weather forecast says it will be sunny tomorrow. Ann: Good. We are going to the lake tomorrow, aren\'t we? Tom: Yes, we are. I will take my fishing rod.',
    questions: [
      { label: 'A', prompt: 'What is the weather like today?', options: ['sunny', 'cloudy', 'snowy'], correct: 2 },
      { label: 'B', prompt: 'What will the weather be like tomorrow?', options: ['rainy', 'sunny', 'windy'], correct: 2 },
      { label: 'C', prompt: 'Where are they going tomorrow?', options: ['to the mountains', 'to the lake', 'to the city'], correct: 2 },
      { label: 'D', prompt: 'What will Tom take?', options: ['a tent', 'a fishing rod', 'a ball'], correct: 2 },
      { label: 'E', prompt: 'Who speaks about the forecast?', options: ['Tom', 'Ann', 'their teacher'], correct: 2 },
    ],
  },
  {
    id: 'dlg-pet-care',
    title: 'Pet care',
    transcript:
      'Vet: How old is your dog, Mia? Mia: He is three years old. His name is Buddy. Vet: Does he eat dry food? Mia: Yes, he does. I walk him in the park every morning before school.',
    questions: [
      { label: 'A', prompt: 'How old is Buddy?', options: ['two years old', 'three years old', 'five years old'], correct: 2 },
      { label: 'B', prompt: 'What is the dog\'s name?', options: ['Max', 'Buddy', 'Rocky'], correct: 2 },
      { label: 'C', prompt: 'What does Buddy eat?', options: ['fish', 'dry food', 'only meat'], correct: 2 },
      { label: 'D', prompt: 'When does Mia walk the dog?', options: ['every morning', 'at night', 'on Sundays only'], correct: 1 },
      { label: 'E', prompt: 'Where does Mia walk Buddy?', options: ['in the park', 'at school', 'in the shop'], correct: 1 },
    ],
  },
  {
    id: 'dlg-schedule-club',
    title: 'After-school club',
    transcript:
      'Coach: Our football club starts at four o\'clock on Tuesdays and Thursdays. Alex: Can I join the club? Coach: Of course. Bring sports shoes and a water bottle. Alex: Thank you. I love football!',
    questions: [
      { label: 'A', prompt: 'When does the club start?', options: ['at three o\'clock', 'at four o\'clock', 'at five o\'clock'], correct: 2 },
      { label: 'B', prompt: 'On which days is the club?', options: ['Mondays and Wednesdays', 'Tuesdays and Thursdays', 'Fridays only'], correct: 2 },
      { label: 'C', prompt: 'What sport is it?', options: ['basketball', 'football', 'tennis'], correct: 2 },
      { label: 'D', prompt: 'What should Alex bring?', options: ['a book', 'sports shoes and a water bottle', 'a guitar'], correct: 2 },
      { label: 'E', prompt: 'How does Alex feel about football?', options: ['he hates it', 'he loves it', 'he is afraid of it'], correct: 2 },
    ],
  },
];

export const READING_PASSAGES: readonly ReadingPassage[] = [
  {
    id: 'read-emma-family',
    title: 'Emma\'s family',
    text:
      'Emma lives in a small town with her parents and her little brother Leo. Every morning Emma walks to school with Leo. Her favourite subject is Art because she likes drawing. After lessons Emma helps her mum cook dinner. On Sundays the family visits Emma\'s grandparents. Leo loves playing with their dog Sunny in the garden.',
    questions: [
      { label: 'A', prompt: 'Who does Emma live with?', options: ['only her mum', 'parents and Leo', 'grandparents'], correct: 2, kind: 'specific' },
      { label: 'B', prompt: 'What is Emma\'s favourite subject?', options: ['Maths', 'Art', 'PE'], correct: 2, kind: 'specific' },
      { label: 'C', prompt: 'Choose the true sentence.', options: ['Emma drives to school.', 'Emma walks to school with Leo.', 'Emma never helps at home.'], correct: 2, kind: 'true_statement' },
      { label: 'D', prompt: 'What is the best title?', options: ['A rainy day', 'Emma\'s family routine', 'A trip to the sea'], correct: 2, kind: 'main_idea' },
      { label: 'E', prompt: 'The word "drawing" is about…', options: ['cooking', 'making pictures', 'running'], correct: 2, kind: 'vocab_clue' },
    ],
  },
  {
    id: 'read-jack-school',
    title: 'Jack at school',
    text:
      'Jack is ten years old. He goes to Green Hill School near his house. Jack is good at Maths and Science. His best friend is Oliver. They sit together in class and play chess at break time. Jack doesn\'t like noisy cafeterias, so he often eats lunch in the quiet library corner with a book.',
    questions: [
      { label: 'A', prompt: 'How old is Jack?', options: ['eight', 'ten', 'twelve'], correct: 2, kind: 'specific' },
      { label: 'B', prompt: 'What subjects is Jack good at?', options: ['Art and Music', 'Maths and Science', 'History and PE'], correct: 2, kind: 'specific' },
      { label: 'C', prompt: 'Choose the true sentence.', options: ['Jack eats in a noisy place.', 'Jack reads in a quiet corner.', 'Jack has no friends.'], correct: 2, kind: 'true_statement' },
      { label: 'D', prompt: 'What is the text mainly about?', options: ['Jack\'s school life', 'a holiday trip', 'cooking'], correct: 1, kind: 'main_idea' },
      { label: 'E', prompt: '"Quiet" means…', options: ['loud', 'not noisy', 'angry'], correct: 2, kind: 'vocab_clue' },
    ],
  },
  {
    id: 'read-sara-pet',
    title: 'Sara and her cat',
    text:
      'Sara has got a white cat named Snowball. Snowball sleeps on Sara\'s bed every night. In the morning Sara feeds her and fills a bowl with fresh water. After school Sara plays with Snowball using a small ball of wool. Sara\'s mum says the cat is very friendly and never bites guests.',
    questions: [
      { label: 'A', prompt: 'What colour is the cat?', options: ['black', 'white', 'grey'], correct: 2, kind: 'specific' },
      { label: 'B', prompt: 'Where does Snowball sleep?', options: ['in the garden', 'on Sara\'s bed', 'in the kitchen'], correct: 2, kind: 'specific' },
      { label: 'C', prompt: 'Choose the true sentence.', options: ['The cat bites guests.', 'The cat is friendly.', 'Sara never feeds the cat.'], correct: 2, kind: 'true_statement' },
      { label: 'D', prompt: 'Best title:', options: ['Snowball the cat', 'A football match', 'A rainy city'], correct: 1, kind: 'main_idea' },
      { label: 'E', prompt: '"Fresh" water is…', options: ['clean and new', 'very hot', 'sweet'], correct: 1, kind: 'vocab_clue' },
    ],
  },
  {
    id: 'read-tom-sport',
    title: 'Tom plays sport',
    text:
      'Tom lives in a big city and loves sport. On Mondays and Wednesdays he goes swimming after school. On Fridays he plays basketball in the sports hall with his team. Tom wants to be strong and healthy. His coach tells him to drink water and sleep nine hours every night.',
    questions: [
      { label: 'A', prompt: 'When does Tom go swimming?', options: ['Tuesdays', 'Mondays and Wednesdays', 'Sundays'], correct: 2, kind: 'specific' },
      { label: 'B', prompt: 'What does Tom play on Fridays?', options: ['tennis', 'basketball', 'football'], correct: 2, kind: 'specific' },
      { label: 'C', prompt: 'Choose the true sentence.', options: ['Tom never drinks water.', 'Tom wants to be healthy.', 'Tom hates sport.'], correct: 2, kind: 'true_statement' },
      { label: 'D', prompt: 'Main idea:', options: ['Tom\'s sport routine', 'a school concert', 'cooking class'], correct: 1, kind: 'main_idea' },
      { label: 'E', prompt: '"Coach" is a person who…', options: ['teaches and trains', 'cooks food', 'sells tickets'], correct: 1, kind: 'vocab_clue' },
    ],
  },
  {
    id: 'read-lisa-village',
    title: 'Lisa in the village',
    text:
      'Last summer Lisa stayed in a small village near a river. There were green fields, birds, and old wooden houses. Lisa rode a bicycle every day and picked berries with her aunt. She didn\'t watch TV much because the internet was slow. Lisa says the village was peaceful and beautiful.',
    questions: [
      { label: 'A', prompt: 'When did Lisa stay in the village?', options: ['last winter', 'last summer', 'last spring'], correct: 2, kind: 'specific' },
      { label: 'B', prompt: 'What did Lisa ride?', options: ['a horse', 'a bicycle', 'a bus'], correct: 2, kind: 'specific' },
      { label: 'C', prompt: 'Choose the true sentence.', options: ['Lisa watched TV all day.', 'The internet was slow.', 'Lisa hated the village.'], correct: 2, kind: 'true_statement' },
      { label: 'D', prompt: 'Best title:', options: ['Summer in the village', 'A maths test', 'Shopping in London'], correct: 1, kind: 'main_idea' },
      { label: 'E', prompt: '"Peaceful" means…', options: ['calm and quiet', 'very loud', 'dangerous'], correct: 1, kind: 'vocab_clue' },
    ],
  },
  {
    id: 'read-noah-weather',
    title: 'Noah and the weather',
    text:
      'Noah checks the weather every morning on his phone. If it rains, he takes an umbrella and wears a waterproof jacket. When the sun shines, Noah puts on a cap and sunglasses. Yesterday the wind was strong, so Noah\'s paper boat flew away in the park. His dad laughed and helped him make a new one.',
    questions: [
      { label: 'A', prompt: 'What does Noah check every morning?', options: ['the news', 'the weather', 'his homework'], correct: 2, kind: 'specific' },
      { label: 'B', prompt: 'What does Noah take when it rains?', options: ['a cap', 'an umbrella', 'sunglasses'], correct: 2, kind: 'specific' },
      { label: 'C', prompt: 'Choose the true sentence.', options: ['The wind was strong yesterday.', 'It snowed all day.', 'Noah lost his phone.'], correct: 1, kind: 'true_statement' },
      { label: 'D', prompt: 'Main idea:', options: ['Noah and different weather', 'a school trip', 'a birthday party'], correct: 1, kind: 'main_idea' },
      { label: 'E', prompt: '"Waterproof" means…', options: ['keeps water out', 'full of holes', 'very heavy'], correct: 1, kind: 'vocab_clue' },
    ],
  },
  {
    id: 'read-mia-food',
    title: 'Mia\'s favourite food',
    text:
      'Mia loves fruit and vegetables. For breakfast she usually eats yogurt with bananas and apples. At school lunch she chooses soup and salad, but she never buys sugary soda. Mia\'s favourite dinner is pasta with tomato sauce. Her brother prefers pizza, so sometimes they cook both meals on Friday evenings.',
    questions: [
      { label: 'A', prompt: 'What does Mia eat for breakfast?', options: ['pizza', 'yogurt with fruit', 'only bread'], correct: 2, kind: 'specific' },
      { label: 'B', prompt: 'What does Mia never buy at school?', options: ['soup', 'sugary soda', 'salad'], correct: 2, kind: 'specific' },
      { label: 'C', prompt: 'Choose the true sentence.', options: ['Mia hates fruit.', 'Her brother prefers pizza.', 'They never cook at home.'], correct: 2, kind: 'true_statement' },
      { label: 'D', prompt: 'Best title:', options: ['Mia\'s meals', 'A football game', 'A train journey'], correct: 1, kind: 'main_idea' },
      { label: 'E', prompt: '"Sugary" means…', options: ['with a lot of sugar', 'without taste', 'very salty'], correct: 1, kind: 'vocab_clue' },
    ],
  },
  {
    id: 'read-alex-routine',
    title: 'Alex\'s daily routine',
    text:
      'Alex gets up at seven o\'clock, brushes his teeth, and eats cereal with milk. He catches the bus at half past seven and arrives at school before nine. After lessons Alex does homework and walks the neighbour\'s dog for pocket money. In the evening he reads adventure books and goes to bed at nine.',
    questions: [
      { label: 'A', prompt: 'When does Alex get up?', options: ['at six', 'at seven', 'at eight'], correct: 2, kind: 'specific' },
      { label: 'B', prompt: 'How does Alex get to school?', options: ['by bus', 'by car', 'on foot only'], correct: 1, kind: 'specific' },
      { label: 'C', prompt: 'Choose the true sentence.', options: ['Alex walks a dog for pocket money.', 'Alex never does homework.', 'Alex goes to bed at midnight.'], correct: 1, kind: 'true_statement' },
      { label: 'D', prompt: 'Main idea:', options: ['Alex\'s daily routine', 'a zoo visit', 'winter holidays'], correct: 1, kind: 'main_idea' },
      { label: 'E', prompt: '"Pocket money" is…', options: ['money a child earns or gets', 'money in a pocket only', 'a school subject'], correct: 1, kind: 'vocab_clue' },
    ],
  },
];

export const GRAMMAR_CLOZE: readonly GrammarCloze[] = [
  {
    id: 'cloze-lake-trip',
    title: 'Trip to the lake',
    text: 'Last summer we A_____ a beautiful lake. It is the B_____ lake in our region. There are many fish, but there are C_____ sharks. Tourists D_____ it every year. People take photos of E_____.',
    gaps: [
      { label: 'A', options: ['visit', 'visited', 'visiting'], correct: 2, grammarPoint: 'Past Simple' },
      { label: 'B', options: ['clean', 'cleaner', 'cleanest'], correct: 3, grammarPoint: 'superlative' },
      { label: 'C', options: ['some', 'any', 'no'], correct: 3, grammarPoint: 'no' },
      { label: 'D', options: ['visit', 'visited', 'visiting'], correct: 1, grammarPoint: 'Present Simple' },
      { label: 'E', options: ['they', 'them', 'their'], correct: 2, grammarPoint: 'pronoun' },
    ],
  },
  {
    id: 'cloze-school-day',
    title: 'School day',
    text: 'Every morning I A_____ up at seven. Now I B_____ breakfast in the kitchen. Tomorrow we C_____ a test in English. I D_____ nervous, but I E_____ hard every evening.',
    gaps: [
      { label: 'A', options: ['get', 'got', 'getting'], correct: 1, grammarPoint: 'Present Simple' },
      { label: 'B', options: ['am having', 'have', 'had'], correct: 1, grammarPoint: 'Present Continuous' },
      { label: 'C', options: ['will have', 'had', 'have'], correct: 1, grammarPoint: 'will' },
      { label: 'D', options: ['am', 'is', 'are'], correct: 1, grammarPoint: 'be' },
      { label: 'E', options: ['study', 'studied', 'studying'], correct: 1, grammarPoint: 'Present Simple' },
    ],
  },
  {
    id: 'cloze-park-weekend',
    title: 'Weekend in the park',
    text: 'On Saturday my friends and I A_____ to the park. We B_____ football for an hour. Later it C_____ cold, so we D_____ home. I E_____ a hot chocolate with my sister.',
    gaps: [
      { label: 'A', options: ['go', 'went', 'going'], correct: 2, grammarPoint: 'Past Simple' },
      { label: 'B', options: ['play', 'played', 'playing'], correct: 2, grammarPoint: 'Past Simple' },
      { label: 'C', options: ['get', 'got', 'gets'], correct: 2, grammarPoint: 'Past Simple' },
      { label: 'D', options: ['go', 'went', 'going'], correct: 2, grammarPoint: 'Past Simple' },
      { label: 'E', options: ['drink', 'drank', 'drinking'], correct: 2, grammarPoint: 'Past Simple' },
    ],
  },
  {
    id: 'cloze-pet-home',
    title: 'Pet at home',
    text: 'My family A_____ a small dog. He B_____ very friendly. Every day I C_____ him after school. Look! He D_____ his toy now. We E_____ to the vet tomorrow.',
    gaps: [
      { label: 'A', options: ['have got', 'has got', 'had got'], correct: 1, grammarPoint: 'have got' },
      { label: 'B', options: ['is', 'are', 'am'], correct: 1, grammarPoint: 'be' },
      { label: 'C', options: ['walk', 'walks', 'walked'], correct: 1, grammarPoint: 'Present Simple' },
      { label: 'D', options: ['is chewing', 'chews', 'chewed'], correct: 1, grammarPoint: 'Present Continuous' },
      { label: 'E', options: ['are going', 'go', 'went'], correct: 1, grammarPoint: 'going to' },
    ],
  },
  {
    id: 'cloze-city-visit',
    title: 'City visit',
    text: 'Last year we A_____ London. It is one of the B_____ cities in Europe. There are C_____ old museums. Many people D_____ photos of Big Ben every day. I E_____ them in my album.',
    gaps: [
      { label: 'A', options: ['visit', 'visited', 'visiting'], correct: 2, grammarPoint: 'Past Simple' },
      { label: 'B', options: ['large', 'larger', 'largest'], correct: 3, grammarPoint: 'superlative' },
      { label: 'C', options: ['some', 'any', 'no'], correct: 1, grammarPoint: 'some' },
      { label: 'D', options: ['take', 'took', 'takes'], correct: 1, grammarPoint: 'Present Simple' },
      { label: 'E', options: ['keep', 'kept', 'keeping'], correct: 1, grammarPoint: 'Present Simple' },
    ],
  },
  {
    id: 'cloze-rainy-day',
    title: 'Rainy day',
    text: 'It A_____ now, so we B_____ at home. I C_____ a book and my brother D_____ a puzzle. Mum says we E_____ to the cinema if the rain stops.',
    gaps: [
      { label: 'A', options: ['rain', 'rains', 'is raining'], correct: 3, grammarPoint: 'Present Continuous' },
      { label: 'B', options: ['stay', 'stayed', 'are staying'], correct: 3, grammarPoint: 'Present Continuous' },
      { label: 'C', options: ['read', 'am reading', 'reads'], correct: 2, grammarPoint: 'Present Continuous' },
      { label: 'D', options: ['does', 'is doing', 'do'], correct: 2, grammarPoint: 'Present Continuous' },
      { label: 'E', options: ['will go', 'went', 'go'], correct: 1, grammarPoint: 'will' },
    ],
  },
  {
    id: 'cloze-birthday-party',
    title: 'Birthday party',
    text: 'Next Saturday I A_____ my birthday party. I B_____ ten years old. My friends C_____ come at three o\'clock. We D_____ pizza and play games. I hope everyone E_____ a great time.',
    gaps: [
      { label: 'A', options: ['have', 'am having', 'had'], correct: 2, grammarPoint: 'going to' },
      { label: 'B', options: ['am', 'is', 'are'], correct: 1, grammarPoint: 'be' },
      { label: 'C', options: ['will', 'would', 'shall'], correct: 1, grammarPoint: 'will' },
      { label: 'D', options: ['eat', 'will eat', 'ate'], correct: 2, grammarPoint: 'will' },
      { label: 'E', options: ['has', 'have', 'had'], correct: 2, grammarPoint: 'Present Simple' },
    ],
  },
  {
    id: 'cloze-music-lesson',
    title: 'Music lesson',
    text: 'I A_____ play the piano, but I B_____ play the drums. My teacher C_____ I practice every day. Right now I D_____ a new song. Yesterday I E_____ for one hour.',
    gaps: [
      { label: 'A', options: ['can', 'must', 'have'], correct: 1, grammarPoint: 'can' },
      { label: 'B', options: ['can\'t', 'can', 'must'], correct: 1, grammarPoint: 'can negative' },
      { label: 'C', options: ['say', 'says', 'said'], correct: 2, grammarPoint: 'Present Simple' },
      { label: 'D', options: ['learn', 'am learning', 'learned'], correct: 2, grammarPoint: 'Present Continuous' },
      { label: 'E', options: ['practice', 'practised', 'practising'], correct: 2, grammarPoint: 'Past Simple' },
    ],
  },
  {
    id: 'cloze-market-shopping',
    title: 'At the market',
    text: 'On Sundays Mum and I A_____ to the market. We B_____ fresh fruit and bread. There aren\'t C_____ expensive toys there. Dad D_____ us carry the bags. We E_____ home tired but happy.',
    gaps: [
      { label: 'A', options: ['go', 'went', 'going'], correct: 1, grammarPoint: 'Present Simple' },
      { label: 'B', options: ['buy', 'buys', 'bought'], correct: 1, grammarPoint: 'Present Simple' },
      { label: 'C', options: ['some', 'any', 'no'], correct: 2, grammarPoint: 'any' },
      { label: 'D', options: ['help', 'helps', 'helped'], correct: 1, grammarPoint: 'Present Simple' },
      { label: 'E', options: ['get', 'got', 'getting'], correct: 1, grammarPoint: 'Present Simple' },
    ],
  },
  {
    id: 'cloze-winter-holiday',
    title: 'Winter holiday',
    text: 'In December we A_____ to the mountains. The hotel B_____ the best in the village. There was C_____ snow on the road. We D_____ skiing every morning. I E_____ photos of the white trees.',
    gaps: [
      { label: 'A', options: ['travel', 'travelled', 'travelling'], correct: 2, grammarPoint: 'Past Simple' },
      { label: 'B', options: ['is', 'was', 'were'], correct: 2, grammarPoint: 'be past' },
      { label: 'C', options: ['no', 'some', 'any'], correct: 1, grammarPoint: 'no' },
      { label: 'D', options: ['go', 'went', 'going'], correct: 2, grammarPoint: 'Past Simple' },
      { label: 'E', options: ['take', 'took', 'takes'], correct: 2, grammarPoint: 'Past Simple' },
    ],
  },
];

export const FORM_PROFILES: readonly FormProfile[] = [
  {
    id: 'form-oliver-green',
    title: 'Oliver Green',
    text:
      'Oliver Green is from the UK. He is ten years old and lives in Bristol. His favourite subject is Science. He likes playing chess and reading comics. Oliver has got a hamster called Chip.',
    fields: [
      { key: 'name', label: 'First name', answer: 'Oliver' },
      { key: 'country', label: 'Country', answer: 'UK', acceptableAnswers: ['Britain', 'the UK'] },
      { key: 'age', label: 'Age (word)', answer: 'ten', acceptableAnswers: ['Ten'] },
      { key: 'city', label: 'City', answer: 'Bristol' },
      { key: 'subject', label: 'Favourite subject', answer: 'Science' },
      { key: 'hobby', label: 'Hobby', answer: 'chess', acceptableAnswers: ['playing chess', 'chess'] },
    ],
  },
  {
    id: 'form-nina-ivanova',
    title: 'Nina Ivanova',
    text:
      'Nina Ivanova comes from Russia. She is nine years old. Nina lives in Kazan with her parents. Maths is her favourite school subject. She enjoys dancing and drawing pictures of cats.',
    fields: [
      { key: 'name', label: 'First name', answer: 'Nina' },
      { key: 'country', label: 'Country', answer: 'Russia' },
      { key: 'age', label: 'Age (word)', answer: 'nine', acceptableAnswers: ['Nine'] },
      { key: 'city', label: 'City', answer: 'Kazan' },
      { key: 'subject', label: 'Favourite subject', answer: 'Maths', acceptableAnswers: ['Math', 'maths', 'math'] },
      { key: 'hobby', label: 'Hobby', answer: 'dancing', acceptableAnswers: ['drawing', 'drawing pictures'] },
    ],
  },
  {
    id: 'form-hassan-ali',
    title: 'Hassan Ali',
    text:
      'Hassan Ali is eleven years old. He is from Egypt and lives in Cairo. Hassan loves football and wants to be a coach. His favourite food is rice with vegetables. He has got two brothers.',
    fields: [
      { key: 'name', label: 'First name', answer: 'Hassan' },
      { key: 'country', label: 'Country', answer: 'Egypt' },
      { key: 'age', label: 'Age (word)', answer: 'eleven', acceptableAnswers: ['Eleven'] },
      { key: 'city', label: 'City', answer: 'Cairo' },
      { key: 'food', label: 'Favourite food', answer: 'rice', acceptableAnswers: ['rice with vegetables', 'vegetables'] },
      { key: 'hobby', label: 'Hobby', answer: 'football' },
    ],
  },
  {
    id: 'form-sophie-martin',
    title: 'Sophie Martin',
    text:
      'Sophie Martin lives in Paris, France. She is eight years old. Sophie goes to a small school near her house. Music is her favourite lesson. She can play the flute and she has got a white rabbit.',
    fields: [
      { key: 'name', label: 'First name', answer: 'Sophie' },
      { key: 'country', label: 'Country', answer: 'France' },
      { key: 'age', label: 'Age (word)', answer: 'eight', acceptableAnswers: ['Eight'] },
      { key: 'city', label: 'City', answer: 'Paris' },
      { key: 'subject', label: 'Favourite subject', answer: 'Music' },
      { key: 'pet', label: 'Pet', answer: 'rabbit', acceptableAnswers: ['a rabbit', 'white rabbit'] },
    ],
  },
  {
    id: 'form-ryan-cooper',
    title: 'Ryan Cooper',
    text:
      'Ryan Cooper is from the USA. He is ten years old and lives in Boston. Ryan likes swimming and collecting stamps. His favourite drink is apple juice, but he does not like milk.',
    fields: [
      { key: 'name', label: 'First name', answer: 'Ryan' },
      { key: 'country', label: 'Country', answer: 'USA', acceptableAnswers: ['America', 'the USA'] },
      { key: 'age', label: 'Age (word)', answer: 'ten', acceptableAnswers: ['Ten'] },
      { key: 'city', label: 'City', answer: 'Boston' },
      { key: 'drink', label: 'Favourite drink', answer: 'juice', acceptableAnswers: ['apple juice', 'Apple juice'] },
      { key: 'hobby', label: 'Hobby', answer: 'swimming', acceptableAnswers: ['collecting stamps', 'stamps'] },
    ],
  },
  {
    id: 'form-zara-khan',
    title: 'Zara Khan',
    text:
      'Zara Khan is nine years old. She lives in Delhi, India, with her grandparents and a parrot. Zara enjoys cooking simple meals with her grandma. English is her favourite subject at school.',
    fields: [
      { key: 'name', label: 'First name', answer: 'Zara' },
      { key: 'country', label: 'Country', answer: 'India' },
      { key: 'age', label: 'Age (word)', answer: 'nine', acceptableAnswers: ['Nine'] },
      { key: 'city', label: 'City', answer: 'Delhi' },
      { key: 'subject', label: 'Favourite subject', answer: 'English' },
      { key: 'pet', label: 'Pet', answer: 'parrot', acceptableAnswers: ['a parrot'] },
    ],
  },
  {
    id: 'form-lucas-santos',
    title: 'Lucas Santos',
    text:
      'Lucas Santos comes from Brazil. He is twelve years old and lives in Rio. Lucas plays volleyball on the beach every weekend. His favourite food is mango. He wants to visit London one day.',
    fields: [
      { key: 'name', label: 'First name', answer: 'Lucas' },
      { key: 'country', label: 'Country', answer: 'Brazil' },
      { key: 'age', label: 'Age (word)', answer: 'twelve', acceptableAnswers: ['Twelve'] },
      { key: 'city', label: 'City', answer: 'Rio' },
      { key: 'food', label: 'Favourite food', answer: 'mango' },
      { key: 'sport', label: 'Sport', answer: 'volleyball' },
    ],
  },
  {
    id: 'form-emily-brown',
    title: 'Emily Brown',
    text:
      'Emily Brown is from Canada. She is ten years old and lives in Toronto. Emily has got a dog named Max. She likes ice skating in winter and riding her bike in summer. Art is her favourite subject.',
    fields: [
      { key: 'name', label: 'First name', answer: 'Emily' },
      { key: 'country', label: 'Country', answer: 'Canada' },
      { key: 'age', label: 'Age (word)', answer: 'ten', acceptableAnswers: ['Ten'] },
      { key: 'city', label: 'City', answer: 'Toronto' },
      { key: 'pet', label: 'Pet', answer: 'dog', acceptableAnswers: ['Max', 'a dog'] },
      { key: 'subject', label: 'Favourite subject', answer: 'Art' },
    ],
  },
  {
    id: 'form-peter-novak',
    title: 'Peter Novak',
    text:
      'Peter Novak lives in Prague, Czech Republic. He is eleven years old. Peter can speak English and German. He loves history museums and building models of castles. His favourite meal is chicken soup.',
    fields: [
      { key: 'name', label: 'First name', answer: 'Peter' },
      { key: 'country', label: 'Country', answer: 'Czech Republic', acceptableAnswers: ['Czechia'] },
      { key: 'age', label: 'Age (word)', answer: 'eleven', acceptableAnswers: ['Eleven'] },
      { key: 'city', label: 'City', answer: 'Prague' },
      { key: 'food', label: 'Favourite meal', answer: 'soup', acceptableAnswers: ['chicken soup', 'chicken'] },
      { key: 'hobby', label: 'Hobby', answer: 'museums', acceptableAnswers: ['history museums', 'building models'] },
    ],
  },
  {
    id: 'form-amy-wilson',
    title: 'Amy Wilson',
    text:
      'Amy Wilson is from Australia. She is nine years old and lives in Sydney near the sea. Amy swims every morning before breakfast. She has got a little brother and a cat called Milo.',
    fields: [
      { key: 'name', label: 'First name', answer: 'Amy' },
      { key: 'country', label: 'Country', answer: 'Australia' },
      { key: 'age', label: 'Age (word)', answer: 'nine', acceptableAnswers: ['Nine'] },
      { key: 'city', label: 'City', answer: 'Sydney' },
      { key: 'hobby', label: 'Hobby', answer: 'swimming' },
      { key: 'pet', label: 'Pet', answer: 'cat', acceptableAnswers: ['Milo', 'a cat'] },
    ],
  },
];

export const LEXIS_E12: readonly LexisItem[] = [
  { word: 'mother', translation: 'мама', field: 'family', distractors: ['teacher', 'window', 'river'] },
  { word: 'breakfast', translation: 'завтрак', field: 'food', distractors: ['homework', 'guitar', 'cloud'] },
  { word: 'classroom', translation: 'класс', field: 'school', distractors: ['sandwich', 'rabbit', 'Tuesday'] },
  { word: 'homework', translation: 'домашняя работа', field: 'school', distractors: ['orange', 'uncle', 'rainy'] },
  { word: 'cereal', translation: 'хлопья', field: 'food', distractors: ['library', 'cousin', 'piano'] },
  { word: 'get up', translation: 'вставать', field: 'routine', distractors: ['mountain', 'pencil', 'singer'] },
  { word: 'brush teeth', translation: 'чистить зубы', field: 'routine', distractors: ['market', 'forest', 'ticket'] },
  { word: 'cousin', translation: 'двоюродный брат/сестра', field: 'family', distractors: ['subject', 'juice', 'windy'] },
];

export const LEXIS_E13: readonly LexisItem[] = [
  { word: 'football', translation: 'футбол', field: 'sport', distractors: ['kitchen', 'cloud', 'aunt'] },
  { word: 'kitten', translation: 'котёнок', field: 'pet', distractors: ['history', 'bread', 'Monday'] },
  { word: 'village', translation: 'деревня', field: 'city_village', distractors: ['pizza', 'teacher', 'sunny'] },
  { word: 'snowy', translation: 'снежный', field: 'weather', distractors: ['pencil', 'brother', 'museum'] },
  { word: 'collect stamps', translation: 'коллекционировать марки', field: 'sport', distractors: ['river', 'desk', 'soup'] },
  { word: 'hiking', translation: 'поход', field: 'sport', distractors: ['milk', 'window', 'cousin'] },
  { word: 'aquarium', translation: 'аквариум', field: 'pet', distractors: ['grammar', 'sandwich', 'Friday'] },
  { word: 'stormy', translation: 'штормовой', field: 'weather', distractors: ['notebook', 'uncle', 'cheese'] },
];

export const REASONING_SCENARIOS = [
  { id: 'rs-past-marker', marker: 'last year', rule: 'Past Simple', evidence: 'Маркер last year указывает на Past Simple — действие в прошлом.' },
  { id: 'rs-every-year', marker: 'every year', rule: 'Present Simple', evidence: 'Маркер every year — обычное, повторяющееся действие, Present Simple.' },
  { id: 'rs-now', marker: 'now', rule: 'Present Continuous', evidence: 'Маркер now — действие происходит сейчас, Present Continuous.' },
  { id: 'rs-the-est', marker: 'the ...est', rule: 'superlative', evidence: 'Форма the + -est — превосходная степень прилагательного.' },
] as const;

export function getListeningById(id: string): ListeningDialogue {
  const item = LISTENING_DIALOGUES.find((d) => d.id === id);
  if (!item) throw new Error(`Listening dialogue ${id} not found`);
  return item;
}

export function getPassageById(id: string): ReadingPassage {
  const item = READING_PASSAGES.find((p) => p.id === id);
  if (!item) throw new Error(`Passage ${id} not found`);
  return item;
}

export function getClozeById(id: string): GrammarCloze {
  const item = GRAMMAR_CLOZE.find((c) => c.id === id);
  if (!item) throw new Error(`Cloze ${id} not found`);
  return item;
}

export function getProfileById(id: string): FormProfile {
  const item = FORM_PROFILES.find((p) => p.id === id);
  if (!item) throw new Error(`Profile ${id} not found`);
  return item;
}

export function hostSkillsForVpr(n: string): readonly EnglishSkillCode[] {
  const row = VPR_2027_ENGLISH_TASKS.find((t) => t.n === n);
  return row?.skills ?? [];
}
