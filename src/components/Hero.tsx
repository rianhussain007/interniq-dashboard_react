import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Bot,
  Briefcase,
  Check,
  Circle,
  Code2,
  FileText,
  GraduationCap,
  MessageSquare,
  Send,
  Sparkles,
  Target,
} from 'lucide-react';
import { cn } from '../lib/utils';

type StatCard = {
  label: string;
  value: string;
  helper: string;
  icon: React.ElementType;
};

type ChecklistTask = {
  id: string;
  label: string;
};

type MentorMessage = {
  id: number;
  role: 'mentor' | 'student';
  message: string;
};

const stats: StatCard[] = [
  {
    label: 'Applications Sent',
    value: '12',
    helper: '+4 this week',
    icon: Briefcase,
  },
  {
    label: 'Interviews Scheduled',
    value: '2',
    helper: '1 technical, 1 HR',
    icon: GraduationCap,
  },
  {
    label: 'Resume Score',
    value: '85%',
    helper: 'Strong ATS match',
    icon: FileText,
  },
  {
    label: 'Portfolio Projects',
    value: '3',
    helper: '2 ready to showcase',
    icon: Code2,
  },
];

const initialTasks: ChecklistTask[] = [
  { id: 'resume-project', label: 'Update Resume with latest project' },
  { id: 'github-profile', label: 'Link GitHub profile' },
  { id: 'star-practice', label: 'Practice STAR interview questions' },
];

const initialMessages: MentorMessage[] = [
  {
    id: 1,
    role: 'mentor',
    message: 'Hi Rian, I am ready to help you turn your data science and developer work into interview-ready proof.',
  },
];

