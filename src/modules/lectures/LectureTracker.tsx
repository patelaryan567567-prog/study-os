import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  BookOpen,
  CheckCircle,
  Clock,
  Star,
  Bell,
  MoreVertical,
  Grid3x3,
  List,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { GradientText } from '@/components/ui/GradientText';
import { cn } from '@/utils';

interface Chapter {
  id: string;
  name: string;
  lectures: Lecture[];
  progress: number;
}

interface Lecture {
  id: string;
  title: string;
  status: 'completed' | 'pending' | 'in-progress';
  bookmarked: boolean;
  notes: string;
  reminder?: Date;
}

export function LectureTracker() {
  const [chapters, setChapters] = useState<Chapter[]>([
    {
      id: '1',
      name: 'Mathematics',
      progress: 65,
      lectures: [
        {
          id: '1',
          title: 'Chapter 1: Algebra Basics',
          status: 'completed',
          bookmarked: true,
          notes: 'Great chapter!',
        },
        {
          id: '2',
          title: 'Chapter 2: Quadratic Equations',
          status: 'in-progress',
          bookmarked: false,
          notes: '',
        },
      ],
    },
    {
      id: '2',
      name: 'Physics',
      progress: 30,
      lectures: [
        {
          id: '3',
          title: 'Chapter 1: Motion',
          status: 'pending',
          bookmarked: false,
          notes: '',
        },
      ],
    },
  ]);

  const [newChapterName, setNewChapterName] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const addChapter = () => {
    if (!newChapterName.trim()) return;

    setChapters((current) => [
      ...current,
      {
        id: Date.now().toString(),
        name: newChapterName.trim(),
        progress: 0,
        lectures: [],
      },
    ]);

    setNewChapterName('');
  };

  const getStatusColor = (status: Lecture['status']) => {
    switch (status) {
      case 'completed':
        return 'text-success bg-success/10';
      case 'in-progress':
        return 'text-warning bg-warning/10';
      default:
        return 'text-gray-400 bg-gray-100 dark:bg-gray-800';
    }
  };

  const getStatusIcon = (status: Lecture['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'in-progress':
        return <Clock className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                <GradientText from="from-primary-500" to="to-accent-500">
                  Lecture Tracker
                </GradientText>
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Track your lectures, chapters, and progress.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded-xl p-2 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-primary-500/20 text-primary-500'
                    : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Grid3x3 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`rounded-xl p-2 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary-500/20 text-primary-500'
                    : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <GlassCard className="p-6">
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                type="text"
                value={newChapterName}
                onChange={(e) => setNewChapterName(e.target.value)}
                placeholder="New chapter name (e.g. Chapter 1: Algebra)"
                onKeyDown={(e) => e.key === 'Enter' && addChapter()}
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none"
              />
              <AnimatedButton onClick={addChapter} className="w-full md:w-auto">
                <Plus className="h-4 w-4" />
                Add Chapter
              </AnimatedButton>
            </div>
          </GlassCard>
        </motion.div>

        <div
          className={cn(
            'grid gap-6',
            viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1',
          )}
        >
          {chapters.map((chapter, index) => (
            <motion.div
              key={chapter.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard className="overflow-hidden p-6 hover:scale-[1.02]">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {chapter.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {chapter.lectures.length} lectures
                    </p>
                  </div>
                  <button className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <MoreVertical className="h-5 w-5 text-gray-400" />
                  </button>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Progress</span>
                    <span className="font-medium text-primary-500">{chapter.progress}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${chapter.progress}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {chapter.lectures.map((lecture) => (
                    <div
                      key={lecture.id}
                      className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3"
                    >
                      <div
                        className={cn(
                          'rounded-full p-1',
                          getStatusColor(lecture.status),
                        )}
                      >
                        {getStatusIcon(lecture.status)}
                      </div>
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                        {lecture.title}
                      </span>
                      {lecture.bookmarked && (
                        <Star className="h-4 w-4 fill-accent-500 text-accent-500" />
                      )}
                      <button className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700">
                        <Bell className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>

                <AnimatedButton variant="outline" size="sm" className="mt-4 w-full">
                  <Plus className="h-4 w-4" />
                  Add Lecture
                </AnimatedButton>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {chapters.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-16 w-16 text-gray-300 dark:text-gray-600" />
            <h3 className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">
              No chapters yet
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Start by creating your first chapter above.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
