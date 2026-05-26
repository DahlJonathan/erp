import { useEffect, useState } from 'react'
import { Check, ChevronDown, Pencil, Plus, Trash2, X } from 'lucide-react'

import { mapTaskRow, toTaskInsert } from '../data/supabaseMappers'
import { supabase } from '../supabaseClient'
import type { Task, TaskRow, TaskStatus } from '../types/types'

type ProjectTasksProps = {
    projectId: string
    userId: string
    onTaskChange?: (action: 'created' | 'updated' | 'deleted', task: Task) => void
}

type NewTaskForm = {
    title: string
    description: string
    dueDate: string
}

const statusConfig: Record<TaskStatus, { label: string; className: string; nextStatus: TaskStatus | null }> = {
    todo: {
        label: 'Tehtävänä',
        className: 'border border-slate-400 bg-slate-100 text-slate-800',
        nextStatus: 'in_progress',
    },
    in_progress: {
        label: 'Kesken',
        className: 'border border-amber-400 bg-amber-100 text-amber-900',
        nextStatus: 'done',
    },
    done: {
        label: 'Valmis',
        className: 'border border-emerald-400 bg-emerald-100 text-emerald-800',
        nextStatus: null,
    },
}

const statusOrder: TaskStatus[] = ['todo', 'in_progress', 'done']

const emptyForm: NewTaskForm = { title: '', description: '', dueDate: '' }

async function getTasksByProjectId(projectId: string): Promise<Task[]> {
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return (data as TaskRow[]).map(mapTaskRow)
}

async function createTask(input: {
    projectId: string
    userId: string
    title: string
    description: string
    dueDate: string | null
}): Promise<Task> {
    const { data, error } = await supabase
        .from('tasks')
        .insert([toTaskInsert({ ...input, status: 'todo' })])
        .select('*')
        .single()

    if (error) throw new Error(error.message)
    return mapTaskRow(data as TaskRow)
}

async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
    const { data, error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId)
        .select('*')
        .single()

    if (error) throw new Error(error.message)
    return mapTaskRow(data as TaskRow)
}

async function deleteTask(taskId: string): Promise<void> {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (error) throw new Error(error.message)
}

async function updateTask(
    taskId: string,
    fields: { title: string; description: string; dueDate: string | null },
): Promise<Task> {
    const { data, error } = await supabase
        .from('tasks')
        .update({
            title: fields.title,
            description: fields.description,
            due_date: fields.dueDate,
        })
        .eq('id', taskId)
        .select('*')
        .single()

    if (error) throw new Error(error.message)
    return mapTaskRow(data as TaskRow)
}

