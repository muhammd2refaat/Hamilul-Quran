/**
 * Questions management page
 */

import React, { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Edit2 } from 'lucide-react';
import { Button, Card, DataTable, Modal, ConfirmDialog, Input } from '@/shared/components';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type Question = {
  id: string;
  title: string;
  text: string;
  status: 'active' | 'inactive';
  choicesCount: number;
  createdAt: string;
};

type QuestionFormData = {
  title: string;
  text: string;
  choice1: string;
  choice2: string;
  choice3: string;
  choice4: string;
  correctOption: '1' | '2' | '3' | '4';
  status: 'active' | 'inactive';
};

// Mock data for questions
const mockQuestions: Question[] = [
  { id: '1', title: 'Blood Pressure Definition', text: 'What is the normal range for systolic blood pressure?', status: 'active', choicesCount: 4, createdAt: new Date('2024-01-15').toISOString() },
  { id: '2', title: 'Medical Abbreviation', text: 'What does CPR stand for?', status: 'active', choicesCount: 4, createdAt: new Date('2024-02-10').toISOString() },
  { id: '3', title: 'Healthcare Ethics', text: 'Which principle emphasizes doing no harm?', status: 'inactive', choicesCount: 4, createdAt: new Date('2024-03-05').toISOString() },
];

export const QuestionsPage: React.FC = () => {
  const [search, setSearch] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>(mockQuestions);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<QuestionFormData>({
    title: '',
    text: '',
    choice1: '',
    choice2: '',
    choice3: '',
    choice4: '',
    correctOption: '1',
    status: 'active',
  });

  // Handlers
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setFormData({ 
      title: '', 
      text: '', 
      choice1: '', 
      choice2: '', 
      choice3: '', 
      choice4: '', 
      correctOption: '1', 
      status: 'active' 
    });
    setSelectedQuestion(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (question: Question) => {
    setModalMode('edit');
    // In a real app, you'd fetch the full question details including choices
    setFormData({ 
      title: question.title, 
      text: question.text, 
      choice1: '', 
      choice2: '', 
      choice3: '', 
      choice4: '', 
      correctOption: '1', 
      status: question.status 
    });
    setSelectedQuestion(question);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedQuestion(null);
  };

  const handleSave = () => {
    if (!formData.title.trim() || !formData.text.trim() || !formData.choice1.trim() || !formData.choice2.trim() || !formData.choice3.trim() || !formData.choice4.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (modalMode === 'create') {
      const newQuestion: Question = {
        id: `question-${Date.now()}`,
        title: formData.title,
        text: formData.text,
        choicesCount: 4,
        status: formData.status,
        createdAt: new Date().toISOString(),
      };
      setQuestions([...questions, newQuestion]);
      toast.success('Question created successfully');
    } else if (modalMode === 'edit' && selectedQuestion) {
      setQuestions(
        questions.map((question) =>
          question.id === selectedQuestion.id
            ? { ...question, title: formData.title, text: formData.text, status: formData.status }
            : question
        )
      );
      toast.success('Question updated successfully');
    }
    handleCloseModal();
  };

  const handleOpenDeleteDialog = (question: Question) => {
    setSelectedQuestion(question);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedQuestion(null);
  };

  const handleDelete = () => {
    if (selectedQuestion) {
      setQuestions(questions.filter((question) => question.id !== selectedQuestion.id));
      toast.success('Question deleted successfully');
    }
    handleCloseDeleteDialog();
  };

  // Filter and search questions
  const filteredQuestions = useMemo(() => {
    let filtered = [...questions];
    if (search) {
      filtered = filtered.filter((question) => 
        question.title.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (statusFilter) {
      filtered = filtered.filter((question) => question.status === statusFilter);
    }
    // Sort by created at descending
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return filtered;
  }, [questions, search, statusFilter]);

  // Table columns
  const columns = useMemo<ColumnDef<Question>[]>(() => [
    {
      accessorKey: 'title',
      header: 'Question Title',
      cell: (info) => (
        <div className="font-medium text-gray-900">
          {info.getValue() as string}
        </div>
      ),
    },
    {
      accessorKey: 'text',
      header: 'Question Text',
      cell: (info) => (
        <div className="text-sm text-gray-600 max-w-md truncate">
          {info.getValue() as string}
        </div>
      ),
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
      accessorKey: 'choicesCount',
      header: () => <div className="text-center">Choices</div>,
      cell: (info) => (
        <div className="text-center text-sm text-gray-600">
          {info.getValue() as number}
        </div>
      ),
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
          <h1 className="text-2xl font-bold text-gray-900">Questions</h1>
          <p className="text-gray-600 mt-1">Manage quiz questions and answers</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreateModal}>
          Create Question
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex w-full justify-between gap-4">
            <input
              type="text"
              placeholder="Search by question title..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full md:w-80 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              style={{ maxWidth: '320px' }}
            />
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
          </div>
        </div>
        <DataTable
          data={filteredQuestions}
          columns={columns}
          enableSearch={false}
          emptyMessage="No questions found."
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={modalMode === 'create' ? 'Create Question' : 'Edit Question'}
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={
                !formData.title.trim() || 
                !formData.text.trim() || 
                !formData.choice1.trim() || 
                !formData.choice2.trim() || 
                !formData.choice3.trim() || 
                !formData.choice4.trim()
              }
            >
              {modalMode === 'create' ? 'Create' : 'Save'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Question Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter question title"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Text
            </label>
            <textarea
              value={formData.text}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData({ ...formData, text: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
              rows={3}
              placeholder="Enter question text"
              required
            />
          </div>
          
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Choices</label>
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <input
                  type="radio"
                  name="correctOption"
                  checked={formData.correctOption === '1'}
                  onChange={() => setFormData({ ...formData, correctOption: '1' })}
                  className="rounded-full border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <Input
                  value={formData.choice1}
                  onChange={(e) => setFormData({ ...formData, choice1: e.target.value })}
                  placeholder="Choice 1"
                  required
                />
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="radio"
                  name="correctOption"
                  checked={formData.correctOption === '2'}
                  onChange={() => setFormData({ ...formData, correctOption: '2' })}
                  className="rounded-full border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <Input
                  value={formData.choice2}
                  onChange={(e) => setFormData({ ...formData, choice2: e.target.value })}
                  placeholder="Choice 2"
                  required
                />
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="radio"
                  name="correctOption"
                  checked={formData.correctOption === '3'}
                  onChange={() => setFormData({ ...formData, correctOption: '3' })}
                  className="rounded-full border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <Input
                  value={formData.choice3}
                  onChange={(e) => setFormData({ ...formData, choice3: e.target.value })}
                  placeholder="Choice 3"
                  required
                />
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="radio"
                  name="correctOption"
                  checked={formData.correctOption === '4'}
                  onChange={() => setFormData({ ...formData, correctOption: '4' })}
                  className="rounded-full border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <Input
                  value={formData.choice4}
                  onChange={(e) => setFormData({ ...formData, choice4: e.target.value })}
                  placeholder="Choice 4"
                  required
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Select the correct answer by clicking the radio button</p>
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
        title="Delete Question"
        message={`Are you sure you want to delete "${selectedQuestion?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

export default QuestionsPage;
