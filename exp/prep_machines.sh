#!/bin/bash

COMMAND="ln -sf /proj/flashburst-PG0/code/distributed-debugger ~/ddb"

DDB_PATH="$HOME/ddb"

COMMAND="cd $DDB_PATH; ./scripts/setup_machine.sh"

# Loop through the IP range 10.10.1.1 to 10.10.1.11
for i in {1..11}; do
  SERVER="10.10.1.$i"
  echo "$(whoami) exec cmd on $SERVER: $COMMAND"

  # Execute the command on the remote server
  ssh $(whoami)@$SERVER "$COMMAND" &
done

# Wait for all background SSH tasks to complete
wait

echo "Command execution completed on all servers."
