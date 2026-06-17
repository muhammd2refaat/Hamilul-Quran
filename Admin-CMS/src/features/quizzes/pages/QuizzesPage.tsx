/**
 * Quizzes management page
 */

import React, { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Edit2 } from 'lucide-react';
import { Button, Card, DataTable, Modal, ConfirmDialog, Input } from '@/shared/components';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type Quiz = {
  id: string;
  title: string;
  description: string;
  questionsCount: number;
  questionIds: string[];
  status: 'active' | 'inactive';
  createdAt: string;
};

type QuizFormData = {
  title: string;
  description: string;
  questionIds: string[];
  status: 'active' | 'inactive';
};

type Question = {
  id: string;
  title: string;
  text: string;
};

// Mock data for available questions
const mockQuestions: Question[] = [
  { id: 'q1', title: 'Blood Pressure Definition', text: 'What is the normal range for systolic blood pressure?' },
  { id: 'q2', title: 'Medical Abbreviation CPR', text: 'What does CPR stand for?' },
  { id: 'q3', title: 'Healthcare Ethics Principle', text: 'Which principle emphasizes doing no harm?' },
  { id: 'q4', title: 'Patient Rights', text: 'What are the fundamental rights of patients?' },
  { id: 'q5', title: 'Medical Terminology', text: 'What does the term "tachycardia" mean?' },
  { id: 'q6', title: 'Infection Control', text: 'What is the most effective method of infection control?' },
  { id: 'q7', title: 'Patient Assessment', text: 'What are the vital signs in patient assessment?' },
  { id: 'q8', title: 'Medication Safety', text: 'What are the five rights of medication administration?' },
];

// Mock data for quizzes
const mockQuizzes: Quiz[] = [
  { id: '1', title: 'Medical Terminology Basics', description: 'Test your knowledge of basic medical terms', questionsCount: 3, questionIds: ['q1', 'q2', 'q5'], status: 'active', createdAt: new Date('2024-01-15').toISOString() },
  { id: '2', title: 'Patient Care Standards', description: 'Assessment of patient care protocols', questionsCount: 4, questionIds: ['q4', 'q6', 'q7', 'q8'], status: 'active', createdAt: new Date('2024-02-20').toISOString() },
  { id: '3', title: 'Healthcare Ethics', description: 'Quiz on ethical practices in healthcare', questionsCount: 2, questionIds: ['q3', 'q4'], status: 'inactive', createdAt: new Date('2024-03-10').toISOString() },
];

