#pragma once

#include <cstddef>
#include <functional>
#include <vector>

namespace zen_engine_v2 {

class ThreadPool {
public:
  explicit ThreadPool(std::size_t threads = 0);
  ~ThreadPool();
  void Submit(const std::function<void()>& task);
  void Wait();

private:
  std::size_t threads_ = 0;
};

class TaskScheduler {
public:
  explicit TaskScheduler(ThreadPool* pool) : pool_(pool) {}
  void Schedule(const std::function<void()>& task);
  void Wait();

private:
  ThreadPool* pool_ = nullptr;
};

} // namespace zen_engine_v2
