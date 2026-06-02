export class ConcurrencyQueue {
    constructor(limit = 3) {
      this.limit = limit;
      this.activeCount = 0;
      this.queue = [];
    }
  
    add(task) {
      this.queue.push(task);
      this.process();
    }
  
    process() {
      if (this.activeCount >= this.limit) return;
      if (this.queue.length === 0) return;
  
      const task = this.queue.shift();
      this.activeCount++;
  
      task()
        .catch(() => {})
        .finally(() => {
          this.activeCount--;
          this.process();
        });
  
      this.process();
    }
  }