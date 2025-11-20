import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Toaster, toast } from 'react-hot-toast';
import { 
  LayoutDashboard, 
  Plus, 
  LogOut, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Edit2, 
  BrainCircuit,
  ListTodo,
  Calendar
} from 'lucide-react';

// Components & Services
import Button from './components/Button';
import Input from './components/Input';
import TaskModal from './components/TaskModal';
import { apiLogin, apiRegister, apiLogout, apiGetTasks, apiCreateTask, apiUpdateTask, apiDeleteTask, apiGetUser } from './services/api';
import { prioritizeTasks } from './services/geminiService';
import { Task, TaskStatus, User } from './types';

// --- Setup Query Client ---
const queryClient = new QueryClient();

// --- Pages ---

// 1. LOGIN PAGE
const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await apiLogin(email, password);
      } else {
        await apiRegister(name, email, password);
      }
      toast.success(isLogin ? "Welcome back!" : "Account created!");
      queryClient.invalidateQueries({ queryKey: ['user'] });
      window.location.hash = '#/'; // Redirect to dashboard
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-900/20">
            <LayoutDashboard className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white">TaskFlow AI</h1>
          <p className="text-slate-400 mt-1">Intelligent Task Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <Input 
              label="Full Name" 
              placeholder="John Doe" 
              value={name}
              onChange={e => setName(e.target.value)}
              required 
            />
          )}
          <Input 
            label="Email Address" 
            type="email" 
            placeholder="you@example.com" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            required 
          />
          <Input 
            label="Password" 
            type="password" 
            placeholder="••••••••" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            required 
          />
          
          <Button type="submit" className="w-full mt-6" isLoading={loading}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-slate-400 hover:text-blue-400 transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. DASHBOARD PAGE
const Dashboard = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: apiGetUser,
    retry: false
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: apiGetTasks,
    enabled: !!user
  });

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: ({ title, description }: { title: string, description: string }) => 
      apiCreateTask(title, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Task created");
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: Partial<Task> }) => 
      apiUpdateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiDeleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Task deleted");
    }
  });

  const handleLogout = async () => {
    await apiLogout();
    queryClient.setQueryData(['user'], null);
    window.location.hash = '#/login';
  };

  const handleTaskSubmit = async (title: string, description: string) => {
    if (editingTask) {
      await updateTaskMutation.mutateAsync({ 
        id: editingTask.id, 
        updates: { title, description } 
      });
      setEditingTask(null);
    } else {
      await createTaskMutation.mutateAsync({ title, description });
    }
  };

  const toggleStatus = (task: Task) => {
    const newStatus = task.status === TaskStatus.COMPLETED ? TaskStatus.PENDING : TaskStatus.COMPLETED;
    updateTaskMutation.mutate({ id: task.id, updates: { status: newStatus } });
    if (newStatus === TaskStatus.COMPLETED) toast.success("Task completed!");
  };

  const runAiAnalysis = async () => {
    if (tasks.length === 0) return;
    setAnalyzing(true);
    try {
      const result = await prioritizeTasks(tasks);
      setAiAnalysis(result);
    } catch (e) {
      toast.error("AI Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  if (!user) return <Navigate to="/login" />;

  const pendingTasks = tasks.filter(t => t.status === TaskStatus.PENDING);
  const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">TaskFlow AI</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-400 hidden sm:inline">Hello, {user.name}</span>
            <Button variant="secondary" onClick={handleLogout} className="!px-3">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">My Tasks</h1>
            <p className="text-slate-400 text-sm mt-1">
              {pendingTasks.length} pending, {completedTasks.length} completed
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="ai" onClick={runAiAnalysis} isLoading={analyzing} icon={<BrainCircuit className="w-4 h-4"/>}>
              AI Prioritize
            </Button>
            <Button onClick={() => setIsModalOpen(true)} icon={<Plus className="w-4 h-4"/>}>
              New Task
            </Button>
          </div>
        </div>

        {/* AI Analysis Result */}
        {aiAnalysis && (
          <div className="mb-8 bg-gradient-to-r from-slate-900 to-slate-800 border border-indigo-500/30 p-6 rounded-xl relative overflow-hidden animate-in slide-in-from-top-4">
             <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
             <div className="flex items-start gap-3">
                <BrainCircuit className="w-6 h-6 text-indigo-400 mt-1 shrink-0" />
                <div>
                  <h3 className="text-indigo-400 font-semibold mb-2">AI Insight</h3>
                  <p className="text-slate-300 leading-relaxed">{aiAnalysis}</p>
                </div>
                <button onClick={() => setAiAnalysis(null)} className="ml-auto text-slate-500 hover:text-white">
                  <XIcon className="w-4 h-4" />
                </button>
             </div>
          </div>
        )}

        {/* Task Lists */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Pending Tasks */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-blue-500" /> 
                Active Tasks
              </h2>
              {pendingTasks.length === 0 ? (
                 <div className="text-center py-12 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                    <p className="text-slate-500">No active tasks. Enjoy your day!</p>
                 </div>
              ) : (
                <div className="grid gap-3">
                  {pendingTasks.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      onToggle={() => toggleStatus(task)}
                      onEdit={() => { setEditingTask(task); setIsModalOpen(true); }}
                      onDelete={() => deleteTaskMutation.mutate(task.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <section className="opacity-75">
                <h2 className="text-lg font-semibold text-slate-400 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Completed
                </h2>
                <div className="grid gap-3">
                  {completedTasks.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      onToggle={() => toggleStatus(task)}
                      onEdit={() => { setEditingTask(task); setIsModalOpen(true); }}
                      onDelete={() => deleteTaskMutation.mutate(task.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <TaskModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
        onSubmit={handleTaskSubmit}
        initialData={editingTask}
      />
    </div>
  );
};

interface TaskItemProps {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onEdit, onDelete }) => {
  const isCompleted = task.status === TaskStatus.COMPLETED;
  
  return (
    <div className={`group bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl transition-all hover:shadow-lg flex items-start gap-4 ${isCompleted ? 'opacity-60' : ''}`}>
      <button onClick={onToggle} className="mt-1 text-slate-400 hover:text-green-500 transition-colors">
        {isCompleted ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Circle className="w-6 h-6" />}
      </button>
      
      <div className="flex-1 min-w-0">
        <h3 className={`text-lg font-medium ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
          {task.title}
        </h3>
        {task.description && (
          <p className="text-slate-400 mt-1 text-sm whitespace-pre-line">{task.description}</p>
        )}
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(task.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-400 transition-colors">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={onDelete} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// --- X Icon helper ---
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

// --- Main App Structure ---
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #334155',
          },
        }}
      />
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  );
};

export default App;