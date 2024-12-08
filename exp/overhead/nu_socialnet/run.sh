#/bin/bash

CURR_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

source "$CURR_DIR/../../shared.sh"

LOG_DIR="$LOG_DIR/overhead/nu_socialnet"
mkdir -p $LOG_DIR

function build_and_run() {
  local PREFIX_TEXT=$1
  local GDB_ATTACH=$2

  make clean
  make -j$(nproc)

  # pushd exp/social_net/nu_multi/
  # ./run.sh $PREFIX_TEXT $GDB_ATTACH
  #
  # # link_all_files "logs" "$LOG_DIR"
  # cp logs/* $LOG_DIR/
  # popd
}

SOCIALNET_DIR="$NU_DIR/app/socialNetwork/single_proclet"

pushd $NU_DIR

# Run test with DDB embedding disabled
# sed "s/CONFIG_DDB=.*/CONFIG_DDB=n/g" -i build/config
# sed "s/add_compile_definitions(DDB_SUPPORT.*/add_compile_definitions(DDB_SUPPORT_DISABLE)/g" -i $SOCIALNET_DIR/src/CMakeLists.txt
# sed "s/add_compile_definitions(DDB_SUPPORT.*/add_compile_definitions(DDB_SUPPORT_DISABLE)/g" -i $SOCIALNET_DIR/bench/CMakeLists.txt
# build_and_run "DDB_DISABLE" 0

# Run test with DDB embedding disabled + gdb attached
# echo "Running NO DDB EMBEDDING + gdb attached"
# sed "s/CONFIG_DDB=.*/CONFIG_DDB=n/g" -i build/config
# sed "s/add_compile_definitions(DDB_SUPPORT.*/add_compile_definitions(DDB_SUPPORT_DISABLE)/g" -i $SOCIALNET_DIR/src/CMakeLists.txt
# sed "s/add_compile_definitions(DDB_SUPPORT.*/add_compile_definitions(DDB_SUPPORT_DISABLE)/g" -i $SOCIALNET_DIR/bench/CMakeLists.txt
# build_and_run "DDB_DISABLE" 1

# Run test with DDB embedding enabled
sed "s/CONFIG_DDB=.*/CONFIG_DDB=y/g" -i build/config
sed "s/add_compile_definitions(DDB_SUPPORT.*/add_compile_definitions(DDB_SUPPORT)/g" -i $SOCIALNET_DIR/src/CMakeLists.txt
sed "s/add_compile_definitions(DDB_SUPPORT.*/add_compile_definitions(DDB_SUPPORT)/g" -i $SOCIALNET_DIR/bench/CMakeLists.txt
build_and_run "DDB_ENABLE" 0

popd
