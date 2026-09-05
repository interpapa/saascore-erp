/**
 * Rendo - Asynchronous Worker Queue
 * 
 * Encola tareas pesadas o no críticas (notificaciones, auditorías secundarias,
 * reportes, dispatch de webhooks) para ejecutarlas en segundo plano sin
 * bloquear el tiempo de respuesta del hilo HTTP principal.
 */

export type TaskHandler = () => Promise<void>;

interface QueuedTask {
  id: string;
  name: string;
  handler: TaskHandler;
  retriesLeft: number;
}

class WorkerQueue {
  private queue: QueuedTask[] = [];
  private processing = false;

  /**
   * Encola una tarea para ejecución asíncrona no bloqueante.
   */
  public enqueue(name: string, handler: TaskHandler, retries = 2): void {
    const task: QueuedTask = {
      id: crypto.randomUUID(),
      name,
      handler,
      retriesLeft: retries,
    };

    this.queue.push(task);
    this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const task = this.queue.shift()!;

    try {
      await task.handler();
    } catch (err: unknown) {
      console.error(`[WorkerQueue] Error ejecutando tarea "${task.name}" (${task.id}):`, (err as Error).message);
      if (task.retriesLeft > 0) {
        task.retriesLeft -= 1;
        console.warn(`[WorkerQueue] Reintentando tarea "${task.name}". Intentos restantes: ${task.retriesLeft}`);
        this.queue.push(task);
      }
    } finally {
      this.processing = false;
      if (this.queue.length > 0) {
        // Ceder control al Event Loop antes de procesar el siguiente trabajo
        setTimeout(() => this.processNext(), 10);
      }
    }
  }

  /**
   * Obtiene la cantidad de tareas pendientes en la cola.
   */
  public get pendingCount(): number {
    return this.queue.length;
  }
}

export const workerQueue = new WorkerQueue();
