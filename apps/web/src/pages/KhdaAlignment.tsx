import { Link } from 'react-router-dom';
import { PolicyLayout } from '@/components/PolicyLayout';
import {
  KHDA_DISCLAIMER,
  KHDA_MANDATORY_TIME,
  KHDA_PILLARS,
  KHDA_SOURCES,
  KHDA_TIME_GRADES,
} from '@brightpath/shared';

export default function KhdaAlignment() {
  return (
    <PolicyLayout wide lastUpdated="October 2026" title="KHDA alignment">
      <section className="space-y-3">
        <p>{KHDA_DISCLAIMER}</p>
        <p>
          For a Dubai private school, turn on KHDA alignment in the{' '}
          <Link to="/teacher/tools/lesson-plan-generator" className="font-semibold text-cyan-400 hover:text-cyan-300">
            Lesson Plan Generator
          </Link>{' '}
          or the{' '}
          <Link to="/tools/curriculum-textbook-studio" className="font-semibold text-cyan-400 hover:text-cyan-300">
            Curriculum & Textbook Studio
          </Link>
          . The choice is saved in this browser.
        </p>
      </section>

      {KHDA_PILLARS.map((pillar) => (
        <section key={pillar.id} className="space-y-4">
          <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">{pillar.title}</h2>
          <p>{pillar.framework}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
              <h3 className="text-lg font-bold text-white">What MindVault supports</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                {pillar.supports.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
              <h3 className="text-lg font-bold text-white">What the school still owns</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                {pillar.schoolOwns.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ))}

      <section className="space-y-4">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
          Mandatory subject time, 2025-26
        </h2>
        <p>
          These are KHDA’s published weekly lesson units for a Dubai private school that does not offer the UAE
          Ministry of Education curriculum. One unit is a 40-minute lesson. Schools may change the length of a lesson
          if the weekly total still matches. MoE-curriculum schools follow the Ministry’s own requirements, including
          Ministerial Resolution 194 of 2023. MindVault does not build the timetable.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-slate-950 text-slate-200">
              <tr>
                <th className="px-3 py-2 font-semibold">Subject</th>
                {KHDA_TIME_GRADES.map((grade) => (
                  <th key={grade} className="px-2 py-2 font-semibold">
                    {grade}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {KHDA_MANDATORY_TIME.map((row) => (
                <tr key={row.subject} className="border-t border-slate-800">
                  <th className="px-3 py-2 font-semibold text-white">
                    {row.subject}
                    {row.note ? <span className="mt-1 block font-normal text-slate-400">{row.note}</span> : null}
                  </th>
                  {row.periods.map((period, index) => (
                    <td key={`${row.subject}-${KHDA_TIME_GRADES[index]}`} className="px-2 py-2 text-center">
                      {period}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Arab and non-Arab groups follow the student’s nationality on their Emirates ID. Islamic Education is for
          Muslim students. Arabic as a first language, Islamic Education for Arab students, and Social Studies for Arab
          students are taught mainly in Standard Arabic, in separate classes from the non-Arab groups.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">If a student is in danger</h2>
        <p>
          MindVault tells the student to speak to a trusted adult and follow the school’s safeguarding procedure. A
          teacher can see that the conversation needs a check-in. Public contacts, for the student or the adult they
          tell, are the Ministry of Interior Child Protection Centre on 116111 in the UAE, and the Dubai Community
          Development Authority on 800988. These are not KHDA inspection channels.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">Sources</h2>
        <ul className="list-disc space-y-3 pl-6">
          {KHDA_SOURCES.map((source) => (
            <li key={source.href}>
              <a href={source.href} className="font-semibold text-cyan-400 hover:text-cyan-300" target="_blank" rel="noopener noreferrer">
                {source.title}
              </a>
              <span className="block text-slate-400">{source.detail}</span>
            </li>
          ))}
        </ul>
        <p>
          Related: <Link to="/security" className="font-semibold text-cyan-400 hover:text-cyan-300">Security Overview</Link> and{' '}
          <Link to="/privacy" className="font-semibold text-cyan-400 hover:text-cyan-300">Privacy Policy</Link>.
        </p>
      </section>
    </PolicyLayout>
  );
}
