#!/bin/bash

# Install dependencies
# bash ./dep.sh

# source config.sh

# set -x
# git config --global user.name "$GIT_USER_NAME"
# git config --global user.email "$GIT_USER_EMAIL"

# Init gdb experience
echo "handle SIGUSR1 SIGUSR2 nostop noprint" >> ~/.gdbinit
echo "set auto-load safe-path /" >> ~/.gdbinit

echo "handle SIGUSR1 SIGUSR2 nostop noprint" >> ~/.config/gdb/gdbinit
echo "set auto-load safe-path /" >> ~/.config/gdb/gdbinit

# init submodules
# git submodule update --init --recursive

# allow gdb attach via pid
echo 0 | sudo tee /proc/sys/kernel/yama/ptrace_scope