export const QuizzesPage: React.FC = () => {
  const [search, setSearch] = useState<string>('');
  const [quizzes, setQuizzes] = useState<Quiz[]>(mockQuizzes);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [questionCountFilter, setQuestionCountFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<QuizFormData>({
    title: '',
    description: '',
    questionIds: [],
    status: 'active',
  });
  const [availableQuestions] = useState<Question[]>(mockQuestions);

  // Handlers
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setFormData({ title: '', description: '', questionIds: [], status: 'active' });
    setSelectedQuiz(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (quiz: Quiz) => {
    setModalMode('edit');
    setFormData({ title: quiz.title, description: quiz.description, questionIds: quiz.questionIds, status: quiz.status });
    setSelectedQuiz(quiz);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedQuiz(null);
  };

  const handleSave = () => {
    if (!formData.title.trim() || formData.questionIds.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (modalMode === 'create') {
      const newQuiz: Quiz = {
        id: `quiz-${Date.now()}`,
        title: formData.title,
        description: formData.description,
        questionsCount: formData.questionIds.length,
        questionIds: formData.questionIds,
        status: formData.status,
        createdAt: new Date().toISOString(),
      };
      setQuizzes([...quizzes, newQuiz]);
      toast.success('Quiz created successfully');
    } else if (modalMode === 'edit' && selectedQuiz) {
      setQuizzes(
        quizzes.map((quiz) =>
          quiz.id === selectedQuiz.id
            ? { ...quiz, title: formData.title, description: formData.description, questionsCount: formData.questionIds.length, questionIds: formData.questionIds, status: formData.status }
            : quiz
        )
      );
      toast.success('Quiz updated successfully');
    }
    handleCloseModal();
  };

  const handleQuestionToggle = (questionId: string) => {
    setFormData((prev) => ({
      ...prev,
      questionIds: prev.questionIds.includes(questionId)
        ? prev.questionIds.filter((id) => id !== questionId)
        : [...prev.questionIds, questionId],
    }));
  };

  const handleOpenDeleteDialog = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedQuiz(null);
  };

  const handleDelete = () => {
    if (selectedQuiz) {
      setQuizzes(quizzes.filter((quiz) => quiz.id !== selectedQuiz.id));
      toast.success('Quiz deleted successfully');
    }
    handleCloseDeleteDialog();
  };

  // Filter and search quizzes
  const filteredQuizzes = useMemo(() => {
    let filtered = [...quizzes];
    if (search) {
      filtered = filtered.filter((quiz) => 
        quiz.title.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (statusFilter) {
      filtered = filtered.filter((quiz) => quiz.status === statusFilter);
    }
    if (questionCountFilter) {
      filtered = filtered.filter((quiz) => String(quiz.questionsCount) === questionCountFilter);
    }
    // Sort by created at descending
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return filtered;
  }, [quizzes, search, statusFilter, questionCountFilter]);

  // Table columns
  const columns = useMemo<ColumnDef<Quiz>[]>(() => [
    {
      accessorKey: 'title',
      header: 'Quiz Title',
      cell: (info) => (
        <div className="font-medium text-gray-900">
          {info.getValue() as string}
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => (
        <div className="text-sm text-gray-600 max-w-md truncate">
          {info.getValue() as string}
        </div>
      ),
    },
    {
      accessorKey: 'questionsCount',
      header: () => <div className="text-center">Questions</div>,
      cell: (info) => (
        <div className="text-center text-sm text-gray-600">
          {info.getValue() as number}
        </div>
      ),
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'status',
      header: () => <div className="text-center">Status</div>,
      cell: (info) => {
        const status = info.getValue() as string;
        const statusConfig = {
          active: { label: 'Active', color: 'bg-green-100 text-green-800' },
          inactive: { label: 'Inactive', color: 'bg-red-50 text-red-600' },
        };
        const config = statusConfig[status as 'active' | 'inactive'];
        return (
          <div className="flex justify-center">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
              {config.label}
            </span>
          </div>
        );
      },
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'createdAt',
      header: () => <div className="text-center">Created At</div>,
      cell: (info) => (
        <div className="text-center text-sm text-gray-600">
          {format(new Date(info.getValue() as string), 'MMM d, yyyy')}
        </div>
      ),
      meta: { className: 'text-center' },
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => handleOpenEditModal(row.original)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={() => handleOpenDeleteDialog(row.original)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      ),
      meta: { className: 'text-right' },
    },
  ], []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quizzes</h1>
          <p className="text-gray-600 mt-1">Manage educational quizzes and assessments</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreateModal}>
          Create Quiz
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex w-full justify-between gap-4">
            <input
              type="text"
              placeholder="Search by quiz title..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full md:w-80 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              style={{ maxWidth: '320px' }}
            />
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
                className="min-w-[155px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                style={{ maxWidth: '155px' }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={questionCountFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setQuestionCountFilter(e.target.value)}
                className="min-w-[155px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                style={{ maxWidth: '155px' }}
              >
                <option value="">All Questions No.</option>
                {[...new Set(quizzes.map(q => q.questionsCount))].sort((a, b) => a - b).map((count) => (
                  <option key={count} value={count}>{count}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <DataTable
          data={filteredQuizzes}
          columns={columns}
          enableSearch={false}
          emptyMessage="No quizzes found."
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={modalMode === 'create' ? 'Create Quiz' : 'Edit Quiz'}
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.title.trim() || formData.questionIds.length === 0}>
              {modalMode === 'create' ? 'Create' : 'Save'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Quiz Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter quiz title"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
              rows={3}
              placeholder="Enter quiz description"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Questions ({formData.questionIds.length} selected)
            </label>
            <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
              {availableQuestions.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No questions available. Please create questions first.
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {availableQuestions.map((question) => (
                    <label
                      key={question.id}
                      className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.questionIds.includes(question.id)}
                        onChange={() => handleQuestionToggle(question.id)}
                        className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">{question.title}</div>
                        <div className="text-gray-600 text-xs mt-0.5">{question.text}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {formData.questionIds.length === 0 && (
              <p className="text-xs text-red-600 mt-1">Please select at least one question</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDelete}
        onCancel={handleCloseDeleteDialog}
        title="Delete Quiz"
        message={`Are you sure you want to delete "${selectedQuiz?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

export default QuizzesPage;
