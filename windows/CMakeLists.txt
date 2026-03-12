# CMakeLists.txt --- CMake project settings
##############################################################################

# CMake minimum version
cmake_minimum_required(VERSION 3.10)

# project name and languages
project(PaperCalc CXX RC)

# PaperCalc.exe
add_executable(PaperCalc WIN32 PaperCalc.cpp PaperCalc_res.rc)
target_link_libraries(PaperCalc comctl32 shlwapi)
