#include "parallel.h"

namespace zen_engine_v2 {

ThreadPool::ThreadPool(std::size_t threads) : threads_(threads) {}

ThreadPool::~ThreadPool() = default;

void ThreadPool::Submit(const std::function<void()>& task) {
  (void)task;
}

void ThreadPool::Wait() {}

void TaskScheduler::Schedule(const std::function<void()>& task) {
  if (pool_) {
    pool_->Submit(task);
  }
}

void TaskScheduler::Wait() {
  if (pool_) {
    pool_->Wait();
  }
}

} // namespace zen_engine_v2
