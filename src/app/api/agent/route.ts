import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60; // Allow more time for LLM calls and DB queries

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'gemini-1.5-flash';

const prismaSchema = `
model User {
  id              String           @id @default(uuid())
  email           String           @unique
  passwordHash    String?          @map("password_hash")
  plan            String           @default("free")
  planBillingCycle String          @default("monthly") @map("plan_billing_cycle")
  activatedOn     DateTime?        @map("activated_on")
  role            String
  name            String
  avatarUrl       String?          @map("avatar_url")
  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")
  deletedAt       DateTime?        @map("deleted_at")
  googleId        String?          @unique @map("google_id")
  @@map("users")
}

model School {
  id        String    @id @default(uuid())
  name      String
  code      String    @unique
  createdAt DateTime  @default(now()) @map("created_at")
  @@map("schools")
}

model Class {
  id            String         @id @default(uuid())
  schoolId      String         @map("school_id")
  grade         Int
  section       String         @db.VarChar(1)
  name          String
  createdAt     DateTime       @default(now()) @map("created_at")
  @@unique([schoolId, grade, section])
  @@map("classes")
}

model Subject {
  id          String           @id @default(uuid())
  name        String
  code        String           @unique
  @@map("subjects")
}

model Chapter {
  id                 String              @id @default(uuid())
  subjectId          String              @map("subject_id")
  name               String
  orderIndex         Int                 @map("order_index")
  grade              Int?
  @@map("chapters")
}

model Teacher {
  id                    String           @id @default(uuid())
  userId                String           @unique @map("user_id")
  schoolId              String           @map("school_id")
  location              String?
  teacherRole           String?          @map("teacher_role")
  onboardingCompleted   Boolean          @default(false) @map("onboarding_completed")
  onboardingCompletedAt DateTime?        @map("onboarding_completed_at")
  createdAt             DateTime         @default(now()) @map("created_at")
  phone                 String?          @map("phone")
  phoneVerified         Boolean?         @map("phone_verified")
  @@map("teachers")
}

model Feedback {
  id         String              @id @default(uuid())
  teacherId  String              @map("teacher_id")
  promptKind String              @default("manual") @map("prompt_kind")
  artifactType String?           @map("artifact_type")
  artifactId   String?           @map("artifact_id")
  rating     Int?
  message    String?
  createdAt  DateTime            @default(now()) @map("created_at")
  @@index([teacherId, createdAt])
  @@index([artifactType, artifactId])
  @@map("feedback")
}

model GenerationJob {
  id           String                 @id @default(uuid())
  teacherId    String                 @map("teacher_id")
  artifactType String                 @map("artifact_type")
  artifactId   String                 @map("artifact_id")
  status       String                 @default("queued")
  stage        String                 @default("queued")
  progress     Int                    @default(0)
  payload      Json?
  errorMessage String?                @map("error_message")
  startedAt    DateTime?              @map("started_at")
  completedAt  DateTime?              @map("completed_at")
  createdAt    DateTime               @default(now()) @map("created_at")
  updatedAt    DateTime               @updatedAt @map("updated_at")
  @@index([teacherId, status, createdAt])
  @@index([status, createdAt])
  @@index([artifactType, artifactId])
  @@map("generation_jobs")
}

model Student {
  id                String             @id @default(uuid())
  userId            String             @unique @map("user_id")
  classId           String?            @map("class_id")
  rollNumber        String?            @map("roll_number")
  totalPoints       Int                @default(0) @map("total_points")
  createdAt         DateTime           @default(now()) @map("created_at")
  @@map("students")
}

model Admin {
  id        String   @id @default(uuid())
  userId    String   @unique @map("user_id")
  schoolId  String   @map("school_id")
  createdAt DateTime @default(now()) @map("created_at")
  @@map("admins")
}

model TeacherSubject {
  teacherId String  @map("teacher_id")
  subjectId String  @map("subject_id")
  @@id([teacherId, subjectId])
  @@map("teacher_subjects")
}

model TeacherClass {
  teacherId String  @map("teacher_id")
  classId   String  @map("class_id")
  @@id([teacherId, classId])
  @@map("teacher_classes")
}

model StudentSubject {
  studentId String  @map("student_id")
  subjectId String  @map("subject_id")
  @@id([studentId, subjectId])
  @@map("student_subjects")
}

model Lesson {
  id               String          @id @default(uuid())
  teacherId        String          @map("teacher_id")
  classId          String          @map("class_id")
  subjectId        String          @map("subject_id")
  title            String
  objective        String?
  duration         Int?
  status           String          @default("draft")
  content          String?
  referenceFileUrl String?         @map("reference_file_url")
  createdAt        DateTime        @default(now()) @map("created_at")
  updatedAt        DateTime        @updatedAt @map("updated_at")
  startDate        DateTime?       @map("start_date")
  endDate          DateTime?       @map("end_date")
  topic            String?
  numberOfPeriods  Int?            @map("number_of_periods")
  shareToken       String?         @unique @map("share_token")
  hiddenColumns    Json?           @map("hidden_columns")
  @@index([teacherId, status, createdAt])
  @@map("lessons")
}

model Presentation {
  id              String              @id @default(uuid())
  teacherId        String              @map("teacher_id")
  classId          String              @map("class_id")
  subjectId        String              @map("subject_id")
  title            String
  topic            String?
  numberOfSlides   Int                 @map("number_of_slides")
  styleKey         String              @map("style_key")
  themeKey         String              @map("theme_key")
  language         String              @default("en")
  status           String              @default("draft")
  outline          Json?               @map("outline")
  content          Json?               @map("content")
  referenceFileUrl String?             @map("reference_file_url")
  shareToken       String?             @unique @map("share_token")
  createdAt        DateTime            @default(now()) @map("created_at")
  updatedAt        DateTime            @updatedAt @map("updated_at")
  @@index([teacherId, status, createdAt])
  @@map("presentations")
}

model PresentationChapter {
  presentationId String       @map("presentation_id")
  chapterId      String       @map("chapter_id")
  @@id([presentationId, chapterId])
  @@map("presentation_chapters")
}

model LessonChapter {
  lessonId  String  @map("lesson_id")
  chapterId String  @map("chapter_id")
  @@id([lessonId, chapterId])
  @@map("lesson_chapters")
}

model LessonPeriod {
  id                          String  @id @default(uuid())
  lessonId                    String  @map("lesson_id")
  periodNo                    Int     @map("period_no")
  concept                     String?
  learningOutcomes            String? @map("learning_outcomes")
  teacherLearningProcess      String? @map("teacher_learning_process")
  assessment                  String?
  resources                   String?
  centurySkillsValueEducation String? @map("century_skills_value_education")
  realLifeApplication         String? @map("real_life_application")
  reflection                  String?
  @@unique([lessonId, periodNo])
  @@map("lesson_periods")
}

model Quiz {
  id               String          @id @default(uuid())
  teacherId        String          @map("teacher_id")
  classId          String          @map("class_id")
  subjectId        String          @map("subject_id")
  title            String
  objective        String?
  timeLimit        Int?            @map("time_limit")
  difficultyLevel  String          @default("medium") @map("difficulty_level")
  totalQuestions   Int             @map("total_questions")
  totalMarks       Int             @map("total_marks")
  status           String          @default("draft")
  dueDate          DateTime?       @map("due_date")
  isOptional       Boolean         @default(false) @map("is_optional")
  referenceFileUrl String?         @map("reference_file_url")
  createdAt        DateTime        @default(now()) @map("created_at")
  updatedAt        DateTime        @updatedAt @map("updated_at")
  shareToken       String?         @unique @map("share_token")
  @@index([teacherId, status, createdAt])
  @@map("quizzes")
}

model QuizChapter {
  quizId    String  @map("quiz_id")
  chapterId String  @map("chapter_id")
  @@id([quizId, chapterId])
  @@map("quiz_chapters")
}

model Question {
  id             String           @id @default(uuid())
  quizId         String           @map("quiz_id")
  questionText   String           @map("question_text")
  marks          Int              @default(1)
  orderIndex     Int              @map("order_index")
  createdAt      DateTime         @default(now()) @map("created_at")
  questionType   String           @default("mcq") @map("question_type")
  @@map("questions")
}

model QuestionOption {
  id             String          @id @default(uuid())
  questionId     String          @map("question_id")
  optionLabel    String          @map("option_label") @db.VarChar(1)
  optionText     String          @map("option_text")
  isCorrect      Boolean         @default(false) @map("is_correct")
  @@map("question_options")
}

model QuizAttempt {
  id          String          @id @default(uuid())
  quizId      String          @map("quiz_id")
  studentId   String          @map("student_id")
  score       Int?
  totalMarks  Int?            @map("total_marks")
  percentage  Decimal?        @db.Decimal(5, 2)
  timeTaken   Int?            @map("time_taken")
  status      String          @default("in_progress")
  startedAt   DateTime        @default(now()) @map("started_at")
  submittedAt DateTime?       @map("submitted_at")
  @@map("quiz_attempts")
}

model StudentAnswer {
  id               String          @id @default(uuid())
  attemptId        String          @map("attempt_id")
  questionId       String          @map("question_id")
  selectedOptionId String?         @map("selected_option_id")
  answerText       String?         @map("answer_text")
  isCorrect        Boolean?        @map("is_correct")
  marksObtained    Int             @default(0) @map("marks_obtained")
  @@map("student_answers")
}

model Assessment {
  id               String                   @id @default(uuid())
  teacherId        String                   @map("teacher_id")
  classId          String                   @map("class_id")
  subjectId        String                   @map("subject_id")
  title            String
  objective        String?
  totalMarks       Int                      @map("total_marks")
  difficultyLevel  String                   @default("medium") @map("difficulty_level")
  status           String                   @default("draft")
  isWorksheet      Boolean                  @default(false) @map("is_worksheet")
  referenceBooks   String[]                 @map("reference_books")
  referenceFileUrl String?                  @map("reference_file_url")
  questionPaper    Json?                    @map("question_paper")
  createdAt        DateTime                 @default(now()) @map("created_at")
  updatedAt        DateTime                 @updatedAt @map("updated_at")
  shareToken       String?                  @unique @map("share_token")
  @@index([teacherId, status, createdAt])
  @@index([teacherId, isWorksheet, createdAt])
  @@map("assessments")
}

model AssessmentChapter {
  assessmentId String     @map("assessment_id")
  chapterId    String     @map("chapter_id")
  @@id([assessmentId, chapterId])
  @@map("assessment_chapters")
}

model AssessmentQuestionType {
  id                String       @id @default(uuid())
  assessmentId      String       @map("assessment_id")
  numberOfQuestions Int          @map("number_of_questions")
  marksPerQuestion  Int          @map("marks_per_question")
  questionType      String       @map("question_type")
  @@map("assessment_question_types")
}

model Announcement {
  id            String             @id @default(uuid())
  teacherId     String             @map("teacher_id")
  classId       String             @map("class_id")
  title         String
  content       String
  attachmentUrl String?            @map("attachment_url")
  createdAt     DateTime           @default(now()) @map("created_at")
  @@index([teacherId, createdAt])
  @@map("announcements")
}

model AnnouncementRead {
  id             String       @id @default(uuid())
  announcementId String       @map("announcement_id")
  studentId      String       @map("student_id")
  readAt         DateTime     @default(now()) @map("read_at")
  @@unique([announcementId, studentId])
  @@map("announcement_reads")
}
`;

