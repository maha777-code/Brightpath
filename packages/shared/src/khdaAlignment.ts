/**
 * How MindVault supports a Dubai private school against published KHDA frameworks.
 * KHDA does not procure or certify school software. Nothing here is an inspection rating.
 */

export const KHDA_DISCLAIMER =
  'The Knowledge and Human Development Authority (KHDA) regulates Dubai’s private schools. It does not procure or certify software for those schools. MindVault is not KHDA-approved, inspected, or rated. A school remains responsible for its licensed curriculum, timetable, safeguarding policy, attendance, external benchmarks, self-evaluation form, and any report it sends to KHDA.';

export const KHDA_SOURCES = [
  {
    title: 'UAE School Inspection Framework',
    detail:
      'The six performance standards KHDA uses for private schools, including curriculum and the protection, care, guidance and support of students.',
    href: 'https://web.khda.gov.ae/en/Resources/Publications/School-Inspection/UAE-School-Inspection-Framework-2015-16',
  },
  {
    title: 'Mandatory subjects guide, 2025-26',
    detail:
      'Arabic, Islamic Education, Social Studies, Moral Education, and Moral, Social and Cultural Studies, including weekly time for schools that do not teach the MoE curriculum.',
    href: 'https://web.khda.gov.ae/getattachment/Resources/Forms/Mandatory_Subjects_Guidelines_En.pdf.aspx?lang=en-GB',
  },
  {
    title: 'Wellbeing Matters',
    detail:
      'KHDA’s guiding framework for monitoring and evaluating student wellbeing in Dubai private schools.',
    href: 'https://web.khda.gov.ae/getattachment/Resources/Publications/School-Inspection/Wellbeing-Matters-A-guiding-framework-for-the-moni/WellbeingMatters-Eng.pdf.aspx?ext=.pdf&lang=en-GB',
  },
  {
    title: 'Executive Council Resolution No. (2) of 2017',
    detail:
      'Requires a Dubai private school to follow its KHDA-approved curriculum and to teach Islamic Studies for Muslim students, and Arabic and Social Studies for all students, when it does not use the UAE general education curriculum.',
    href: 'https://web.khda.gov.ae/getattachment/About-Us/Legislation/Private-Schools-Regulations/Executive-Council-Resolution-No-(2)-of-2017-Regula/ExecutiveCouncilResolutionNo-(2)of2017RegulatingPrivateSchoolsIntheEmirateOfDubai.pdf.aspx?lang=en-GB',
  },
] as const;

export type KhdaPeriod = number | 'Optional';

/** Weekly 40-minute lesson units for non-MoE curricula, from KHDA’s 2025-26 mandatory subjects guide. */
export const KHDA_TIME_GRADES = [
  'G1/Y2',
  'G2/Y3',
  'G3/Y4',
  'G4/Y5',
  'G5/Y6',
  'G6/Y7',
  'G7/Y8',
  'G8/Y9',
  'G9/Y10',
  'G10/Y11',
  'G11/Y12',
  'G12/Y13',
] as const;

