#/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

CLUSTER_IP_LOWER=1  # inclusive lower bound for ips
CLUSTER_IP_UPPER=12 # inclusive upper bound for ips
CLUSTER_IP_PREFIX="10.10.2."

DDB_DIR="$SCRIPT_DIR/../ddb"
DDB_CONF="$DDB_DIR/configs"
SERVICE_DISCOVERY_CONFIG_DIR="/tmp/ddb/service_discovery/"

PROJ_SCRIPT_DIR="$SCRIPT_DIR/../scripts"

FW_DIR="$SCRIPT_DIR/../rpc_frameworks"
LOG_DIR="$SCRIPT_DIR/logs"

mkdir -p $LOG_DIR

NU_DIR="$FW_DIR/Nu"
GRPC_DIR="$FW_DIR/grpc"

# Function to soft link all files from source to destination
link_all_files() {
  local source_dir="$1" # Source directory
  local target_dir="$2" # Target directory

  # Check if both arguments are provided
  if [[ -z "$source_dir" || -z "$target_dir" ]]; then
    echo "Usage: link_all_files <source_dir> <target_dir>"
    return 1
  fi

  # Ensure source directory exists
  if [[ ! -d "$source_dir" ]]; then
    echo "Error: Source directory does not exist: $source_dir"
    return 1
  fi

  # Create the target directory if it does not exist
  if [[ ! -d "$target_dir" ]]; then
    mkdir -p "$target_dir"
    echo "Created target directory: $target_dir"
  fi

  # Iterate over all files in the source directory
  for file in "$source_dir"/*; do
    if [[ -f "$file" ]]; then
      ln -sf "$file" "$target_dir"
      echo "Linked: $file -> $target_dir/$(basename "$file")"
    fi
  done

  echo "All files from $source_dir have been linked to $target_dir."
}

function svr_ip() {
  echo $CLUSTER_IP_PREFIX$1
}

function bcast_cmds() {
  local CMD=$1
  for svr_idx in $(seq $CLUSTER_IP_LOWER $CLUSTER_IP_UPPER); do
    ssh $(svr_ip $svr_idx) "$CMD" &
  done
  wait
}

function batch_transfer() {
  local SRC=$1
  local EST=$2
  for svr_idx in $(seq $CLUSTER_IP_LOWER $CLUSTER_IP_UPPER); do
    scp -r $SRC $(svr_ip $svr_idx):$EST
  done
}

function prep_gdb() {
  bcast_cmds "$PROJ_SCRIPT_DIR/setup_gdb.sh"
}

function prep_mosquitto() {
  bcast_cmds "$PROJ_SCRIPT_DIR/prepare.sh"
}

function prep_folder() {
  bcast_cmds "mkdir -p $SERVICE_DISCOVERY_CONFIG_DIR"
}

prep_folder
prep_gdb
# prep_mosquitto