const SYSTEM_PROMPT = `
You are Savra's highly intelligent AI Data Analyst. You have direct read-only access to our PostgreSQL database. Your job is to answer the user's questions by querying the database and presenting results clearly—not every answer needs visuals or analytical commentary.

Whenever the user asks a question, YOU MUST write a raw PostgreSQL query to fetch the data. 

To run a query, return exactly this format and nothing else (no markdown blocks, no explanations):
SQL_QUERY: SELECT ...

I will then run your query and reply with the raw JSON results. Once you get the results, you should present them back to the user beautifully.

CRITICAL RULES FOR SQL:
1. ONLY USE SELECT STATEMENTS. No INSERT, UPDATE, DELETE, DROP.
2. DO NOT wrap the query in markdown (e.g., \`\`\`sql ... \`\`\`).
3. Limit the results if they could be large (e.g., LIMIT 50).
4. READ THE SCHEMA CAREFULLY. You can ONLY use tables and columns that are explicitly listed below. If you query a table or column that does not exist, the query will fail.
5. If you need a user's name or email, note that 'teachers', 'students', and 'admins' do NOT have name/email columns. They link to the 'users' table via 'user_id'. Example: \`SELECT users.name FROM teachers JOIN users ON teachers.user_id = users.id\`.
6. Use the EXACT @map names defined in the schema. For example, if a model has \`createdAt DateTime @map("created_at")\`, you MUST query the database column as \`created_at\`.
7. The table names in the database correspond to the \`@@map("table_name")\` annotations. E.g., 'Class' is 'classes', 'Teacher' is 'teachers', 'Quiz' is 'quizzes', etc.
8. NEVER invent relationship tables. For example, if you need to know which teacher has which class, look at the schema. There is a 'teacher_classes' table bridging 'teacher_id' and 'class_id'.

PRODUCT CONTEXT (Savra platform—must follow when interpreting data):
- All AI generations are automatically saved/persisted when created. Lessons, quizzes, presentations, and assessment rows exist in the DB as soon as they are generated (for assessments, split worksheet vs question-paper meaning using **assessments.is_worksheet**—see next bullet).
- Status fields on artifact tables (e.g. draft, saved, generated, published—the exact enum varies by table) are legacy/UI workflow labels and are NOT meaningful indicators of user completion, quality, or abandonment for business analysis.
- Do not infer engagement or success from the split between draft vs saved vs generated (or similar). Do not describe high "saved" share as "completion rate" or explain low "generated" counts as users transitioning to another status—these narratives are misleading for Savra.
- For usage and adoption metrics, count artifacts or activity in aggregate (and by teacher, school, time range, etc.) unless the user explicitly asks for a raw status breakdown for debugging.
- Assessments are not one interchangeable artifact type in reporting: artifact_type "assessment" on enums/tables such as generation_jobs is only an umbrella label. Meaningful splits live on the assessments table: distinguish question-paper-style vs worksheet / lesson-plan-style outputs using is_worksheet (database column is_worksheet; Prisma field isWorksheet—worksheet or lesson-plan style when true, question-paper style when false). Prefer GROUP BY is_worksheet, separate breakdown rows, or charts that split both—do not present "assessments" as a single homogeneous category alongside lessons and quizzes unless the user asks only for an umbrella total.

CRITICAL RULES FOR FINAL OUTPUT:
When you have the JSON results and are ready to answer the user:
1. DO NOT mention that you ran a query. Just give the answer.
2. Use GitHub-Flavored Markdown tables only: each ROW must be on its own line. Pattern per row is "| Col | Col |". Include a separator row like "| --- | --- |" after the header row. Never put multiple table rows on the same line. Separate rows with newline characters only—never concatenate rows without newlines between them.
3. CHARTS—default is NONE. Only add a \`\`\`chart block when BOTH are true: (a) there are multiple categories or multiple time buckets worth comparing visually, AND (b) a chart is clearly better than a short table or sentence. Do NOT add charts for: single numbers; yes/no answers; lists under ~8 rows without a comparative story; exploratory “here is what I queried” summaries; greetings or conversational replies. Prefer a markdown table or bold key figures instead. When you do include a chart, put it AFTER the prose (you may also include a table). Use EXACTLY this Markdown fence (three backticks, the word chart, newline, then JSON, then closing fence):

\`\`\`chart
{"type":"bar","title":"Example","data":[{"month":"Jan","n":10},{"month":"Feb","n":24}],"categoryKey":"month","valueKeys":["n"]}
\`\`\`

Chart JSON schema (must be valid JSON, numeric values as numbers not strings):
- type is required: "bar" | "line" | "area" | "pie"
- title: optional string shown above the chart
- For bar, line, area:
  - data: array of flat objects (required), one row per bar/point
  - categoryKey: string — field used for X axis labels (required)
  - valueKeys: string array — one or more numeric fields to plot as series (required, at least one item)
  - valueLabels: optional object mapping each key in valueKeys to a human-readable legend label
- For pie:
  - data: array of objects (required)
  - nameKey: string — label for each slice (required)
  - valueKey: string — numeric field for slice size (required)

Keep datasets reasonably small (about 24 rows or fewer per chart when possible). You may output multiple \`\`\`chart blocks for different views. Do not wrap chart JSON in any other code fence.

4. STYLE: Answer the question directly first—numbers, facts, tables as needed. Do NOT prepend or append generic “insights” or “takeaways” sections unless the user asked for analysis, implications, recommendations, trends, or a summary—simple factual questions get a factual answer only. One short concluding sentence is fine when it genuinely clarifies ambiguity; skip boilerplate bullets like “Key insight:”.

Here is the exact Database Schema:
${prismaSchema}
`;

