import { useEffect, useState } from 'react';
import {
  CLASSROOM_BANNER_THEMES,
  submissionStats,
  type ClassroomAction,
  type ClassroomBannerTheme,
  type ClassroomClass,
  type ClassroomMemberRole,
  type ClassroomPost,
  type ClassroomPostType,
  type ClassroomRubricCriterion,
  type ClassroomStateResponse,
  type ClassroomSubmission,
  type ClassroomViewAs,
  type ClassroomWorkspace,
} from '@brightpath/shared';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';

const THEME: Record<ClassroomBannerTheme, string> = {
  blue: 'bg-[#1a73e8]',
  green: 'bg-[#188038]',
  purple: 'bg-[#9334e6]',
  rose: 'bg-[#d93025]',
  amber: 'bg-[#e37400]',
  teal: 'bg-[#007b83]',
};

type Tab = 'stream' | 'classwork' | 'people' | 'grades';

function personName(ws: ClassroomWorkspace, id: string) {
  return ws.people.find((person) => person.id === id)?.name || 'Member';
}

function fmtDate(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ClassroomApp() {
  const [data, setData] = useState<ClassroomStateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [viewAs, setViewAs] = useState<ClassroomViewAs>('teacher');
  const [studentId, setStudentId] = useState<string>('');
  const [openClassId, setOpenClassId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('stream');
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [gradeId, setGradeId] = useState<string | null>(null);
  const [studentWorkId, setStudentWorkId] = useState<string | null>(null);

  const ws = data?.workspace;
  const actor = data?.actor;

  const apply = async (action: ClassroomAction) => {
    setBusy(true);
    setError(null);
    try {
      const next = await api.classroomAction(action);
      setData(next);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Classroom action failed.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    api
      .classroomState()
      .then((res) => {
        if (cancelled) return;
        setData(res);
        const firstStudent = res.workspace.people.find((person) => person.role === 'student');
        if (firstStudent) setStudentId(firstStudent.id);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not open Classroom.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cls = ws?.classes.find((item) => item.id === openClassId) || null;
  const isTeacher = viewAs === 'teacher';
  const actingStudent = studentId || ws?.people.find((person) => person.role === 'student')?.id || '';

  if (loading) {
    return <div className="p-10 text-center text-sm text-[#5f6368]">Opening Classroom…</div>;
  }
  if (error && !ws) {
    return (
      <div className="p-10 text-center">
        <p className="text-[#d93025]">{error}</p>
        <Link to="/teacher/tools" className="mt-3 inline-block text-[#1a73e8]">
          Back to AI tools
        </Link>
      </div>
    );
  }
  if (!ws || !actor) return null;

  return (
    <div className="classroom-app min-h-[70vh] overflow-hidden rounded-2xl border border-[#dadce0] bg-[#f8f9fa] text-[#202124]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dadce0] bg-white px-4 py-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#5f6368]">School / Tutor center</p>
          <h1 className="text-xl font-medium">Classroom</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-[#dadce0] p-0.5 text-sm">
            <button
              type="button"
              className={`rounded-full px-3 py-1 ${isTeacher ? 'bg-[#e8f0fe] text-[#1a73e8]' : ''}`}
              onClick={() => setViewAs('teacher')}
            >
              Teacher view
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 ${!isTeacher ? 'bg-[#e8f0fe] text-[#1a73e8]' : ''}`}
              onClick={() => setViewAs('student')}
            >
              Student view
            </button>
          </div>
          {!isTeacher ? (
            <select
              value={actingStudent}
              onChange={(e) => setStudentId(e.target.value)}
              className="rounded-full border border-[#dadce0] px-3 py-1 text-sm"
            >
              {ws.people
                .filter((person) => person.role === 'student')
                .map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
            </select>
          ) : null}
          <Link to="/teacher/tools" className="text-sm text-[#1a73e8]">
            Tools hub
          </Link>
        </div>
      </header>
      {error ? <p className="bg-[#fce8e6] px-4 py-2 text-sm text-[#c5221f]">{error}</p> : null}
      {busy ? <p className="px-4 py-1 text-xs text-[#5f6368]">Saving…</p> : null}

      {!cls ? (
        <Dashboard
          ws={ws}
          actorId={actor.id}
          showArchived={showArchived}
          onShowArchived={setShowArchived}
          onOpen={(id) => {
            setOpenClassId(id);
            setTab('stream');
          }}
          onCreate={() => setCreateOpen(true)}
          onJoin={() => setJoinOpen(true)}
          onArchive={(id) => void apply({ type: showArchived ? 'restore_class' : 'archive_class', classId: id })}
        />
      ) : (
        <ClassView
          ws={ws}
          cls={cls}
          tab={tab}
          isTeacher={isTeacher}
          studentId={actingStudent}
          onTab={setTab}
          onBack={() => setOpenClassId(null)}
          onAssign={() => setAssignOpen(true)}
          onGrade={(id) => setGradeId(id)}
          onStudentWork={(id) => setStudentWorkId(id)}
          onAction={(action) => void apply(action)}
        />
      )}

      {createOpen ? (
        <CreateClassModal
          onClose={() => setCreateOpen(false)}
          onCreate={async (payload) => {
            const next = await apply({ type: 'create_class', ...payload });
            if (next) setCreateOpen(false);
          }}
        />
      ) : null}
      {joinOpen ? (
        <JoinModal
          onClose={() => setJoinOpen(false)}
          onJoin={async (code) => {
            const next = await apply({ type: 'join_class', code });
            if (next) setJoinOpen(false);
          }}
        />
      ) : null}
      {assignOpen && cls ? (
        <CreateWorkModal
          ws={ws}
          classId={cls.id}
          onClose={() => setAssignOpen(false)}
          onCreate={async (payload) => {
            const next = await apply(payload);
            if (next) setAssignOpen(false);
          }}
        />
      ) : null}
      {gradeId ? (
        <GradeDrawer
          ws={ws}
          assignmentId={gradeId}
          onClose={() => setGradeId(null)}
          onGrade={(payload) => void apply(payload)}
        />
      ) : null}
      {studentWorkId ? (
        <StudentWorkModal
          ws={ws}
          assignmentId={studentWorkId}
          studentId={actingStudent}
          onClose={() => setStudentWorkId(null)}
          onSubmit={async (payload) => {
            const next = await apply(payload);
            if (next) setStudentWorkId(null);
          }}
        />
      ) : null}
    </div>
  );
}

function Dashboard({
  ws,
  actorId,
  showArchived,
  onShowArchived,
  onOpen,
  onCreate,
  onJoin,
  onArchive,
}: {
  ws: ClassroomWorkspace;
  actorId: string;
  showArchived: boolean;
  onShowArchived: (value: boolean) => void;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onJoin: () => void;
  onArchive: (id: string) => void;
}) {
  const cards = ws.classes.filter((item) => item.archived === showArchived);
  return (
    <div className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[#5f6368]">{cards.length} classes</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => onShowArchived(!showArchived)} className="rounded-full border border-[#dadce0] bg-white px-3 py-1.5 text-sm">
            {showArchived ? 'Active classes' : 'Archived'}
          </button>
          <button type="button" onClick={onJoin} className="rounded-full border border-[#dadce0] bg-white px-3 py-1.5 text-sm">
            Join class
          </button>
          <button type="button" onClick={onCreate} className="rounded-full bg-[#1a73e8] px-3 py-1.5 text-sm text-white">
            Create class
          </button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((item) => {
          const teacher = ws.people.find((person) => person.id === item.ownerId);
          return (
            <article key={item.id} className="overflow-hidden rounded-xl border border-[#dadce0] bg-white shadow-sm">
              <button type="button" onClick={() => onOpen(item.id)} className={`h-28 w-full p-4 text-left text-white ${THEME[item.bannerTheme]}`}>
                <h2 className="text-lg font-medium">{item.title}</h2>
                <p className="text-sm text-white/90">{item.section || item.subject}</p>
              </button>
              <div className="flex items-center justify-between px-4 py-3 text-sm text-[#5f6368]">
                <span>{teacher?.name || personName(ws, actorId)}</span>
                <button type="button" onClick={() => onArchive(item.id)} className="text-[#1a73e8]">
                  {showArchived ? 'Restore' : 'Archive'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ClassView({
  ws,
  cls,
  tab,
  isTeacher,
  studentId,
  onTab,
  onBack,
  onAssign,
  onGrade,
  onStudentWork,
  onAction,
}: {
  ws: ClassroomWorkspace;
  cls: ClassroomClass;
  tab: Tab;
  isTeacher: boolean;
  studentId: string;
  onTab: (tab: Tab) => void;
  onBack: () => void;
  onAssign: () => void;
  onGrade: (id: string) => void;
  onStudentWork: (id: string) => void;
  onAction: (action: ClassroomAction) => void;
}) {
  const tabs: Tab[] = ['stream', 'classwork', 'people', 'grades'];
  return (
    <div>
      <div className={`px-5 py-4 text-white ${THEME[cls.bannerTheme]}`}>
        <button type="button" onClick={onBack} className="text-sm text-white/80">
          ← All classes
        </button>
        <h2 className="mt-1 text-2xl font-medium">{cls.title}</h2>
        <p className="text-sm text-white/90">
          {cls.section} · Code {cls.code} · {cls.room}
        </p>
        <a href={cls.meetLink} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-sm">
          Join Meet
        </a>
      </div>
      <div className="flex gap-4 border-b border-[#dadce0] bg-white px-5">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onTab(item)}
            className={`border-b-2 py-3 text-sm capitalize ${tab === item ? 'border-[#1a73e8] text-[#1a73e8]' : 'border-transparent text-[#5f6368]'}`}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === 'stream' ? <StreamTab ws={ws} cls={cls} isTeacher={isTeacher} onAction={onAction} /> : null}
      {tab === 'classwork' ? (
        <ClassworkTab
          ws={ws}
          cls={cls}
          isTeacher={isTeacher}
          studentId={studentId}
          onAssign={onAssign}
          onGrade={onGrade}
          onStudentWork={onStudentWork}
          onAction={onAction}
        />
      ) : null}
      {tab === 'people' ? <PeopleTab ws={ws} cls={cls} isTeacher={isTeacher} onAction={onAction} /> : null}
      {tab === 'grades' ? <GradesTab ws={ws} cls={cls} /> : null}
    </div>
  );
}

function StreamTab({
  ws,
  cls,
  isTeacher,
  onAction,
}: {
  ws: ClassroomWorkspace;
  cls: ClassroomClass;
  isTeacher: boolean;
  onAction: (action: ClassroomAction) => void;
}) {
  const [draft, setDraft] = useState({ title: '', body: '', youtubeUrl: '', driveUrl: '', webUrl: '', fileName: '' });
  const posts = ws.posts.filter((post) => post.classId === cls.id);
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-5">
      {isTeacher ? (
        <form
          className="space-y-2 rounded-xl border border-[#dadce0] bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.body.trim() && !draft.title.trim()) return;
            onAction({
              type: 'create_post',
              classId: cls.id,
              postType: 'announcement',
              title: draft.title || 'Announcement',
              ...draft,
            });
            setDraft({ title: '', body: '', youtubeUrl: '', driveUrl: '', webUrl: '', fileName: '' });
          }}
        >
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Share with your class" className="w-full rounded-lg border border-[#dadce0] px-3 py-2" />
          <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={3} className="w-full rounded-lg border border-[#dadce0] px-3 py-2" placeholder="Announce something…" />
          <div className="grid gap-2 md:grid-cols-3">
            <input value={draft.youtubeUrl} onChange={(e) => setDraft({ ...draft, youtubeUrl: e.target.value })} placeholder="YouTube link" className="rounded-lg border border-[#dadce0] px-3 py-2 text-sm" />
            <input value={draft.driveUrl} onChange={(e) => setDraft({ ...draft, driveUrl: e.target.value })} placeholder="Drive link" className="rounded-lg border border-[#dadce0] px-3 py-2 text-sm" />
            <input value={draft.webUrl} onChange={(e) => setDraft({ ...draft, webUrl: e.target.value })} placeholder="Web link" className="rounded-lg border border-[#dadce0] px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="rounded-full bg-[#1a73e8] px-4 py-1.5 text-sm text-white">
            Post
          </button>
        </form>
      ) : null}
      {posts.map((post) => (
        <PostCard key={post.id} ws={ws} post={post} isTeacher={isTeacher} onAction={onAction} />
      ))}
    </div>
  );
}

function PostCard({
  ws,
  post,
  isTeacher,
  onAction,
}: {
  ws: ClassroomWorkspace;
  post: ClassroomPost;
  isTeacher: boolean;
  onAction: (action: ClassroomAction) => void;
}) {
  const [comment, setComment] = useState('');
  const comments = ws.comments.filter((item) => item.postId === post.id);
  return (
    <article className="rounded-xl border border-[#dadce0] bg-white p-4">
      <p className="text-xs uppercase text-[#5f6368]">{post.type}</p>
      <h3 className="text-lg font-medium">{post.title}</h3>
      <p className="mt-1 text-sm">{post.body}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-sm text-[#1a73e8]">
        {post.youtubeUrl ? <a href={post.youtubeUrl} target="_blank" rel="noreferrer">YouTube</a> : null}
        {post.driveUrl ? <a href={post.driveUrl} target="_blank" rel="noreferrer">Drive</a> : null}
        {post.webUrl ? <a href={post.webUrl} target="_blank" rel="noreferrer">Link</a> : null}
        {post.fileName ? <span className="text-[#5f6368]">{post.fileName}</span> : null}
      </div>
      <ul className="mt-3 space-y-2 border-t border-[#eee] pt-3">
        {comments.map((item) => (
          <li key={item.id} className="flex justify-between gap-3 text-sm">
            <span>
              <b>{personName(ws, item.authorId)}</b> {item.body}
            </span>
            {isTeacher ? (
              <button type="button" className="text-[#d93025]" onClick={() => onAction({ type: 'delete_comment', commentId: item.id })}>
                Delete
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!comment.trim()) return;
          onAction({ type: 'add_comment', postId: post.id, body: comment });
          setComment('');
        }}
      >
        <input value={comment} onChange={(e) => setComment(e.target.value)} className="flex-1 rounded-full border border-[#dadce0] px-3 py-1.5 text-sm" placeholder="Add a class comment" />
        <button type="submit" className="text-sm text-[#1a73e8]">
          Reply
        </button>
      </form>
    </article>
  );
}

function ClassworkTab({
  ws,
  cls,
  isTeacher,
  studentId,
  onAssign,
  onGrade,
  onStudentWork,
  onAction,
}: {
  ws: ClassroomWorkspace;
  cls: ClassroomClass;
  isTeacher: boolean;
  studentId: string;
  onAssign: () => void;
  onGrade: (id: string) => void;
  onStudentWork: (id: string) => void;
  onAction: (action: ClassroomAction) => void;
}) {
  const [topicName, setTopicName] = useState('');
  const topics = ws.topics.filter((item) => item.classId === cls.id);
  const work = ws.posts.filter((post) => post.classId === cls.id && post.type !== 'announcement');
  return (
    <div className="space-y-4 p-5">
      {isTeacher ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onAssign} className="rounded-full bg-[#1a73e8] px-3 py-1.5 text-sm text-white">
            Create
          </button>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!topicName.trim()) return;
              onAction({ type: 'create_topic', classId: cls.id, name: topicName });
              setTopicName('');
            }}
          >
            <input value={topicName} onChange={(e) => setTopicName(e.target.value)} placeholder="New topic" className="rounded-full border border-[#dadce0] px-3 py-1.5 text-sm" />
            <button type="submit" className="text-sm text-[#1a73e8]">
              Add topic
            </button>
          </form>
        </div>
      ) : null}
      {topics.map((topic) => (
        <section key={topic.id}>
          <h3 className="mb-2 border-b border-[#dadce0] pb-1 font-medium">{topic.name}</h3>
          <div className="space-y-2">
            {work
              .filter((post) => post.topicId === topic.id)
              .map((post) => {
                const stats = submissionStats(ws.submissions.filter((item) => item.assignmentId === post.id));
                const mine = ws.submissions.find((item) => item.assignmentId === post.id && item.studentId === studentId);
                return (
                  <div key={post.id} className="flex flex-wrap items-center justify-between rounded-xl border border-[#dadce0] bg-white px-4 py-3">
                    <div>
                      <p className="font-medium">{post.title}</p>
                      <p className="text-sm text-[#5f6368]">
                        {post.type} · {post.points ?? 0} pts · due {fmtDate(post.dueAt) || 'none'}
                      </p>
                    </div>
                    {isTeacher ? (
                      <button type="button" onClick={() => onGrade(post.id)} className="text-sm text-[#1a73e8]">
                        {stats.turnedIn} turned in · {stats.assigned + stats.missing} assigned
                      </button>
                    ) : (
                      <button type="button" onClick={() => onStudentWork(post.id)} className="text-sm text-[#1a73e8]">
                        {mine?.status.replace('_', ' ') || 'Open'}
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}

function PeopleTab({
  ws,
  cls,
  isTeacher,
  onAction,
}: {
  ws: ClassroomWorkspace;
  cls: ClassroomClass;
  isTeacher: boolean;
  onAction: (action: ClassroomAction) => void;
}) {
  const [invite, setInvite] = useState({ name: '', email: '', role: 'student' as ClassroomMemberRole });
  const members = ws.members.filter((member) => member.classId === cls.id);
  const grouped = (role: ClassroomMemberRole) =>
    members.filter((member) => member.role === role).map((member) => ({ member, person: ws.people.find((item) => item.id === member.userId) }));
  return (
    <div className="space-y-6 p-5">
      {isTeacher ? (
        <form
          className="grid gap-2 rounded-xl border border-[#dadce0] bg-white p-4 md:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!invite.email.trim()) return;
            onAction({ type: 'invite_member', classId: cls.id, ...invite });
            setInvite({ name: '', email: '', role: invite.role });
          }}
        >
          <input value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} placeholder="Name" className="rounded-lg border border-[#dadce0] px-3 py-2" />
          <input value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} placeholder="Email" className="rounded-lg border border-[#dadce0] px-3 py-2" />
          <select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as ClassroomMemberRole })} className="rounded-lg border border-[#dadce0] px-3 py-2">
            <option value="student">Student</option>
            <option value="teacher">Co-teacher</option>
            <option value="guardian">Guardian</option>
          </select>
          <button type="submit" className="rounded-full bg-[#1a73e8] px-3 py-2 text-white">
            Invite
          </button>
        </form>
      ) : null}
      <p className="text-sm text-[#5f6368]">
        Invite link: <code className="rounded bg-[#e8eaed] px-1">{typeof window !== 'undefined' ? `${window.location.origin}/teacher/tools/classroom?join=${cls.inviteToken}` : cls.inviteToken}</code>
      </p>
      {(['teacher', 'student', 'guardian'] as const).map((role) => (
        <section key={role}>
          <h3 className="mb-2 font-medium capitalize">{role}s</h3>
          <ul className="divide-y divide-[#eee] rounded-xl border border-[#dadce0] bg-white">
            {grouped(role).map(({ member, person }) => (
              <li key={member.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>
                  {person?.name} · {person?.email}
                  {member.muted ? ' · muted' : ''}
                </span>
                {isTeacher && role === 'student' ? (
                  <span className="flex gap-3">
                    <a href={`mailto:${person?.email}`} className="text-[#1a73e8]">
                      Email
                    </a>
                    <button type="button" onClick={() => onAction({ type: 'mute_member', memberId: member.id, muted: !member.muted })}>
                      {member.muted ? 'Unmute' : 'Mute'}
                    </button>
                    <button type="button" onClick={() => onAction({ type: 'remove_member', memberId: member.id })} className="text-[#d93025]">
                      Remove
                    </button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {isTeacher ? (
        <div className="rounded-xl border border-[#dadce0] bg-white p-4">
          <h3 className="font-medium">Guardian summaries</h3>
          <p className="text-sm text-[#5f6368]">Cadence: {cls.guardianDigest}. Sends a queued digest of missing work, upcoming assignments, and stream activity.</p>
          <div className="mt-2 flex gap-2">
            <select
              value={cls.guardianDigest}
              onChange={(e) => onAction({ type: 'update_class', classId: cls.id, patch: { guardianDigest: e.target.value as ClassroomClass['guardianDigest'] } })}
              className="rounded-lg border border-[#dadce0] px-3 py-1.5 text-sm"
            >
              <option value="off">Off</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
            <button type="button" onClick={() => onAction({ type: 'send_guardian_digest', classId: cls.id })} className="rounded-full bg-[#1a73e8] px-3 py-1.5 text-sm text-white">
              Send digest now
            </button>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {ws.guardianEmails
              .filter((item) => item.classId === cls.id)
              .slice(0, 5)
              .map((item) => (
                <li key={item.id} className="rounded-lg bg-[#f8f9fa] p-2">
                  <b>{item.subject}</b> → {item.to}
                  <pre className="mt-1 whitespace-pre-wrap text-[#5f6368]">{item.body}</pre>
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function GradesTab({ ws, cls }: { ws: ClassroomWorkspace; cls: ClassroomClass }) {
  const assignments = ws.posts.filter((post) => post.classId === cls.id && ['assignment', 'quiz', 'question'].includes(post.type));
  const students = ws.members
    .filter((member) => member.classId === cls.id && member.role === 'student')
    .map((member) => ws.people.find((person) => person.id === member.userId))
    .filter(Boolean);
  const weight = (post: ClassroomPost) =>
    cls.gradingMode === 'weighted'
      ? (cls.weights.find((item) => item.category === post.category)?.percent || 0) / 100
      : 1;
  return (
    <div className="overflow-auto p-5">
      <p className="mb-3 text-sm text-[#5f6368]">
        Grading: {cls.gradingMode === 'weighted' ? cls.weights.map((item) => `${item.category} ${item.percent}%`).join(' · ') : 'Total points'}
      </p>
      <table className="min-w-full border-collapse bg-white text-sm">
        <thead>
          <tr>
            <th className="border border-[#dadce0] px-3 py-2 text-left">Student</th>
            {assignments.map((post) => (
              <th key={post.id} className="border border-[#dadce0] px-3 py-2">
                {post.title.slice(0, 22)}
              </th>
            ))}
            <th className="border border-[#dadce0] px-3 py-2">Average</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            if (!student) return null;
            let weighted = 0;
            let weightSum = 0;
            const cells = assignments.map((post) => {
              const sub = ws.submissions.find((item) => item.assignmentId === post.id && item.studentId === student.id);
              const max = post.points || 0;
              if (typeof sub?.grade === 'number' && max) {
                weighted += (sub.grade / max) * 100 * weight(post);
                weightSum += weight(post);
              }
              return (
                <td key={post.id} className="border border-[#dadce0] px-3 py-2 text-center">
                  {typeof sub?.grade === 'number' ? sub.grade : '—'}
                </td>
              );
            });
            return (
              <tr key={student.id}>
                <td className="border border-[#dadce0] px-3 py-2">{student.name}</td>
                {cells}
                <td className="border border-[#dadce0] px-3 py-2 text-center">
                  {weightSum ? `${Math.round(weighted / (cls.gradingMode === 'weighted' ? 1 : weightSum))}%` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CreateClassModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (payload: { title: string; section?: string; subject?: string; room?: string; bannerTheme?: ClassroomBannerTheme }) => void;
}) {
  const [form, setForm] = useState({ title: '', section: '', subject: '', room: '', bannerTheme: 'blue' as ClassroomBannerTheme });
  return (
    <Modal title="Create class" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.title.trim()) return;
          onCreate(form);
        }}
      >
        <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Class name" className="w-full rounded-lg border border-[#dadce0] px-3 py-2" />
        <input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="Section" className="w-full rounded-lg border border-[#dadce0] px-3 py-2" />
        <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject" className="w-full rounded-lg border border-[#dadce0] px-3 py-2" />
        <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="Room" className="w-full rounded-lg border border-[#dadce0] px-3 py-2" />
        <div className="flex gap-2">
          {CLASSROOM_BANNER_THEMES.map((theme) => (
            <button key={theme} type="button" onClick={() => setForm({ ...form, bannerTheme: theme })} className={`h-8 w-8 rounded-full ${THEME[theme]} ${form.bannerTheme === theme ? 'ring-2 ring-offset-2 ring-[#1a73e8]' : ''}`} />
          ))}
        </div>
        <button type="submit" className="rounded-full bg-[#1a73e8] px-4 py-2 text-white">
          Create
        </button>
      </form>
    </Modal>
  );
}

function JoinModal({ onClose, onJoin }: { onClose: () => void; onJoin: (code: string) => void }) {
  const [code, setCode] = useState('');
  return (
    <Modal title="Join class" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onJoin(code);
        }}
      >
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Class code" className="w-full rounded-lg border border-[#dadce0] px-3 py-2" />
        <button type="submit" className="rounded-full bg-[#1a73e8] px-4 py-2 text-white">
          Join
        </button>
      </form>
    </Modal>
  );
}

function CreateWorkModal({
  ws,
  classId,
  onClose,
  onCreate,
}: {
  ws: ClassroomWorkspace;
  classId: string;
  onClose: () => void;
  onCreate: (action: ClassroomAction) => Promise<ClassroomStateResponse | null | undefined> | void;
}) {
  const [form, setForm] = useState({
    postType: 'assignment' as ClassroomPostType,
    title: '',
    body: '',
    topicId: ws.topics.find((item) => item.classId === classId)?.id || '',
    points: 20,
    dueAt: '',
    category: 'Homework',
    fileName: '',
    makeCopyForEachStudent: true,
    youtubeUrl: '',
    driveUrl: '',
    webUrl: '',
    questionKind: 'short' as const,
    aiTopic: '',
    rubric: [] as ClassroomRubricCriterion[],
  });
  const [aiBusy, setAiBusy] = useState(false);
  return (
    <Modal title="Create classwork" onClose={onClose} wide>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.title.trim()) return;
          void onCreate({
            type: 'create_post',
            classId,
            postType: form.postType,
            title: form.title,
            body: form.body,
            topicId: form.topicId || undefined,
            points: form.points,
            dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
            category: form.category,
            fileName: form.fileName || undefined,
            makeCopyForEachStudent: form.makeCopyForEachStudent,
            youtubeUrl: form.youtubeUrl || undefined,
            driveUrl: form.driveUrl || undefined,
            webUrl: form.webUrl || undefined,
            questionKind: form.postType === 'question' ? form.questionKind : undefined,
            rubric: form.rubric.length ? form.rubric : undefined,
          });
        }}
      >
        <select value={form.postType} onChange={(e) => setForm({ ...form, postType: e.target.value as ClassroomPostType })} className="w-full rounded-lg border border-[#dadce0] px-3 py-2">
          <option value="assignment">Assignment</option>
          <option value="quiz">Quiz (Forms-style)</option>
          <option value="question">Question</option>
          <option value="material">Material</option>
        </select>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full rounded-lg border border-[#dadce0] px-3 py-2" />
        <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} placeholder="Instructions" className="w-full rounded-lg border border-[#dadce0] px-3 py-2" />
        <div className="grid gap-2 md:grid-cols-2">
          <select value={form.topicId} onChange={(e) => setForm({ ...form, topicId: e.target.value })} className="rounded-lg border border-[#dadce0] px-3 py-2">
            {ws.topics
              .filter((item) => item.classId === classId)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
          <input type="date" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} className="rounded-lg border border-[#dadce0] px-3 py-2" />
          <input type="number" value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} className="rounded-lg border border-[#dadce0] px-3 py-2" />
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category (Homework / Exams)" className="rounded-lg border border-[#dadce0] px-3 py-2" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.makeCopyForEachStudent} onChange={(e) => setForm({ ...form, makeCopyForEachStudent: e.target.checked })} />
          Make a copy for each student
        </label>
        <input value={form.fileName} onChange={(e) => setForm({ ...form, fileName: e.target.value })} placeholder="Template file name" className="w-full rounded-lg border border-[#dadce0] px-3 py-2" />
        <div className="rounded-lg bg-[#e8f0fe] p-3">
          <p className="text-sm font-medium text-[#174ea6]">AI lesson & rubric generator</p>
          <div className="mt-2 flex gap-2">
            <input value={form.aiTopic} onChange={(e) => setForm({ ...form, aiTopic: e.target.value })} placeholder="Topic, e.g. evaporation" className="flex-1 rounded-lg border border-[#dadce0] px-3 py-2" />
            <button
              type="button"
              disabled={aiBusy}
              onClick={async () => {
                if (!form.aiTopic.trim()) return;
                setAiBusy(true);
                try {
                  const res = await api.classroomAction({ type: 'generate_rubric', topic: form.aiTopic });
                  setForm((prev) => ({
                    ...prev,
                    title: prev.title || form.aiTopic,
                    body: res.generated?.instructions || prev.body,
                    rubric: res.generated?.rubric || prev.rubric,
                  }));
                } finally {
                  setAiBusy(false);
                }
              }}
              className="rounded-full bg-[#1a73e8] px-3 py-2 text-sm text-white"
            >
              {aiBusy ? 'Generating…' : 'Generate'}
            </button>
          </div>
          {form.rubric.length ? (
            <ul className="mt-2 text-sm">
              {form.rubric.map((item) => (
                <li key={item.name}>
                  {item.name} · {item.points} pts
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button type="submit" className="rounded-full bg-[#1a73e8] px-4 py-2 text-white">
          Assign
        </button>
      </form>
    </Modal>
  );
}

function GradeDrawer({
  ws,
  assignmentId,
  onClose,
  onGrade,
}: {
  ws: ClassroomWorkspace;
  assignmentId: string;
  onClose: () => void;
  onGrade: (action: ClassroomAction) => void;
}) {
  const post = ws.posts.find((item) => item.id === assignmentId);
  const rows = ws.submissions.filter((item) => item.assignmentId === assignmentId);
  const stats = submissionStats(rows);
  const [active, setActive] = useState<ClassroomSubmission | null>(rows[0] || null);
  const [grade, setGrade] = useState(active?.grade ?? 0);
  const [note, setNote] = useState(active?.privateComment ?? '');
  useEffect(() => {
    setGrade(active?.grade ?? 0);
    setNote(active?.privateComment ?? '');
  }, [active]);
  if (!post) return null;
  return (
    <Modal title={`${post.title} · ${stats.turnedIn} turned in, ${stats.assigned} assigned`} onClose={onClose} wide>
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <ul className="space-y-1">
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => setActive(row)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${active?.id === row.id ? 'bg-[#e8f0fe]' : 'hover:bg-[#f8f9fa]'}`}
              >
                {personName(ws, row.studentId)}
                <span className="block text-xs text-[#5f6368]">{row.status.replace('_', ' ')}</span>
              </button>
            </li>
          ))}
        </ul>
        {active ? (
          <div className="space-y-3">
            <p className="rounded-lg bg-[#f8f9fa] p-3 text-sm whitespace-pre-wrap">{active.workText || 'No written work yet.'}</p>
            <p className="text-sm text-[#5f6368]">{active.fileName}</p>
            {active.originality ? (
              <p className="text-sm">
                Originality {active.originality.score}% — {active.originality.note}
              </p>
            ) : null}
            {post.rubric?.length ? (
              <ul className="text-sm">
                {post.rubric.map((item) => (
                  <li key={item.name}>
                    {item.name} ({item.points}) — {item.levels.map((level) => level.label).join(' / ')}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex gap-2">
              <input type="number" value={grade} onChange={(e) => setGrade(Number(e.target.value))} className="w-24 rounded-lg border border-[#dadce0] px-3 py-2" />
              <span className="self-center text-sm text-[#5f6368]">/ {post.points ?? 0}</span>
            </div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Private comment" className="w-full rounded-lg border border-[#dadce0] px-3 py-2" />
            <button
              type="button"
              onClick={() => onGrade({ type: 'grade_submission', submissionId: active.id, grade, privateComment: note, returnWork: true })}
              className="rounded-full bg-[#1a73e8] px-4 py-2 text-white"
            >
              Return
            </button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function StudentWorkModal({
  ws,
  assignmentId,
  studentId,
  onClose,
  onSubmit,
}: {
  ws: ClassroomWorkspace;
  assignmentId: string;
  studentId: string;
  onClose: () => void;
  onSubmit: (action: ClassroomAction) => void;
}) {
  const post = ws.posts.find((item) => item.id === assignmentId);
  const sub = ws.submissions.find((item) => item.assignmentId === assignmentId && item.studentId === studentId);
  const [work, setWork] = useState(sub?.workText || '');
  if (!post || !sub) return null;
  return (
    <Modal title={post.title} onClose={onClose}>
      <p className="text-sm">{post.body}</p>
      {post.fileName ? <p className="mt-2 text-sm text-[#5f6368]">Your copy: {sub.fileName || post.fileName}</p> : null}
      {sub.privateComment ? <p className="mt-2 rounded-lg bg-[#e8f0fe] p-2 text-sm">Private comment: {sub.privateComment}</p> : null}
      {typeof sub.grade === 'number' ? <p className="mt-2 text-sm">Grade: {sub.grade} / {post.points}</p> : null}
      <textarea value={work} onChange={(e) => setWork(e.target.value)} rows={5} className="mt-3 w-full rounded-lg border border-[#dadce0] px-3 py-2" />
      <button
        type="button"
        disabled={sub.status === 'returned'}
        onClick={() => onSubmit({ type: 'submit_work', assignmentId, studentId, workText: work, fileName: sub.fileName })}
        className="mt-3 rounded-full bg-[#1a73e8] px-4 py-2 text-white disabled:opacity-50"
      >
        {sub.status === 'turned_in' ? 'Update submission' : 'Turn in'}
      </button>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className={`max-h-[90vh] overflow-auto rounded-2xl bg-white p-5 shadow-xl ${wide ? 'w-full max-w-3xl' : 'w-full max-w-lg'}`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-medium">{title}</h3>
          <button type="button" onClick={onClose} className="text-[#5f6368]">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default ClassroomApp;
