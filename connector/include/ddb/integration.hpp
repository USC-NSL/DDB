#pragma once

#include <csignal>
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <unistd.h>

#include "ddb/basic.hpp"
#include "ddb/service_reporter.hpp"

#include <pthread.h>
#include <stdio.h>

namespace DDB {
static int SIGDDBWAIT = 40; // re-use real-time signal for ddb needs

struct Config {
  std::string ipv4;
  bool auto_discovery;
  bool wait_for_attach;
  std::string tag;
  std::string alias;
  std::string ini_filepath;
  std::map<std::string, std::string> user_data;

  static Config get_default(const std::string &ipv4) {
    return Config{.ipv4 = ipv4,
                  .auto_discovery = true,
                  .wait_for_attach = true,
                  .tag = "proc",
                  .alias = "bin",
                  .ini_filepath = default_ini_filepath()};
  }

  static Config get_default() {
    return Config{.ipv4 = DDB::uint32_to_ipv4(DDB::get_ipv4_from_local()),
                  .auto_discovery = true,
                  .wait_for_attach = true,
                  .tag = "proc",
                  .alias = "bin",
                  .ini_filepath = default_ini_filepath()};
  }

  inline Config with_tag(const std::string &tag) {
    this->tag = tag;
    return *this;
  }

  inline Config with_alias(const std::string &alias) {
    this->alias = alias;
    return *this;
  }

  inline Config with_ini_filepath(const std::string &ini_filepath) {
    this->ini_filepath = ini_filepath;
    return *this;
  }

  inline Config
  with_user_data(const std::map<std::string, std::string> &user_data) {
    this->user_data = user_data;
    return *this;
  }

  inline std::string to_string() {
    std::stringstream ss;
    for (const auto &kv : this->user_data) {
      ss << kv.first << "=" << kv.second << ",";
    }
    ss.str(ss.str().substr(0, ss.str().size() - 1)); // remove last comma
    return "Config { \nipv4 = " + this->ipv4 +
           ", auto_discovery = " + std::to_string(this->auto_discovery) +
           ", wait_for_attach = " + std::to_string(this->wait_for_attach) +
           ", tag = " + this->tag + ", alias = " + this->alias +
           ", ini_filepath = " + this->ini_filepath + ", user_data = {" +
           ss.str() +
           "}"
           "\n}";
  }
};

static inline void block_signal(int sig) {
  sigset_t set;
  sigemptyset(&set);
  sigaddset(&set, sig);
  pthread_sigmask(SIG_BLOCK, &set, NULL);
}

static inline void unblock_signal(int sig) {
  sigset_t set;
  sigemptyset(&set);
  sigaddset(&set, sig);
  pthread_sigmask(SIG_UNBLOCK, &set, NULL);
}

static inline void wait_for_signal(int sig) {
  sigset_t set;
  int received_sig;

  sigemptyset(&set);
  sigaddset(&set, sig);

  printf("Process PID: %d. Waiting for signal %d to continue...\n", getpid(),
         sig);

  // Wait for the signal
  sigwait(&set, &received_sig);

  // printf("Received signal %d. Resuming execution.\n", received_sig);
  printf("Debugger attached. Resume execution...\n");
}

static inline void sig_ddb_wait_handler(int) { raise(SIGTRAP); }

static inline void setup_ddb_signal_handler() {
  // ddb will signal SIGDDBWAIT right after attaching in all cases.
  // This is useful for debuggee who needs to wait for debugger to attach.
  // signal SIGDDBWAIT will tell the debuggee to keep execution.
  //
  // However, we want the debuggee to stop for inspection upon attach,
  // but signal in gdb will continue the execution.
  // Therefore, this is the hack to force trap the program after SIGDDBWAIT.
  struct sigaction sig_ddb_wait_action;
  sig_ddb_wait_action.sa_handler = sig_ddb_wait_handler;
  sigemptyset(&sig_ddb_wait_action.sa_mask);
  sig_ddb_wait_action.sa_flags = 0;
  sigaction(SIGDDBWAIT, &sig_ddb_wait_action, NULL);
}

class DDBConnector {
public:
  inline void init() {
    populate_ddb_metadata(this->config.ipv4);
    if (this->config.auto_discovery) {
      this->init_discovery();
    } else {
      setup_ddb_signal_handler();
    }
    std::cout << "ddb connector initialized. meta = { pid = "
              << DDB::ddb_meta.pid << ", comm_ip = " << DDB::ddb_meta.comm_ip
              << ", ipv4_str =" << DDB::ddb_meta.ipv4_str << " }" << std::endl;
  }

  DDBConnector() { this->config = Config::get_default(); }
  DDBConnector(Config config) : config(config) {};
  DDBConnector(const std::string &ipv4, bool enable_discovery = true) {
    auto config = Config::get_default(ipv4);
    config.auto_discovery = enable_discovery;
    this->config = config;
  }
  DDBConnector(const std::string &ipv4, bool enable_discovery = true,
               bool wait_for_attach = true) {
    auto config = Config::get_default(ipv4);
    config.auto_discovery = enable_discovery;
    config.wait_for_attach = wait_for_attach;
    this->config = config;
  }

  ~DDBConnector() { this->deinit(); }

private:
  Config config;
  DDBServiceReporter reporter;

  static inline void wait_for_debugger() {
    // Wait for the debugger to attach.
    // Upon attaching, ddb shall signal SIGDDBWAIT and back to the regular flow
    // but signal SIGDDBWAIT will resume execution, which is not what we want.
    // this is the hack to re-trap the debuggee again.
    block_signal(SIGDDBWAIT);
    wait_for_signal(SIGDDBWAIT);
    raise(SIGTRAP); // force gdb to stop the debuggee again
  }

  inline void deinit_discovery() {
    int ret_val = service_reporter_deinit(&reporter);
    if (ret_val)
      std::cerr << "failed to deinit service reporter" << std::endl;
  }

  inline void deinit() {
    if (this->config.auto_discovery)
      this->deinit_discovery();
    unblock_signal(SIGDDBWAIT);
  }

  inline void init_discovery() {
    auto hash = compute_self_hash();

    auto service = ServiceInfo{.ip = DDB::ddb_meta.comm_ip,
                               .tag = this->config.tag,
                               .pid = DDB::ddb_meta.pid,
                               .hash = hash,
                               .alias = this->config.alias,
                               .user_data = this->config.user_data};

    this->config.auto_discovery = false;
    bool failure = false;
    if (service_reporter_init(&reporter, this->config.ini_filepath) != 0) {
      std::cerr << "failed to initialize service reporter" << std::endl;
      failure = true;
    } else {
      if (report_service(&reporter, &service) != 0) {
        std::cerr << "failed to report new service" << std::endl;
        failure = true;
      } else {
        this->config.auto_discovery = false;
        if (this->config.wait_for_attach) {
          DDB::DDBConnector::wait_for_debugger();
        } else {
          setup_ddb_signal_handler();
        }
      }
    }

    if (failure) {
      setup_ddb_signal_handler();
    }
  }
};
} // namespace DDB