async function callGemini(contents: any[]) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      generationConfig: {
        temperature: 0.1, // Keep it deterministic for SQL
      }
    })
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Gemini API Error:', err);
    throw new Error('Failed to generate response from AI');
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return text || '';
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    // Format messages for Gemini API
    const geminiMessages = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    let llmResponse = await callGemini(geminiMessages);
    let attempts = 0;
    const maxAttempts = 3;

    // Loop for DB queries
    while (llmResponse.trim().startsWith('SQL_QUERY:') && attempts < maxAttempts) {
      attempts++;
      let query = llmResponse.replace('SQL_QUERY:', '').trim();
      
      // Strip out markdown formatting if the model still adds it
      if (query.startsWith('```sql')) {
        query = query.replace(/^```sql/, '').replace(/```$/, '').trim();
      } else if (query.startsWith('```')) {
        query = query.replace(/^```/, '').replace(/```$/, '').trim();
      }

      console.log('Agent is running query:', query);

      // Basic safety check
      const lowerQuery = query.toLowerCase();
      if (lowerQuery.includes('delete') || lowerQuery.includes('update') || lowerQuery.includes('insert') || lowerQuery.includes('drop')) {
        llmResponse = "Sorry, I can only execute SELECT queries for safety reasons.";
        break;
      }

      try {
        const result = await prisma.$queryRawUnsafe(query);
        // Add model's query attempt to history
        geminiMessages.push({ role: 'model', parts: [{ text: llmResponse }] });
        
        // Add query result to history
        const resultString = JSON.stringify(result, (key, value) => 
          typeof value === 'bigint' ? value.toString() : value
        );
        geminiMessages.push({ 
          role: 'user', 
          parts: [{ text: `Query successful. Result: ${resultString.slice(0, 10000)}... (truncated if too long). Now answer the user directly. Format in Markdown only as needed (tables/lists). Omit charts unless a visual comparison genuinely helps; omit extra “insights” unless analysis was requested.` }] 
        });

        // Call Gemini again
        llmResponse = await callGemini(geminiMessages);
      } catch (dbError: any) {
        console.error('DB Query Error:', dbError);
        geminiMessages.push({ role: 'model', parts: [{ text: llmResponse }] });
        geminiMessages.push({ 
          role: 'user', 
          parts: [{ text: `Query failed with error: ${dbError.message}. The query used a column or table that does not exist, or there was a syntax error. Read the provided schema carefully and try again.` }] 
        });
        llmResponse = await callGemini(geminiMessages);
      }
    }

    return NextResponse.json({ content: llmResponse });
  } catch (error: any) {
    console.error('Agent API Error:', error);
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
}
