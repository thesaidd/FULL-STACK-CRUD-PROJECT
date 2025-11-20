import { Task, TaskStatus, User, AuthResponse } from '../types';

// MOCK DATA STORE (Simulating Database)
const STORAGE_KEY_USERS = 'taskflow_users';
const STORAGE_KEY_TASKS = 'taskflow_tasks';
const STORAGE_KEY_TOKEN = 'taskflow_token';

// Helper to delay execution (simulate network latency)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Auth Service ---

export const apiLogin = async (email: string, password: string): Promise<AuthResponse> => {
  await delay(600); // Simulate network
  const usersRaw = localStorage.getItem(STORAGE_KEY_USERS);
  const users: User[] = usersRaw ? JSON.parse(usersRaw) : [];
  
  // In a real app, we would hash passwords. Here we just check existence for demo.
  const user = users.find(u => u.email === email);
  
  if (user) {
    const token = `mock-jwt-token-${user.id}-${Date.now()}`;
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    return { user, token };
  }
  
  throw new Error("Invalid credentials");
};

export const apiRegister = async (name: string, email: string, password: string): Promise<AuthResponse> => {
  await delay(600);
  const usersRaw = localStorage.getItem(STORAGE_KEY_USERS);
  const users: User[] = usersRaw ? JSON.parse(usersRaw) : [];
  
  if (users.find(u => u.email === email)) {
    throw new Error("User already exists");
  }

  const newUser: User = {
    id: crypto.randomUUID(),
    name,
    email,
  };

  users.push(newUser);
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  
  const token = `mock-jwt-token-${newUser.id}-${Date.now()}`;
  localStorage.setItem(STORAGE_KEY_TOKEN, token);
  
  return { user: newUser, token };
};

export const apiLogout = async () => {
  localStorage.removeItem(STORAGE_KEY_TOKEN);
};

export const apiGetUser = async (): Promise<User | null> => {
   // Simulates verifying token and getting user
   const token = localStorage.getItem(STORAGE_KEY_TOKEN);
   if (!token) return null;
   
   // In a real app, we decode the token. Here we cheat and grab the first user for demo 
   // or stored user state. For simplicity, let's just return the last registered user 
   // if token exists, or fail.
   const usersRaw = localStorage.getItem(STORAGE_KEY_USERS);
   const users: User[] = usersRaw ? JSON.parse(usersRaw) : [];
   if (users.length > 0) return users[0];
   
   return null;
};


// --- Task Service ---

export const apiGetTasks = async (): Promise<Task[]> => {
  await delay(400);
  const tasksRaw = localStorage.getItem(STORAGE_KEY_TASKS);
  return tasksRaw ? JSON.parse(tasksRaw) : [];
};

export const apiCreateTask = async (title: string, description?: string): Promise<Task> => {
  await delay(400);
  const tasks = await apiGetTasks();
  
  const newTask: Task = {
    id: crypto.randomUUID(),
    title,
    description,
    status: TaskStatus.PENDING,
    createdAt: new Date().toISOString(),
    userId: 'mock-user-id', // In real app, from JWT
  };
  
  tasks.unshift(newTask); // Add to top
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
  return newTask;
};

export const apiUpdateTask = async (id: string, updates: Partial<Task>): Promise<Task> => {
  await delay(300);
  const tasks = await apiGetTasks();
  const index = tasks.findIndex(t => t.id === id);
  
  if (index === -1) throw new Error("Task not found");
  
  const updatedTask = { ...tasks[index], ...updates };
  tasks[index] = updatedTask;
  
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
  return updatedTask;
};

export const apiDeleteTask = async (id: string): Promise<void> => {
  await delay(300);
  const tasks = await apiGetTasks();
  const filtered = tasks.filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(filtered));
};