export const KHDA_MANDATORY_TIME: { subject: string; periods: KhdaPeriod[]; note?: string }[] = [
  {
    subject: 'Arabic as a first language',
    periods: [6, 6, 6, 6, 6, 5, 4, 4, 4, 4, 4, 4],
    note: 'Grade 4/Year 5 and Grade 5/Year 6 allocations are marked new for 2025-26.',
  },
  {
    subject: 'Arabic as an additional language',
    periods: [4, 4, 4, 4, 4, 4, 4, 4, 4, 'Optional', 'Optional', 'Optional'],
  },
  {
    subject: 'Islamic Education for Arab Muslim students',
    periods: [3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  },
  {
    subject: 'Islamic Education for non-Arab Muslim students',
    periods: [3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    note: 'The Grade 1–3 allocation of 3 lessons is marked new for 2025-26.',
  },
  {
    subject: 'Social Studies for Arab students',
    periods: [1, 1, 1, 1, 1, 1, 1, 1, 1, 'Optional', 'Optional', 'Optional'],
    note: 'Standalone lesson from 2025-26. Not a substitute for another humanities syllabus.',
  },
  {
    subject: 'UAE Moral, Social and Cultural Studies for non-Arab students',
    periods: [1, 1, 1, 1, 1, 1, 1, 1, 1, 'Optional', 'Optional', 'Optional'],
    note: 'Standalone lesson from 2025-26.',
  },
  {
    subject: 'Moral Education for Arab students',
    periods: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    note: 'May be a standalone lesson or integrated, as the school chooses.',
  },
];

export const KHDA_MANDATORY_SUBJECTS = [
  'Arabic as a First Language',
  'Arabic as an Additional Language',
  'Islamic Education',
  'Social Studies',
  'UAE Moral, Social and Cultural Studies',
  'Moral Education',
] as const;

export type KhdaPillar = {
  id: 'safety' | 'curriculum' | 'wellbeing';
  title: string;
  framework: string;
  supports: string[];
  schoolOwns: string[];
};

export const KHDA_PILLARS: KhdaPillar[] = [
  {
    id: 'safety',
    title: 'Safety',
    framework:
      'UAE School Inspection Framework Standard 5: the protection, care, guidance and support of students. Indicator 5.1 covers health and safety, including child protection and safeguarding, and protection from bullying and from harm on the internet and social media. Indicator 5.2 covers care and support, including students of determination and students who are gifted or talented.',
    supports: [
      'Teachers, students, parents, and school staff see only what their role allows. Class and parent links need an invite code.',
      'Each school’s records stay in that school’s workspace.',
      'Student conversations are not used to train AI models.',
      'If a student writes about self-harm, abuse, or danger, Sharada stops the lesson, tells them to speak to a trusted adult, and the teacher can see that the conversation needs a check-in.',
      'Teachers review lesson plans, quizzes, and activities before students use them.',
    ],
    schoolOwns: [
      'The written child-protection and safeguarding policy, staff training, and the register of adults in school.',
      'Premises, transport, medical care, attendance, and supervision.',
      'How the school acts on a concern. MindVault does not replace the school’s safeguarding procedure or a report to the authorities.',
    ],
  },
  {
    id: 'curriculum',
    title: 'Curriculum',
    framework:
      'UAE School Inspection Framework Standard 4: curriculum design, continuity, and adaptation, including links with Emirati culture and UAE society. Executive Council Resolution No. (2) of 2017 and KHDA’s 2025-26 mandatory subjects guide require Islamic Education for Muslim students, and Arabic and social and moral studies for the students those rules name. Content for those subjects comes from the UAE Ministry of Education curriculum. A UK, US, IB, or other foreign syllabus is not a replacement.',
    supports: [
      'The Curriculum & Textbook Studio keeps lessons on the textbook and standards the school uploads, including MoE materials for mandatory subjects.',
      'Class creation lists the KHDA subject names separately from the school’s other licensed subjects.',
      'With KHDA alignment on, the Lesson Plan Generator keeps mandatory-subject lessons on the MoE curriculum, uses the licensed curriculum everywhere else, differentiates for students of determination, and does not describe the plan as a KHDA rating.',
    ],
    schoolOwns: [
      'KHDA approval of the school’s curriculum, and the weekly minutes in the mandatory-subjects table.',
      'Separate Arab and non-Arab classes where KHDA requires them, the language of instruction, and parent consent where the guide requires it.',
      'Achievement records and any report the school sends to KHDA. MindVault does not file those reports.',
    ],
  },
  {
    id: 'wellbeing',
    title: 'Wellbeing',
    framework:
      'KHDA’s Wellbeing Matters framework: leading and pursuing wellbeing, listening to and supporting stakeholders, and enabling wellbeing experiences and outcomes. The inspection framework also judges personal development, safe and healthy lifestyles, Islamic values, awareness of Emirati and world cultures, and social responsibility and innovation.',
    supports: [
      'Lesson plans can include a safe-and-healthy or trusted-adult moment when it belongs in the subject, and a real link to UAE culture when the subject calls for it.',
      'Parents see progress for the children linked to them. Teachers see classwork and can send a guardian summary.',
      'Student distress in Sharada is routed to a person at school, not left inside the chat.',
    ],
    schoolOwns: [
      'The Dubai Student Wellbeing Census, staff wellbeing, and the school’s wellbeing vision and data.',
      'Inspection judgements. MindVault does not produce a wellbeing rating or a self-evaluation score.',
    ],
  },
];

/** Appended to lesson-plan generation only when the teacher has turned KHDA alignment on. */
export const KHDA_LESSON_RULES = `DUBAI PRIVATE SCHOOL (KHDA) ALIGNMENT:
- Support a Dubai private school. Do not say the school, the teacher, or this lesson is approved, inspected, certified, or rated by KHDA.
- Keep the school's licensed curriculum for ordinary subjects. If the lesson is Arabic as a first language, Arabic as an additional language, Islamic Education, Social Studies for Arab students, Moral, Social and Cultural Studies for non-Arab students, or Moral Education for Arab students, base it on the UAE Ministry of Education curriculum. Do not replace that curriculum with a UK, US, IB, or other foreign syllabus.
- Standard Arabic is the language of instruction for Arabic as a first language and for Islamic Education for Arab students, and the primary language for Social Studies for Arab students. For non-Arab students, Islamic Education and Moral, Social and Cultural Studies follow the school's licensed language of instruction. If the teacher wrote in English, draft in English and name the parts the school should teach in Arabic.
- Add one concrete link to UAE culture, values, or society only when it genuinely belongs in this lesson.
- Differentiate for students of determination, students who need more support, and students who need more challenge. Do not move a student who should study Arabic as a first language into an additional-language class.
- Add a short wellbeing beat, such as online safety or asking a trusted adult for help, only when it fits the lesson. Do not invent wellbeing scores or census results.
- The teacher reviews this plan before any student sees it. The school, not this plan, owns safeguarding policy, timetable minutes, attendance, external benchmarks, the self-evaluation form, and reports to KHDA.
- In the standards list, name the MoE curriculum when the subject is mandatory, or the licensed curriculum otherwise. Do not invent a KHDA standard code.`;
