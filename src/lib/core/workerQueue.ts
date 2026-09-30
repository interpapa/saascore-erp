/**
 * Rendo - Asynchronous Worker Queue & Batch Processing Engine (Enterprise Tier)
 * 
 * Encola tareas pesadas o no críticas (notificaciones, auditorías secundarias,
 * reportes, dispatch de webhooks, importaciones masivas) para ejecutarlas en segundo plano
 * con control de concurrencia, prioridades y reintentos sin bloquear el hilo principal.
 */

export type TaskPriority = 'high' | 'normal' | 'low';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';
export type TaskHandler = () => Promise<void>;

export interface TaskOptions {
  priority?: TaskPriority;
  retries?: number;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

export interface QueuedTask {
  id: string;
  name: string;
  priority: TaskPriority;
  status: TaskStatus;
  handler: TaskHandler;
  retriesLeft: number;
  maxRetries: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  high: 3,
  normal: 2,
  low: 1,
};

class WorkerQueue {
  private queue: QueuedTask[] = [];
  private activeTasks = new Map<string, QueuedTask>();
  private completedTasks = new Map<string, QueuedTask>();
  private maxConcurrency = 3;
  private maxHistorySize = 100;

  /**
   * Encola una tarea con prioridad, reintentos y callbacks opcionales.
   */
  public enqueue(
    name: string,
    handler: TaskHandler,
    options: TaskOptions = {}
  ): string {
    const id = crypto.randomUUID();
    const retries = typeof options.retries === 'number' ? options.retries : 2;

    const task: QueuedTask = {
      id,
      name,
      priority: options.priority || 'normal',
      status: 'pending',
      handler,
      retriesLeft: retries,
      maxRetries: retries,
      createdAt: Date.now(),
      onSuccess: options.onSuccess,
      onError: options.onError,
    };

    // Insertar respetando la prioridad
    this.insertByPriority(task);
    this.processNext();
    return id;
  }

  /**
   * Encola un lote de elementos para procesamiento en segundo plano en bloques (chunks).
   */
  public async enqueueBatch<T>(
    batchName: string,
    items: T[],
    chunkSize: number,
    processor: (chunk: T[], chunkIndex: number) => Promise<void>,
    options: TaskOptions = {}
  ): Promise<string[]> {
    const taskIds: string[] = [];
    const chunks: T[][] = [];

    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize));
    }

    chunks.forEach((chunk, index) => {
      const id = this.enqueue(
        `${batchName} [Lote ${index + 1}/${chunks.length}]`,
        () => processor(chunk, index),
        options
      );
      taskIds.push(id);
    });

    return taskIds;
  }

  private insertByPriority(task: QueuedTask): void {
    const weight = PRIORITY_WEIGHTS[task.priority];
    const index = this.queue.findIndex(
      (item) => PRIORITY_WEIGHTS[item.priority] < weight
    );

    if (index === -1) {
      this.queue.push(task);
    } else {
      this.queue.splice(index, 0, task);
    }
  }

  private async processNext(): Promise<void> {
    if (this.activeTasks.size >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    task.status = 'running';
    task.startedAt = Date.now();
    this.activeTasks.set(task.id, task);

    // Intentar lanzar más tareas si hay capacidad concurrente disponible
    if (this.activeTasks.size < this.maxConcurrency && this.queue.length > 0) {
      setTimeout(() => this.processNext(), 0);
    }

    try {
      await task.handler();
      task.status = 'completed';
      task.completedAt = Date.now();
      if (task.onSuccess) {
        try { task.onSuccess(); } catch { /* ignore callback errors */ }
      }
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      console.error(`[WorkerQueue] Error ejecutando tarea "${task.name}" (${task.id}):`, errorObj.message);

      if (task.retriesLeft > 0) {
        task.retriesLeft -= 1;
        task.status = 'pending';
        console.warn(`[WorkerQueue] Reintentando "${task.name}". Intentos restantes: ${task.retriesLeft}`);
        this.insertByPriority(task);
      } else {
        task.status = 'failed';
        task.error = errorObj.message;
        task.completedAt = Date.now();
        if (task.onError) {
          try { task.onError(errorObj); } catch { /* ignore callback errors */ }
        }
      }
    } finally {
      this.activeTasks.delete(task.id);
      this.recordHistory(task);

      if (this.queue.length > 0) {
        setTimeout(() => this.processNext(), 10);
      }
    }
  }

  private recordHistory(task: QueuedTask): void {
    if (this.completedTasks.size >= this.maxHistorySize) {
      const oldestKey = this.completedTasks.keys().next().value;
      if (oldestKey) this.completedTasks.delete(oldestKey);
    }
    this.completedTasks.set(task.id, task);
  }

  /**
   * Consulta el estado de una tarea por su ID.
   */
  public getTask(id: string): QueuedTask | undefined {
    return this.activeTasks.get(id) || this.completedTasks.get(id) || this.queue.find((t) => t.id === id);
  }

  /**
   * Resumen de salud y estadísticas de la cola de trabajo.
   */
  public getStats(): { pending: number; active: number; completed: number; failed: number } {
    let completed = 0;
    let failed = 0;
    for (const t of this.completedTasks.values()) {
      if (t.status === 'completed') completed++;
      if (t.status === 'failed') failed++;
    }

    return {
      pending: this.queue.length,
      active: this.activeTasks.size,
      completed,
      failed,
    };
  }

  public get pendingCount(): number {
    return this.queue.length;
  }
}

export const workerQueue = new WorkerQueue();
