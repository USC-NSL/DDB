#/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

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
