import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Task } from '../types';
import Button from './Button';
import Input from './Input';
import { generateSubtasks } from '../services/geminiService';
import toast from 'react-hot-toast';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string) => Promise<void>;
  initialData?: Task | null;
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '');
      setDescription(initialData?.description || '');
      setAiSuggestions([]);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
        toast.error("Title is required");
        return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(title, description);
      onClose();
    } catch (error) {
      toast.error("Failed to save task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAiSuggest = async () => {
    if (!title) {
      toast.error("Please enter a title first");
      return;
    }
    setIsGenerating(true);
    try {
      const suggestions = await generateSubtasks(title, description);
      setAiSuggestions(suggestions);
      toast.success("AI Suggestions generated!");
    } catch (e) {
      toast.error("AI generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const addSuggestion = (suggestion: string) => {
    const newDesc = description ? `${description}\n- ${suggestion}` : `- ${suggestion}`;
    setDescription(newDesc);
    setAiSuggestions(prev => prev.filter(s => s !== suggestion));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-xl shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <h2 className="text-xl font-semibold text-white">
            {initialData ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Task Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Build Project API"
            autoFocus
          />
          
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-slate-300">Description</label>
              <button
                type="button"
                onClick={handleAiSuggest}
                disabled={isGenerating || !title}
                className="text-xs flex items-center text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                {isGenerating ? 'Thinking...' : 'Suggest Subtasks'}
              </button>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              placeholder="Task details..."
            />
          </div>

          {aiSuggestions.length > 0 && (
            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
              <p className="text-xs font-semibold text-purple-400 mb-2 flex items-center">
                <Sparkles className="w-3 h-3 mr-1" /> Gemini Suggestions:
              </p>
              <ul className="space-y-1">
                {aiSuggestions.map((s, i) => (
                  <li key={i} className="flex items-start justify-between text-xs text-slate-300 group">
                    <span>{s}</span>
                    <button 
                      type="button"
                      onClick={() => addSuggestion(s)}
                      className="text-blue-400 opacity-0 group-hover:opacity-100 hover:underline ml-2"
                    >
                      Add
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {initialData ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;