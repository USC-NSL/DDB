#/bin/bash

CURR_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

source "$CURR_DIR/../../shared.sh"

LOG_DIR="$LOG_DIR/overhead/nu_socialnet"
mkdir -p $LOG_DIR

function build_and_run() {
  local PREFIX_TEXT=$1
  local DEBUGGER_ATTACH=$2

  make clean
  make -j$(nproc)

  pushd exp/social_net/nu_multi/
  ./run.sh $PREFIX_TEXT $DEBUGGER_ATTACH

  # link_all_files "logs" "$LOG_DIR"
  cp logs/* $LOG_DIR/
  popd
}

function configure_ddb() {
  local ENABLE=$1
  if [[ $ENABLE -eq 1 ]]; then
    sed "s/CONFIG_DDB=.*/CONFIG_DDB=y/g" -i build/config
    sed "s/add_compile_definitions(DDB_SUPPORT.*/add_compile_definitions(DDB_SUPPORT)/g" -i $SOCIALNET_DIR/src/CMakeLists.txt
    sed "s/add_compile_definitions(DDB_SUPPORT.*/add_compile_definitions(DDB_SUPPORT)/g" -i $SOCIALNET_DIR/bench/CMakeLists.txt
  else
    sed "s/CONFIG_DDB=.*/CONFIG_DDB=n/g" -i build/config
    sed "s/add_compile_definitions(DDB_SUPPORT.*/add_compile_definitions(DDB_SUPPORT_DISABLE)/g" -i $SOCIALNET_DIR/src/CMakeLists.txt
    sed "s/add_compile_definitions(DDB_SUPPORT.*/add_compile_definitions(DDB_SUPPORT_DISABLE)/g" -i $SOCIALNET_DIR/bench/CMakeLists.txt
  fi
}

function prep_ddb_run() {
  # Get service discovery configuration to all servers
  # ideally, we expect /tmp/ddb is mounted as nfs, so we don't need to explicitly transfer the config
  EMPTY_PIPE=$CURR_DIR/empty_pipe
  pushd $DDB_DIR
  rm -f $EMPTY_PIPE
  mkfifo $EMPTY_PIPE
  uv sync
  cat $EMPTY_PIPE | uv run -- ddb $DDB_CONF/dbg_nu_c6525_exp.yaml >/dev/null 2>&1 &
  DDB_JOB=$!
  echo "Waiting DDB to be ready..."
  sleep 8
  popd
  batch_transfer $SERVICE_DISCOVERY_CONFIG_DIR/* $SERVICE_DISCOVERY_CONFIG_DIR
  # quick cleanup
  pkill -9 ddb
  pkill -9 mosquitto
  kill -9 $DDB_JOB
  pkill -9 cat
  rm -f $EMPTY_PIPE
}

SOCIALNET_DIR="$NU_DIR/app/socialNetwork/single_proclet"

pushd $NU_DIR

# Run test with DDB embedding disabled
# echo "Running NO DDB EMBEDDING + no debugger attached"
# configure_ddb 0
# build_and_run "DDB_DISABLE" 0 0

# Run test with DDB embedding disabled + gdb attached
echo "Running NO DDB EMBEDDING + gdb attached"
configure_ddb 0
build_and_run "DDB_DISABLE" 1 0

# Run test with DDB embedding enabled
# echo "Running DDB EMBEDDING + no debugger attached"
# configure_ddb 1
# build_and_run "DDB_ENABLE" 0 0

# Run test with DDB embedding + ddb attached
echo "Running DDB EMBEDDING + ddb attached"
configure_ddb 1
prep_ddb_run
build_and_run "DDB_ENABLE" 2 0

# Run test with DDB embedding disabled + gdb attached + bkpts insertion
# echo "Running NO DDB EMBEDDING + gdb attached"
# configure_ddb 0
# build_and_run "DDB_DISABLE" 1 1

popd
