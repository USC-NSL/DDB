CXX = g++
CXXFLAGS = -Wall -O1 -g
LDFLAGS =  -lpaho-mqtt3c -lpthread 

LIBFAKETIME_DIR = ../libfaketime
LIBFAKETIME_FLAGS = FAKETIME_NO_CACHE=1 FAKETIME="-00000000000000000"

LOG_DIR = ./logs

# Build directory
BUILD_DIR = ./build

# Source directory
SRC_DIR = ./src

all: $(BUILD_DIR)/faketime_pause

# Find all C or C++ files in the src directory
SOURCES = $(wildcard $(SRC_DIR)/*.cpp)
# Convert the *.c filenames to *.o to determine the object file names
OBJECTS = $(patsubst $(SRC_DIR)/%.cpp, $(BUILD_DIR)/%.o, $(SOURCES))

$(BUILD_DIR)/faketime_pause: $(BUILD_DIR)/faketime_pause.o $(BUILD_DIR)/real_timer.o $(BUILD_DIR)/cycle_counter.o 
	$(CXX) $(CXXFLAGS) -Iinc -o $@ $^ $(LDFLAGS)

# Compile each source file to an object file
$(BUILD_DIR)/%.o: $(SRC_DIR)/%.cpp
	@mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) -Iinc -c $< -o $@

.PHONY: compile_libfaketime
compile_libfaketime:
	$(MAKE) -C $(LIBFAKETIME_DIR)

.PHONY: run_faketime_pause compile_libfaketime
run_faketime_pause: $(BUILD_DIR)/faketime_pause
	LD_PRELOAD=$(LIBFAKETIME_DIR)/src/libfaketime.so.1 $(LIBFAKETIME_FLAGS) ./$(BUILD_DIR)/faketime_pause > $(LOG_DIR)/faketime_pause.log 2>&1

.PHONY: clean
clean:
	rm -f faketime_pause $(BUILD_DIR)/*