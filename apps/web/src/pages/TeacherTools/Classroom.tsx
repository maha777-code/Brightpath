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
import { CLASSROOM_SUBJECT_GROUPS } from './classroomSubjects';
import './classroom.css';

function toneClass(theme: ClassroomBannerTheme) {
  return `cr-tone-${theme}`;
}

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
    return <div className="classroom-app p-10 text-center text-sm cr-muted">Opening Classroom…</div>;
  }
  if (error && !ws) {
    return (
      <div className="classroom-app p-10 text-center">
        <p className="cr-alert">{error}</p>
        <Link to="/teacher/tools" className="cr-link mt-3 inline-block">
          Back to AI tools
        </Link>
      </div>
    );
  }
  if (!ws || !actor) return null;

  return (
    <div className="classroom-app min-h-[70vh]">
      <header className="cr-header">
        <div>
          <p className="cr-kicker">School / Tutor center</p>
          <h1 className="cr-title">Classroom</h1>
        </div>
        <div className="cr-actions">
          <div className="cr-segment">
            <button type="button" className={isTeacher ? 'is-on' : ''} onClick={() => setViewAs('teacher')}>
              Teacher view
            </button>
            <button type="button" className={!isTeacher ? 'is-on' : ''} onClick={() => setViewAs('student')}>
              Student view
            </button>
          </div>
          {!isTeacher ? (
            <select
              value={actingStudent}
              onChange={(e) => setStudentId(e.target.value)}
              className="cr-field pill"
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
          <Link to="/teacher/tools" className="cr-link">
            Tools hub
          </Link>
        </div>
      </header>
      {error ? <p className="cr-alert">{error}</p> : null}
      {busy ? <p className="cr-busy">Saving…</p> : null}

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
            return next;
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
    <div className="cr-page">
      <div className="cr-toolbar" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
        <p className="cr-muted">{cards.length} classes</p>
        <div className="cr-actions">
          <button type="button" onClick={() => onShowArchived(!showArchived)} className="cr-btn">
            {showArchived ? 'Active classes' : 'Archived'}
          </button>
          <button type="button" onClick={onJoin} className="cr-btn">
            Join class
          </button>
          <button type="button" onClick={onCreate} className="cr-btn primary">
            Create class
          </button>
        </div>
      </div>
      {cards.length === 0 ? <p className="cr-empty">No classes in this view yet.</p> : null}
      <div className="cr-grid">
        {cards.map((item) => {
          const teacher = ws.people.find((person) => person.id === item.ownerId);
          return (
            <article key={item.id} className="cr-class-card">
              <button type="button" onClick={() => onOpen(item.id)} className={`cr-banner ${toneClass(item.bannerTheme)}`}>
                <h2>{item.title}</h2>
                <p>{item.section || item.subject || 'Class'}</p>
              </button>
              <div className="cr-card-foot">
                <span>{teacher?.name || personName(ws, actorId)}</span>
                <button type="button" onClick={() => onArchive(item.id)} className="cr-text-btn">
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
      <div className={`cr-banner ${toneClass(cls.bannerTheme)}`}>
        <button type="button" onClick={onBack} className="cr-back">
          ← All classes
        </button>
        <h2>{cls.title}</h2>
        <p>
          {cls.section} · Code {cls.code} · {cls.room}
        </p>
        <a href={cls.meetLink} target="_blank" rel="noreferrer" className="cr-meet">
          Join Meet
        </a>
      </div>
      <div className="cr-tabs">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onTab(item)}
            className={`cr-tab ${tab === item ? 'is-on' : ''}`}
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
    <div className="cr-stack">
      {isTeacher ? (
        <form
          className="cr-card cr-composer"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.body.trim() && !draft.title.trim()) return;
            onAction({
              type: 'create_post',
              classId: cls.id,
              postType: 'announcement',
              ...draft,
              title: draft.title || 'Announcement',
            });
            setDraft({ title: '', body: '', youtubeUrl: '', driveUrl: '', webUrl: '', fileName: '' });
          }}
        >
          <p className="cr-kicker">Share with the class</p>
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Announcement title" className="cr-field" />
          <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={3} className="cr-field" placeholder="Announce something…" />
          <div className="cr-attach">
            <label>
              YouTube
              <input value={draft.youtubeUrl} onChange={(e) => setDraft({ ...draft, youtubeUrl: e.target.value })} placeholder="Paste a link" className="cr-field" />
            </label>
            <label>
              Drive
              <input value={draft.driveUrl} onChange={(e) => setDraft({ ...draft, driveUrl: e.target.value })} placeholder="Paste a link" className="cr-field" />
            </label>
            <label>
              Web
              <input value={draft.webUrl} onChange={(e) => setDraft({ ...draft, webUrl: e.target.value })} placeholder="Paste a link" className="cr-field" />
            </label>
          </div>
          <div className="cr-form-actions">
            <button type="submit" className="cr-btn primary">
              Post
            </button>
          </div>
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
    <article className="cr-card cr-post">
      <header className="cr-post-head">
        <span className="cr-avatar">{personName(ws, post.authorId).slice(0, 1)}</span>
        <div>
          <p className="cr-kicker-type">{post.type}</p>
          <h3>{post.title}</h3>
          <p className="cr-sub">{personName(ws, post.authorId)} · {fmtDate(post.createdAt)}</p>
        </div>
      </header>
      {post.body ? <p className="cr-body">{post.body}</p> : null}
      <div className="cr-links">
        {post.youtubeUrl ? <a href={post.youtubeUrl} target="_blank" rel="noreferrer">YouTube</a> : null}
        {post.driveUrl ? <a href={post.driveUrl} target="_blank" rel="noreferrer">Drive</a> : null}
        {post.webUrl ? <a href={post.webUrl} target="_blank" rel="noreferrer">Link</a> : null}
        {post.fileName ? <span className="cr-file">{post.fileName}</span> : null}
      </div>
      <ul className="cr-comments">
        {comments.map((item) => (
          <li key={item.id}>
            <span className="cr-avatar">{personName(ws, item.authorId).slice(0, 1)}</span>
            <span className="cr-comment-copy">
              <b>{personName(ws, item.authorId)}</b>
              <span>{item.body}</span>
            </span>
            {isTeacher ? (
              <button type="button" className="cr-text-btn danger" onClick={() => onAction({ type: 'delete_comment', commentId: item.id })}>
                Delete
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      <form
        className="cr-comment-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!comment.trim()) return;
          onAction({ type: 'add_comment', postId: post.id, body: comment });
          setComment('');
        }}
      >
        <input value={comment} onChange={(e) => setComment(e.target.value)} className="cr-field" placeholder="Add a class comment" />
        <button type="submit" className="cr-btn primary">
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
  const loose = work.filter((post) => !post.topicId || !topics.some((topic) => topic.id === post.topicId));
  const sections = [
    ...topics.map((topic) => ({ id: topic.id, name: topic.name, posts: work.filter((post) => post.topicId === topic.id) })),
    ...(loose.length ? [{ id: 'loose', name: 'No topic', posts: loose }] : []),
  ];
  return (
    <div className="cr-page cr-board">
      {isTeacher ? (
        <div className="cr-card cr-toolbar-card">
          <div>
            <p className="cr-kicker">Classwork</p>
            <h3>{work.length} item{work.length === 1 ? '' : 's'}</h3>
          </div>
          <div className="cr-inline">
            <button type="button" onClick={onAssign} className="cr-btn primary">
              Create
            </button>
            <form
              className="cr-inline"
              onSubmit={(e) => {
                e.preventDefault();
                if (!topicName.trim()) return;
                onAction({ type: 'create_topic', classId: cls.id, name: topicName });
                setTopicName('');
              }}
            >
              <input value={topicName} onChange={(e) => setTopicName(e.target.value)} placeholder="New topic" className="cr-field" />
              <button type="submit" className="cr-btn">
                Add topic
              </button>
            </form>
          </div>
        </div>
      ) : null}
      {sections.length === 0 ? <p className="cr-empty">No classwork yet.</p> : null}
      {sections.map((topic) => (
        <section key={topic.id} className="cr-topic">
          <header>
            <h3>{topic.name}</h3>
            <span className="cr-count">{topic.posts.length}</span>
          </header>
          {topic.posts.length === 0 ? <p className="cr-sub">Nothing in this topic yet.</p> : null}
          <div className="cr-work-list">
            {topic.posts.map((post) => {
              const stats = submissionStats(ws.submissions.filter((item) => item.assignmentId === post.id));
              const mine = ws.submissions.find((item) => item.assignmentId === post.id && item.studentId === studentId);
              return (
                <div key={post.id} className="cr-work">
                  <span className={`cr-type cr-type-${post.type}`}>{post.type.slice(0, 1)}</span>
                  <div className="cr-work-copy">
                    <strong>{post.title}</strong>
                    <p className="cr-sub">
                      <span className="cr-meta">{post.type}</span>
                      <span>{post.points ?? 0} pts</span>
                      <span>Due {fmtDate(post.dueAt) || 'none'}</span>
                    </p>
                  </div>
                  {isTeacher ? (
                    <button type="button" onClick={() => onGrade(post.id)} className="cr-chip">
                      {stats.turnedIn} turned in · {stats.assigned + stats.missing} assigned
                    </button>
                  ) : (
                    <button type="button" onClick={() => onStudentWork(post.id)} className="cr-chip">
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
  const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}/teacher/tools/classroom?join=${cls.inviteToken}` : cls.inviteToken;
  return (
    <div className="cr-page cr-board">
      {isTeacher ? (
        <form
          className="cr-card cr-invite"
          onSubmit={(e) => {
            e.preventDefault();
            if (!invite.email.trim()) return;
            onAction({ type: 'invite_member', classId: cls.id, ...invite });
            setInvite({ name: '', email: '', role: invite.role });
          }}
        >
          <div className="cr-invite-copy">
            <p className="cr-kicker">People</p>
            <h3>Invite someone</h3>
          </div>
          <input value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} placeholder="Name" className="cr-field" />
          <input value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} placeholder="Email" className="cr-field" />
          <select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as ClassroomMemberRole })} className="cr-field">
            <option value="student">Student</option>
            <option value="teacher">Co-teacher</option>
            <option value="guardian">Guardian</option>
          </select>
          <button type="submit" className="cr-btn primary">
            Invite
          </button>
        </form>
      ) : null}
      <div className="cr-card cr-link-card">
        <p className="cr-kicker">Invite link</p>
        <code className="cr-code">{inviteLink}</code>
      </div>
      {(['teacher', 'student', 'guardian'] as const).map((role) => {
        const people = grouped(role);
        return (
          <section key={role} className="cr-roster">
            <header>
              <h3>{role}s</h3>
              <span className="cr-count">{people.length}</span>
            </header>
            {people.length === 0 ? <p className="cr-sub">No {role}s yet.</p> : null}
            <ul className="cr-people">
              {people.map(({ member, person }) => (
                <li key={member.id} className="cr-person">
                  <span className="cr-avatar">{(person?.name || '?').slice(0, 1)}</span>
                  <span className="cr-person-copy">
                    <b>{person?.name}</b>
                    <span>{person?.email}</span>
                  </span>
                  {member.muted ? <span className="cr-pill warn">Muted</span> : null}
                  {isTeacher && role === 'student' ? (
                    <span className="cr-inline cr-person-actions">
                      <a href={`mailto:${person?.email}`} className="cr-text-btn">
                        Email
                      </a>
                      <button type="button" className="cr-text-btn" onClick={() => onAction({ type: 'mute_member', memberId: member.id, muted: !member.muted })}>
                        {member.muted ? 'Unmute' : 'Mute'}
                      </button>
                      <button type="button" className="cr-text-btn danger" onClick={() => onAction({ type: 'remove_member', memberId: member.id })}>
                        Remove
                      </button>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {isTeacher ? (
        <div className="cr-card">
          <p className="cr-kicker">Guardians</p>
          <h3>Summaries</h3>
          <p className="cr-sub">Sends a queued digest of missing work, upcoming assignments, and stream activity.</p>
          <div className="cr-inline cr-digest">
            <select
              value={cls.guardianDigest}
              onChange={(e) => onAction({ type: 'update_class', classId: cls.id, patch: { guardianDigest: e.target.value as ClassroomClass['guardianDigest'] } })}
              className="cr-field"
            >
              <option value="off">Off</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
            <button type="button" onClick={() => onAction({ type: 'send_guardian_digest', classId: cls.id })} className="cr-btn primary">
              Send digest now
            </button>
          </div>
          <ul className="cr-digest-list">
            {ws.guardianEmails
              .filter((item) => item.classId === cls.id)
              .slice(0, 5)
              .map((item) => (
                <li key={item.id} className="cr-note">
                  <b>{item.subject}</b>
                  <span className="cr-sub"> → {item.to}</span>
                  <pre className="cr-sub">{item.body}</pre>
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
    <div className="cr-page cr-board">
      <div className="cr-card cr-grade-head">
        <div>
          <p className="cr-kicker">Grades</p>
          <h3>{cls.gradingMode === 'weighted' ? 'Weighted categories' : 'Total points'}</h3>
        </div>
        <div className="cr-weight-row">
          {cls.gradingMode === 'weighted'
            ? cls.weights.map((item) => (
                <span key={item.category} className="cr-pill">
                  {item.category} {item.percent}%
                </span>
              ))
            : <span className="cr-pill">Every point counts equally</span>}
        </div>
      </div>
      <div className="cr-table-wrap">
      <table className="cr-table">
        <thead>
          <tr>
            <th>Student</th>
            {assignments.map((post) => (
              <th key={post.id} title={post.title}>
                {post.title}
              </th>
            ))}
            <th>Average</th>
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
              const graded = typeof sub?.grade === 'number' && max > 0;
              if (graded && sub) {
                weighted += (sub.grade! / max) * 100 * weight(post);
                weightSum += weight(post);
              }
              const ratio = graded && sub ? sub.grade! / max : 0;
              return (
                <td key={post.id}>
                  {graded && sub ? (
                    <span className={`cr-score ${ratio >= 0.8 ? 'high' : ratio >= 0.5 ? 'mid' : 'low'}`}>
                      {sub.grade}<small>/{max}</small>
                    </span>
                  ) : (
                    <span className="cr-score empty">{sub?.status === 'missing' ? 'Missing' : '—'}</span>
                  )}
                </td>
              );
            });
            const average = weightSum ? Math.round(weighted / (cls.gradingMode === 'weighted' ? 1 : weightSum)) : null;
            return (
              <tr key={student.id}>
                <td>
                  <span className="cr-student-cell">
                    <span className="cr-avatar">{student.name.slice(0, 1)}</span>
                    {student.name}
                  </span>
                </td>
                {cells}
                <td>{average === null ? '—' : <span className={`cr-score ${average >= 80 ? 'high' : average >= 50 ? 'mid' : 'low'}`}>{average}%</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function SubjectSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const needle = query.trim().toLowerCase();
  const groups = CLASSROOM_SUBJECT_GROUPS.map((group) => ({
    ...group,
    subjects: group.subjects.filter((subject) => !needle || subject.toLowerCase().includes(needle) || group.label.toLowerCase().includes(needle)),
  })).filter((group) => group.subjects.length > 0);
  return (
    <div className="cr-subject">
      <button type="button" className={`cr-field cr-subject-btn ${value ? '' : 'is-empty'}`} aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span>{value || 'Select a subject'}</span>
        <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {open ? (
        <div className="cr-subject-panel">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subjects"
            className="cr-field"
            aria-label="Search subjects"
          />
          <div className="cr-subject-list" role="listbox">
            {groups.length === 0 ? <p className="cr-muted">No subject matches that search.</p> : null}
            {groups.map((group) => (
              <div key={group.label}>
                <p className="cr-subject-group">{group.label}</p>
                {group.subjects.map((subject) => (
                  <button
                    key={subject}
                    type="button"
                    role="option"
                    aria-selected={value === subject}
                    className={`cr-subject-option ${value === subject ? 'is-on' : ''}`}
                    onClick={() => {
                      onChange(subject);
                      setQuery('');
                      setOpen(false);
                    }}
                  >
                    {subject}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}
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
    <Modal title="Create class" onClose={onClose} wide>
      <form
        className="cr-form cr-create"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.title.trim()) return;
          onCreate(form);
        }}
      >
        <label className="cr-label cr-span-2">
          Class name
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="9th Science · Matter" className="cr-field" />
        </label>
        <label className="cr-label">
          Section
          <input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="Section A" className="cr-field" />
        </label>
        <label className="cr-label">
          Room
          <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="Lab 2" className="cr-field" />
        </label>
        <label className="cr-label cr-span-2">
          Subject
          <SubjectSelect value={form.subject} onChange={(subject) => setForm({ ...form, subject })} />
        </label>
        <div className="cr-span-2">
          <p className="cr-label-text">Banner</p>
          <div className="cr-swatches">
            {CLASSROOM_BANNER_THEMES.map((theme) => (
              <button key={theme} type="button" onClick={() => setForm({ ...form, bannerTheme: theme })} className={`cr-swatch ${toneClass(theme)} ${form.bannerTheme === theme ? 'is-on' : ''}`} aria-label={theme} />
            ))}
          </div>
        </div>
        <div className="cr-form-actions cr-span-2">
          <button type="button" onClick={onClose} className="cr-text-btn">
            Cancel
          </button>
          <button type="submit" className="cr-btn primary" disabled={!form.title.trim()}>
            Create
          </button>
        </div>
      </form>
    </Modal>
  );
}

function JoinModal({ onClose, onJoin }: { onClose: () => void; onJoin: (code: string) => void }) {
  const [code, setCode] = useState('');
  return (
    <Modal title="Join class" onClose={onClose}>
      <form
        className="cr-form"
        onSubmit={(e) => {
          e.preventDefault();
          onJoin(code);
        }}
      >
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Class code" className="cr-field" />
        <button type="submit" className="cr-btn primary">
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
        className="cr-form"
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
        <select value={form.postType} onChange={(e) => setForm({ ...form, postType: e.target.value as ClassroomPostType })} className="cr-field">
          <option value="assignment">Assignment</option>
          <option value="quiz">Quiz (Forms-style)</option>
          <option value="question">Question</option>
          <option value="material">Material</option>
        </select>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="cr-field" />
        <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} placeholder="Instructions" className="cr-field" />
        <div className="grid gap-2 md:grid-cols-2">
          <select value={form.topicId} onChange={(e) => setForm({ ...form, topicId: e.target.value })} className="cr-field">
            {ws.topics
              .filter((item) => item.classId === classId)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
          <input type="date" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} className="cr-field" />
          <input type="number" value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} className="cr-field" />
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category (Homework / Exams)" className="cr-field" />
        </div>
        <label className="cr-check">
          <input type="checkbox" checked={form.makeCopyForEachStudent} onChange={(e) => setForm({ ...form, makeCopyForEachStudent: e.target.checked })} />
          Make a copy for each student
        </label>
        <input value={form.fileName} onChange={(e) => setForm({ ...form, fileName: e.target.value })} placeholder="Template file name" className="cr-field" />
        <div className="cr-ai">
          <p>AI lesson & rubric generator</p>
          <div className="cr-inline" style={{ marginTop: '0.55rem' }}>
            <input value={form.aiTopic} onChange={(e) => setForm({ ...form, aiTopic: e.target.value })} placeholder="Topic, e.g. evaporation" className="cr-field" style={{ flex: 1 }} />
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
              className="cr-btn primary"
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
        <button type="submit" className="cr-btn primary">
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
      <div className="cr-split">
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.35rem' }}>
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => setActive(row)}
                className={`cr-student ${active?.id === row.id ? 'is-on' : ''}`}
              >
                {personName(ws, row.studentId)}
                <span>{row.status.replace('_', ' ')}</span>
              </button>
            </li>
          ))}
        </ul>
        {active ? (
          <div className="cr-form">
            <p className="cr-paper">{active.workText || 'No written work yet.'}</p>
            <p className="cr-sub">{active.fileName}</p>
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
            <div className="cr-inline">
              <input type="number" value={grade} onChange={(e) => setGrade(Number(e.target.value))} className="cr-field" style={{ width: '6rem' }} />
              <span className="cr-sub">/ {post.points ?? 0}</span>
            </div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Private comment" className="cr-field" />
            <button
              type="button"
              onClick={() => onGrade({ type: 'grade_submission', submissionId: active.id, grade, privateComment: note, returnWork: true })}
              className="cr-btn primary"
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
      {post.fileName ? <p className="cr-sub">Your copy: {sub.fileName || post.fileName}</p> : null}
      {sub.privateComment ? <p className="cr-private">Private comment: {sub.privateComment}</p> : null}
      {typeof sub.grade === 'number' ? <p>Grade: {sub.grade} / {post.points}</p> : null}
      <textarea value={work} onChange={(e) => setWork(e.target.value)} rows={5} className="cr-field" />
      <button
        type="button"
        disabled={sub.status === 'returned'}
        onClick={() => onSubmit({ type: 'submit_work', assignmentId, studentId, workText: work, fileName: sub.fileName })}
        className="cr-btn primary"
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
    <div className="cr-modal-back">
      <div className={`cr-modal ${wide ? 'wide' : ''}`}>
        <div className="cr-modal-head">
          <h3>{title}</h3>
          <button type="button" onClick={onClose} className="cr-btn">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default ClassroomApp;