export function ProjectTasks({ projectId, userId, onTaskChange }: ProjectTasksProps) {
    const [tasks, setTasks] = useState<Task[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [form, setForm] = useState<NewTaskForm>(emptyForm)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<NewTaskForm>(emptyForm)
    const [isSavingEdit, setIsSavingEdit] = useState(false)

    useEffect(() => {
        let isActive = true

        setIsLoading(true)
        getTasksByProjectId(projectId)
            .then((loaded) => {
                if (isActive) {
                    setTasks(loaded)
                    setIsLoading(false)
                }
            })
            .catch((err: unknown) => {
                if (isActive) {
                    setLoadError(err instanceof Error ? err.message : 'Lataus epäonnistui.')
                    setIsLoading(false)
                }
            })

        return () => {
            isActive = false
        }
    }, [projectId])

    async function handleCreate(event: React.FormEvent) {
        event.preventDefault()
        if (!form.title.trim()) return

        setIsSubmitting(true)
        setFormError(null)

        try {
            const created = await createTask({
                projectId,
                userId,
                title: form.title.trim(),
                description: form.description.trim(),
                dueDate: form.dueDate || null,
            })
            setTasks((prev) => [...prev, created])
            onTaskChange?.('created', created)
            setForm(emptyForm)
        } catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : 'Luonti epäonnistui.')
        } finally {
            setIsSubmitting(false)
        }
    }

    function handleStartEdit(task: Task) {
        setEditingTaskId(task.id)
        setEditForm({
            title: task.title,
            description: task.description,
            dueDate: task.dueDate ?? '',
        })
    }

    function handleCancelEdit() {
        setEditingTaskId(null)
        setEditForm(emptyForm)
    }

    async function handleSaveEdit(task: Task) {
        if (!editForm.title.trim()) return
        setIsSavingEdit(true)
        try {
            const updated = await updateTask(task.id, {
                title: editForm.title.trim(),
                description: editForm.description.trim(),
                dueDate: editForm.dueDate || null,
            })
            setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)))
            onTaskChange?.('updated', updated)
            setEditingTaskId(null)
        } catch {
            // keep editing on error
        } finally {
            setIsSavingEdit(false)
        }
    }

    async function handleStatusChange(task: Task, newStatus: TaskStatus) {
        setUpdatingId(task.id)
        try {
            const updated = await updateTaskStatus(task.id, newStatus)
            setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)))
            onTaskChange?.('updated', updated)
        } catch {
            // status stays unchanged on error
        } finally {
            setUpdatingId(null)
        }
    }

    async function handleDelete(taskId: string) {
        setDeletingId(taskId)
        try {
            await deleteTask(taskId)
            setTasks((prev) => {
                const removed = prev.find((t) => t.id === taskId)
                if (removed) onTaskChange?.('deleted', removed)
                return prev.filter((t) => t.id !== taskId)
            })
        } catch {
            // keep task on error
        } finally {
            setDeletingId(null)
        }
    }

    const tasksByStatus = statusOrder.reduce<Record<TaskStatus, Task[]>>(
        (acc, status) => {
            acc[status] = tasks.filter((t) => t.status === status)
            return acc
        },
        { todo: [], in_progress: [], done: [] },
    )

    return (
        <div className="rounded-3xl border-2 border-slate-400 bg-slate-50 p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Tehtävät</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Projektin tehtävät</h3>

            {/* Create form */}
            <form onSubmit={(e) => void handleCreate(e)} className="mt-5 rounded-2xl border-2 border-slate-300 bg-white p-4">
                <p className="mb-3 text-sm font-medium text-slate-700">Uusi tehtävä</p>
                <div className="flex flex-wrap items-center gap-3">
                    <input
                        type="text"
                        placeholder="Tehtävän otsikko"
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        required
                        className="w-48 min-w-0 rounded-xl border-2 border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10"
                    />
                    <input
                        type="date"
                        value={form.dueDate}
                        onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                        className="rounded-xl border-2 border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10"
                    />
                    <button
                        type="submit"
                        disabled={isSubmitting || !form.title.trim()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                    >
                        <Plus size={14} />
                        {isSubmitting ? 'Lisätään...' : 'Lisää'}
                    </button>
                    {formError ? <span className="text-sm text-rose-600">{formError}</span> : null}
                </div>
                <textarea
                    placeholder="Kuvaus (valinnainen)"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="mt-3 w-full resize-none rounded-xl border-2 border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10"
                />
            </form>

            {/* Task list */}
            <div className="mt-6 space-y-6">
                {isLoading ? (
                    <p className="text-sm text-slate-500">Ladataan tehtäviä...</p>
                ) : loadError ? (
                    <p className="text-sm text-rose-600">{loadError}</p>
                ) : tasks.length === 0 ? (
                    <p className="text-sm text-slate-500">Ei tehtäviä vielä. Lisää ensimmäinen tehtävä yllä.</p>
                ) : (
                    statusOrder.map((status) => {
                        const group = tasksByStatus[status]
                        if (group.length === 0) return null
                        const config = statusConfig[status]

                        return (
                            <div key={status}>
                                <div className="mb-3 flex items-center gap-2">
                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.className}`}>
                                        {config.label}
                                    </span>
                                    <span className="text-xs text-slate-400">{group.length}</span>
                                </div>
                                <ul className="space-y-2">
                                    {group.map((task) => (
                                        <li
                                            key={task.id}
                                            className="rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 transition"
                                        >
                                            {editingTaskId === task.id ? (
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={editForm.title}
                                                            onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                                                            className="w-48 min-w-0 rounded-xl border-2 border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10"
                                                        />
                                                        <input
                                                            type="date"
                                                            value={editForm.dueDate}
                                                            onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))}
                                                            className="rounded-xl border-2 border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleSaveEdit(task)}
                                                            disabled={isSavingEdit || !editForm.title.trim()}
                                                            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                                                        >
                                                            <Check size={12} />
                                                            {isSavingEdit ? 'Tallennetaan...' : 'Tallenna'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleCancelEdit}
                                                            className="flex-shrink-0 text-slate-400 transition hover:text-slate-700"
                                                            title="Peruuta"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                    <textarea
                                                        value={editForm.description}
                                                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                                                        placeholder="Kuvaus (valinnainen)"
                                                        rows={2}
                                                        className="w-full resize-none rounded-xl border-2 border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex items-start gap-3">
                                                    {/* Status cycle button */}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            void handleStatusChange(
                                                                task,
                                                                config.nextStatus ?? 'todo',
                                                            )
                                                        }
                                                        disabled={updatingId === task.id}
                                                        title={
                                                            config.nextStatus
                                                                ? `Merkitse: ${statusConfig[config.nextStatus].label}`
                                                                : 'Merkitse tehtäväksi'
                                                        }
                                                        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition ${
                                                            task.status === 'done'
                                                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                                                : task.status === 'in_progress'
                                                                  ? 'border-amber-400 bg-amber-100 text-amber-700'
                                                                  : 'border-slate-400 bg-white hover:border-slate-600'
                                                        } disabled:opacity-50`}
                                                    >
                                                        {task.status === 'done' ? (
                                                            <Check size={11} strokeWidth={3} />
                                                        ) : task.status === 'in_progress' ? (
                                                            <ChevronDown size={11} strokeWidth={2.5} />
                                                        ) : null}
                                                    </button>

                                                    <div className="min-w-0 flex-1">
                                                        <p
                                                            className={`text-sm font-medium ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-950'}`}
                                                        >
                                                            {task.title}
                                                        </p>
                                                        {task.description ? (
                                                            <p className="mt-0.5 text-xs text-slate-500">{task.description}</p>
                                                        ) : null}
                                                        {task.dueDate ? (
                                                            <p className="mt-1 text-xs text-slate-400">
                                                                Eräpäivä: {task.dueDate}
                                                            </p>
                                                        ) : null}
                                                    </div>

                                                    {/* Status dropdown */}
                                                    <select
                                                        value={task.status}
                                                        disabled={updatingId === task.id}
                                                        onChange={(e) =>
                                                            void handleStatusChange(task, e.target.value as TaskStatus)
                                                        }
                                                        className="rounded-xl border-2 border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 outline-none transition focus:border-slate-950 disabled:opacity-50"
                                                    >
                                                        <option value="todo">Tehtävänä</option>
                                                        <option value="in_progress">Kesken</option>
                                                        <option value="done">Valmis</option>
                                                    </select>

                                                    {/* Edit */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStartEdit(task)}
                                                        className="mt-0.5 flex-shrink-0 text-slate-500 transition hover:text-slate-900"
                                                        title="Muokkaa tehtävää"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>

                                                    {/* Delete */}
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleDelete(task.id)}
                                                        disabled={deletingId === task.id}
                                                        className="mt-0.5 flex-shrink-0 text-slate-500 transition hover:text-rose-900 disabled:opacity-50"
                                                        title="Poista tehtävä"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