export const Hero = () => {
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set(['github-profile']));
  const [messages, setMessages] = useState<MentorMessage[]>(initialMessages);
  const [mentorInput, setMentorInput] = useState('');
  const [isMentorTyping, setIsMentorTyping] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  const completionPercent = useMemo(
    () => Math.round((completedTasks.size / initialTasks.length) * 100),
    [completedTasks]
  );

  useEffect(() => {
    messagesRef.current?.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isMentorTyping]);

  const toggleTask = (taskId: string) => {
    setCompletedTasks((current) => {
      const next = new Set(current);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const sendMentorMessage = async () => {
    const trimmedInput = mentorInput.trim();
    if (!trimmedInput || isMentorTyping) return;

    const studentMessage: MentorMessage = {
      id: Date.now(),
      role: 'student',
      message: trimmedInput,
    };

    setMessages((current) => [...current, studentMessage]);
    setMentorInput('');
    setIsMentorTyping(true);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001';
      const response = await fetch(`${apiBaseUrl}/api/mentor-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmedInput,
          history: messages.map((message) => ({
            role: message.role === 'mentor' ? 'assistant' : 'user',
            content: message.message,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Mentor service is unavailable.' }));
        throw new Error(errorData.detail || 'Mentor service is unavailable.');
      }

      const data = await response.json() as { answer?: string };
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'mentor',
          message: data.answer || 'I could not generate a response just now. Please try again.',
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'mentor',
          message: error instanceof Error
            ? `Mentor connection issue: ${error.message}`
            : 'Mentor connection issue. Please try again.',
        },
      ]);
    } finally {
      setIsMentorTyping(false);
    }
  };

  return (
    <section className="min-h-screen bg-white text-zinc-950 dark:bg-gray-900 dark:text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-white to-indigo-50 p-6 shadow-xl shadow-indigo-950/5 dark:border-zinc-800 dark:from-zinc-900 dark:to-indigo-950/30 dark:shadow-black/20 sm:p-8"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-sm font-medium text-zinc-600 dark:border-zinc-800 dark:bg-white/5 dark:text-zinc-300">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                Data scientist career cockpit
              </div>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                Welcome back, Rian!
                <motion.span
                  className="ml-3 inline-block origin-bottom-right"
                  animate={{ rotate: [0, 14, -8, 12, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 3 }}
                  whileHover={{ scale: 1.16, rotate: 16 }}
                  aria-hidden="true"
                >
                  👋
                </motion.span>
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300 sm:text-lg">
                You are 3 milestones away from being fully interview-ready this week.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white/75 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
              <div className="mb-2 flex items-center justify-between gap-6">
                <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Weekly readiness</span>
                <span className="text-sm font-black text-indigo-600 dark:text-indigo-300">{completionPercent}%</span>
              </div>
              <div className="h-2 w-64 max-w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <motion.div
                  className="h-full rounded-full bg-indigo-500 shadow-[0_0_18px_rgba(99,102,241,0.65)]"
                  animate={{ width: `${completionPercent}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 22 }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + index * 0.05 }}
                  className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-900/80 dark:hover:border-indigo-400/40 dark:hover:shadow-indigo-500/15"
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white dark:bg-indigo-500/10 dark:text-indigo-300">
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{stat.label}</p>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <p className="text-3xl font-black">{stat.value}</p>
                    <ArrowUpRight className="h-5 w-5 text-zinc-300 transition group-hover:text-indigo-400" />
                  </div>
                  <p className="mt-2 text-xs font-medium text-zinc-500">{stat.helper}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80"
            >
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black">My Next Steps</h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Complete these to sharpen your interview readiness.
                  </p>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-200">
                  <Target className="h-4 w-4" />
                  {completedTasks.size}/{initialTasks.length} done
                </span>
              </div>

              <div className="space-y-3">
                {initialTasks.map((task) => {
                  const isComplete = completedTasks.has(task.id);

                  return (
                    <button
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={cn(
                        'flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition duration-300',
                        isComplete
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100'
                          : 'border-zinc-200 bg-zinc-50 hover:border-indigo-300 hover:bg-indigo-50/70 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-indigo-400/40 dark:hover:bg-indigo-500/10'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-7 w-7 flex-none items-center justify-center rounded-full transition duration-300',
                          isComplete ? 'bg-emerald-500 text-white' : 'text-zinc-400'
                        )}
                      >
                        {isComplete ? <Check className="h-4 w-4" /> : <Circle className="h-6 w-6" />}
                      </span>
                      <span className={cn('font-semibold transition-all duration-300', isComplete && 'line-through decoration-emerald-500/70 decoration-2')}>
                        {task.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>

          <motion.aside
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="flex min-h-[560px] flex-col rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80"
          >
            <div className="border-b border-zinc-200 p-5 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-200">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-black">Meet Your AI Mentor</h2>
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.75)]" />
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">AI Active</p>
                </div>
              </div>
            </div>

            <div ref={messagesRef} className="flex-1 space-y-4 overflow-y-auto p-5">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex gap-3', message.role === 'student' && 'justify-end')}
                >
                  {message.role === 'mentor' && (
                    <span className="mt-1 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-200">
                      <MessageSquare className="h-4 w-4" />
                    </span>
                  )}
                  <div
                    className={cn(
                      'max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6',
                      message.role === 'student'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-950/70 dark:text-zinc-200'
                    )}
                  >
                    {message.message}
                  </div>
                </motion.div>
              ))}

              {isMentorTyping && (
                <div className="flex gap-3">
                  <span className="mt-1 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-200">
                    <MessageSquare className="h-4 w-4" />
                  </span>
                  <div className="w-48 rounded-2xl bg-zinc-100 p-4 dark:bg-zinc-950/70">
                    <div className="h-2.5 w-28 animate-pulse rounded-full bg-zinc-300 dark:bg-zinc-700" />
                    <div className="mt-3 h-2.5 w-40 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-950/60">
                <input
                  value={mentorInput}
                  onChange={(event) => setMentorInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      sendMentorMessage();
                    }
                  }}
                  placeholder="Ask anything about your career..."
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-zinc-950 outline-none placeholder:text-zinc-500 dark:text-white"
                />
                <button
                  onClick={sendMentorMessage}
                  disabled={!mentorInput.trim() || isMentorTyping}
                  className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800"
                  aria-label="Send mentor message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.aside>
        </div>
      </div>
    </section>
  );
};
